// Consumer-side audit only. Contract consensus remains the authority for exceptions.
export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${canonical(k)}:${canonical(value[k])}`).join(",")}}`;
  if (!(value === null || typeof value === "string" || typeof value === "boolean" || Number.isSafeInteger(value))) throw Error("Unsupported canonical value");
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}
export async function hash(value: any) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)))), b => b.toString(16).padStart(2, "0")).join("");
}
function check(ok: unknown, message: string): asserts ok { if (!ok) throw Error(message); }
const integer = (v: any, low: number, high: number) => Number.isSafeInteger(v) && v >= low && v <= high;
const hex = (v: any) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
const fields = (v: any, names: string[]) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).sort().join(",") === names.sort().join(",");
export function measure(policy: any, evidence: any) {
  check(policy && evidence && Array.isArray(evidence.readings), "Policy and readings required");
  check(fields(policy, ["name","start","end","min_mc","max_mc","hard_min_mc","hard_max_mc","max_excursion_s","max_total_s","max_gap_s","exception_clause"]), "Invalid policy schema");
  check(fields(evidence, ["source","readings","incident"]), "Invalid evidence schema");
  check(typeof policy.name === "string" && [...policy.name].length > 0 && [...policy.name].length <= 120 && typeof policy.exception_clause === "string" && [...policy.exception_clause].length <= 2000, "Invalid policy text");
  check(typeof evidence.source === "string" && [...evidence.source].length > 0 && [...evidence.source].length <= 500 && typeof evidence.incident === "string" && [...evidence.incident].length <= 4000, "Invalid evidence text");
  check(integer(policy.start, 0, 4102444800) && integer(policy.end, policy.start + 1, 4102444800) && policy.end - policy.start <= 2678400, "Invalid policy window");
  for (const key of ["min_mc", "max_mc", "hard_min_mc", "hard_max_mc"]) check(integer(policy[key], -100000, 100000), "Invalid temperature limits");
  check(policy.hard_min_mc <= policy.min_mc && policy.min_mc < policy.max_mc && policy.max_mc <= policy.hard_max_mc, "Invalid policy limits");
  check(integer(policy.max_gap_s, 1, 86400) && integer(policy.max_excursion_s, 0, 86400) && integer(policy.max_total_s, 0, 2678400), "Invalid duration limits");
  const rows = evidence.readings;
  check(rows.length >= 2 && rows.length <= 192, "2–192 readings required");
  let last = -1;
  for (const row of rows) {
    check(Array.isArray(row) && row.length === 2 && integer(row[0], policy.start, policy.end) && integer(row[1], -100000, 100000) && row[0] > last, "Invalid ordered reading");
    last = row[0];
  }
  let gap = rows[0][0] !== policy.start || rows.at(-1)[0] !== policy.end;
  let total = 0, longest = 0, run = 0, count = 0, hard = false;
  const excursions: {start: number; end: number; duration_s: number}[] = [];
  for (let i = 0; i < rows.length; i++) {
    const [t, temp] = rows[i];
    hard ||= temp < policy.hard_min_mc || temp > policy.hard_max_mc;
    if (i === rows.length - 1) break;
    const dt = rows[i + 1][0] - t;
    gap ||= dt > policy.max_gap_s;
    if (temp < policy.min_mc || temp > policy.max_mc) {
      if (!run) { count++; excursions.push({start:t, end:t, duration_s:0}); }
      total += dt; run += dt; longest = Math.max(longest, run);
      Object.assign(excursions.at(-1)!, {end: rows[i + 1][0], duration_s:run});
    } else run = 0;
  }
  const status = hard ? "NON_COMPLIANT" : gap ? "INCONCLUSIVE" : total > policy.max_total_s || longest > policy.max_excursion_s ? "EXCEPTION_REVIEW" : "COMPLIANT";
  return {status, total_excursion_s:total, longest_excursion_s:longest, hard_breach:hard, coverage_gap:gap, excursion_count:count, min_observed_mc:Math.min(...rows.map((r: number[]) => r[1])), max_observed_mc:Math.max(...rows.map((r: number[]) => r[1])), excursions};
}
export async function verifyHistory(record: any, receipts: any[], shipment?: string) {
  check(integer(record?.sequence, 1, 6) && Array.isArray(receipts) && receipts.length === record.sequence, "Receipt count mismatch");
  let previous = "0".repeat(64);
  const identity = shipment ?? receipts[0]?.shipment;
  check(typeof identity === "string" && identity.length > 0 && identity.length <= 64, "Shipment identity required");
  for (let i = 0; i < receipts.length; i++) {
    const {hash:claimed, ...body} = receipts[i];
    check(body.shipment === identity && body.sequence === i + 1 && body.previous === previous && hex(claimed) && await hash(body) === claimed, "Receipt integrity or shipment mismatch");
    previous = claimed;
  }
  check(previous === record.head, "Record head mismatch");
  check(await hash({...record, sequence:record.sequence - 1, head:receipts.at(-1).previous}) === receipts.at(-1).state, "State hash mismatch");
  check(await hash(record.policy) === record.policy_hash, "Policy commitment mismatch");
  if (record.evidence) check(await hash(record.evidence) === record.evidence_hash, "Evidence commitment mismatch");
  return true;
}
export type Bundle = {contract: string; chainId: number; shipment: string; record: any; receipts: any[]};
export async function auditBundle(bundle: Bundle, contract: string) {
  check(bundle?.contract?.toLowerCase() === contract.toLowerCase() && bundle.chainId === 61999, "Contract or network mismatch");
  await verifyHistory(bundle.record, bundle.receipts, bundle.shipment);
  const r = bundle.record;
  check(r.evidence, "Submitted evidence required for comparison");
  const metrics = measure(r.policy, r.evidence);
  const {excursions, status, ...numeric} = metrics;
  const assessments = bundle.receipts.filter(t => t.action === "ASSESS");
  for (const receipt of assessments) {
    check(receipt.policy_hash === r.policy_hash && receipt.evidence_hash === r.evidence_hash, "Assessment commitment mismatch");
    check(receipt.result && ["COMPLIANT", "NON_COMPLIANT", "INCONCLUSIVE"].includes(receipt.result.status), "Invalid assessment");
    for (const [key, value] of Object.entries(numeric)) check(receipt.result[key] === value, "Assessment metric mismatch");
    if (status !== "EXCEPTION_REVIEW") check(receipt.result.status === status, "Deterministic verdict mismatch");
    if (status === "EXCEPTION_REVIEW" && receipt.result.status === "COMPLIANT") {
      check(typeof receipt.result.policy_quote === "string" && receipt.result.policy_quote.length > 0 && r.policy.exception_clause.includes(receipt.result.policy_quote), "Ungrounded policy quotation");
      check(typeof receipt.result.incident_quote === "string" && receipt.result.incident_quote.length > 0 && r.evidence.incident.includes(receipt.result.incident_quote), "Ungrounded incident quotation");
    }
  }
  if (assessments.length) check(await hash(assessments.at(-1).result) === await hash(r.result), "Latest assessment mismatch");
  else check(r.result === null, "Unexpected assessment");
  return {shipment:bundle.shipment, head:r.head, phase:r.phase, policy_hash:r.policy_hash, evidence_hash:r.evidence_hash, metrics, assessments:assessments.map(t => ({round:t.round, sequence:t.sequence, ...t.result})), challenge:r.challenge};
}
export async function compareBundles(left: Bundle, right: Bundle, contract: string) {
  const [a, b] = await Promise.all([auditBundle(left, contract), auditBundle(right, contract)]);
  return {schema:"coldchain-comparison/v1", contract, chainId:61999, sameShipment:left.shipment === right.shipment, samePolicy:a.policy_hash === b.policy_hash, sameEvidence:a.evidence_hash === b.evidence_hash, left:a, right:b,
    delta:{total_excursion_s:b.metrics.total_excursion_s-a.metrics.total_excursion_s, longest_excursion_s:b.metrics.longest_excursion_s-a.metrics.longest_excursion_s, max_observed_mc:b.metrics.max_observed_mc-a.metrics.max_observed_mc, excursion_count:b.metrics.excursion_count-a.metrics.excursion_count}};
}
