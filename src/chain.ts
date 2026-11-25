import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import config from "./config.json";
export const reader = createClient({ chain: studionet });
export const address = config.address as `0x${string}`;
export function requireDeployment() {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    throw new Error("Contract deployment is not configured.");
}
export async function readShipment(id: string) {
  requireDeployment();
  return JSON.parse(
    String(
      await reader.readContract({
        address,
        functionName: "get_shipment",
        args: [id],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
      }),
    ),
  );
}
export async function connect() {
  const provider = (window as any).ethereum;
  if (!provider)
    throw new Error(
      "No browser wallet found. Open GenLayer Studio to use its inbuilt wallet, or install MetaMask.",
    );
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xf22f" }],
    });
  } catch (e: any) {
    if (e.code !== 4902) throw e;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0xf22f",
          chainName: "GenLayer Studionet",
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: [config.rpc],
        },
      ],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xf22f" }],
    });
  }
  if (Number(await provider.request({ method: "eth_chainId" })) !== 61999)
    throw new Error("Select GenLayer Studionet and reconnect.");
  if (
    !Array.isArray(accounts) ||
    !/^0x[0-9a-fA-F]{40}$/.test(accounts[0] || "")
  )
    throw new Error("Wallet did not provide an account.");
  return {
    client: createClient({ chain: studionet, provider, account: accounts[0] }),
    account: String(accounts[0]),
  };
}
export async function fetchReceipts(id: string, count: number) {
  const out = [];
  for (let n = 1; n <= count; n++)
    out.push(
      JSON.parse(
        String(
          await reader.readContract({
            address,
            functionName: "get_receipt",
            args: [id, n],
            transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
          }),
        ),
      ),
    );
  return out;
}
function sort(v: any): any {
  return Array.isArray(v)
    ? v.map(sort)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sort(v[k])]),
        )
      : v;
}
export async function hash(v: unknown) {
  const raw = JSON.stringify(sort(v)).replace(
    /[\u007f-\uffff]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function verifyHistory(record: any, receipts: any[]) {
  if (receipts.length !== record.sequence)
    throw new Error("Receipt count mismatch");
  let previous = "0".repeat(64);
  for (let i = 0; i < receipts.length; i++) {
    const { hash: claimed, ...body } = receipts[i];
    if (
      body.sequence !== i + 1 ||
      body.previous !== previous ||
      (await hash(body)) !== claimed
    )
      throw new Error("Receipt integrity mismatch");
    previous = claimed;
  }
  if (previous !== record.head) throw new Error("Record head mismatch");
  if (
    (await hash({
      ...record,
      sequence: record.sequence - 1,
      head: receipts.at(-1).previous,
    })) !== receipts.at(-1).state
  )
    throw new Error("State hash mismatch");
  return true;
}
