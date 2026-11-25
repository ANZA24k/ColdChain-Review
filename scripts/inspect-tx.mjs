import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "node:fs";
const c = createClient({ chain: studionet });
const tx = await c.getTransaction({ hash: process.argv[2] });
console.log(
  JSON.stringify(tx, (_, v) => (typeof v === "bigint" ? String(v) : v), 2),
);
