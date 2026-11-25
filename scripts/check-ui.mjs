import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
for (const width of [390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
  await page
    .getByRole("heading", { name: "Every excursion. A clear record." })
    .waitFor();
  for (const name of [
    "Shipment workspace",
    "Receipt ledger",
    "How it works",
    "Overview",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error(`Overflow ${width} ${name}`);
    results.push(`${width}: ${name} fits`);
  }
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("status")
    .getByText(/No browser wallet found/)
    .waitFor();
  results.push(`${width}: absent wallet handled`);
  if (errors.length) throw Error(errors.join("\n"));
  await page.close();
}
await browser.close();
console.log(results.join("\n"));
