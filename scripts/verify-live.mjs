import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import fs from "node:fs";
import crypto from "node:crypto";
const config = JSON.parse(fs.readFileSync("src/config.json"));
const c = createClient({ chain: studionet });
const sorted = (v) =>
  Array.isArray(v)
    ? v.map(sorted)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sorted(v[k])]),
        )
      : v;
const hash = (v) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify(sorted(v)).replace(
        /[\u007f-\uffff]/g,
        (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
      ),
    )
    .digest("hex");
const code = await c.getContractCode(config.address);
if (code !== fs.readFileSync("contracts/coldchain_review.py", "utf8"))
  throw Error("Deployed source mismatch");
const id = process.argv[2] || "CCR-LIVE-001";
const read = (fn, args) =>
  c.readContract({
    address: config.address,
    functionName: fn,
    args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
const r = JSON.parse(await read("get_shipment", [id]));
const receipts = [];
let previous = "0".repeat(64);
for (let n = 1; n <= r.sequence; n++) {
  const t = JSON.parse(await read("get_receipt", [id, n]));
  const { hash: claimed, ...body } = t;
  if (
    body.previous !== previous ||
    body.sequence !== n ||
    hash(body) !== claimed
  )
    throw Error("Receipt mismatch");
  previous = claimed;
  receipts.push(t);
}
if (
  previous !== r.head ||
  hash({ ...r, sequence: r.sequence - 1, head: receipts.at(-1).previous }) !==
    receipts.at(-1).state
)
  throw Error("State mismatch");
if (hash(r.policy) !== r.policy_hash || hash(r.evidence) !== r.evidence_hash)
  throw Error("Evidence mismatch");
const out = {
  verified: true,
  address: config.address,
  source_sha256: crypto.createHash("sha256").update(code).digest("hex"),
  shipment: id,
  phase: r.phase,
  round: r.round,
  verdict: r.result?.status || null,
  receipts: receipts.length,
};
fs.writeFileSync(
  "docs/source-and-chain-verification.json",
  JSON.stringify(out, null, 2) + "\n",
);
fs.writeFileSync(
  "docs/live-record.json",
  JSON.stringify({ record: r, receipts }, null, 2) + "\n",
);
console.log(out);
