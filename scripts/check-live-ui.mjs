import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.route("https://studio.genlayer.com/api", async (route) => {
  try {
    const req = route.request();
    const response = await fetch(req.url(), {
      method: req.method(),
      headers: { "content-type": "application/json" },
      body: req.postData(),
    });
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  } catch (e) {
    console.log("Live RPC bridge failed:", e.message);
    await route.abort();
  }
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  console.log("Request failed:", r.url(), r.failure()?.errorText),
);
page.on("console", (m) => {
  if (m.type() === "error") console.log("Console:", m.text().slice(0, 400));
});
await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Shipment workspace", exact: true })
  .click();
await page
  .getByRole("button", { name: "Load on-chain record", exact: true })
  .click();
await page.locator(".record-summary").waitFor({ timeout: 120000 });
console.log(
  "Live finalized contract read and current state verification passed",
);
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Receipt ledger", exact: true })
  .click();
await page.getByText("Hash chain verified", { exact: true }).waitFor();
const count = await page.locator(".receipt").count();
if (count < 3) throw Error("Expected at least three real receipts");
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Export record", exact: true }).click();
const file = await download;
if (file.suggestedFilename() !== "CCR-LIVE-001-receipt.json")
  throw Error("Wrong export");
const payload = JSON.parse(await fs.readFile(await file.path(), "utf8"));
if (
  process.env.EXPECT_ROUND &&
  payload.record.round !== Number(process.env.EXPECT_ROUND)
)
  throw Error("Unexpected assessment round");
if (
  process.env.EXPECT_ROUND === "2" &&
  (payload.record.phase !== "REVIEWED" || payload.receipts.length !== 6)
)
  throw Error("Full lifecycle not present");
console.log(
  `${count} real receipts verified; JSON export passed; round ${payload.record.round}, verdict ${payload.record.result?.status}`,
);
if (errors.length) throw Error(errors.join("\n"));
await page.close();
const walletPage = await browser.newPage();
await walletPage.addInitScript(() => {
  window.walletCalls = [];
  window.ethereum = {
    request: async (request) => {
      window.walletCalls.push(request.method);
      if (request.method === "eth_requestAccounts")
        return ["0x1111111111111111111111111111111111111111"];
      if (request.method === "eth_chainId") return "0xf22f";
      return null;
    },
    on() {},
    removeListener() {},
  };
});
await walletPage.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
await walletPage
  .getByRole("button", { name: "Connect wallet", exact: true })
  .click();
await walletPage
  .getByRole("status")
  .getByText("Wallet connected to Studionet.")
  .waitFor();
const calls = await walletPage.evaluate(() => window.walletCalls);
if (
  !calls.includes("eth_requestAccounts") ||
  !calls.includes("wallet_switchEthereumChain") ||
  !calls.includes("eth_chainId")
)
  throw Error("Wallet provider flow incomplete");
console.log(
  "EIP-1193 provider connection/network checks passed (test provider; no signature or funds)",
);
await walletPage.close();
await browser.close();
