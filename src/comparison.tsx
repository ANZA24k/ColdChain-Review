import { useState } from "react";
import { address, readShipment, fetchReceipts } from "./chain";
import { compareBundles, hash } from "./audit";
import type { Bundle } from "./audit";

export function Comparison() {
  const [ids, setIds] = useState(["CCR-LIVE-001", "CCR-LIVE-001"]);
  const [files, setFiles] = useState<(Bundle | null)[]>([null, null]);
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const invalidate = () => { setReport(null); setMessage(""); };
  async function importFile(file: File | undefined, slot: number) {
    invalidate();
    setFiles(old => old.map((v, i) => i === slot ? null : v));
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 256000) throw Error("Export exceeds 256 KB limit");
      const data = JSON.parse(await file.text());
      if (!data.record || !Array.isArray(data.receipts)) throw Error("Select an exported shipment record");
      setFiles(old => old.map((v, i) => i === slot ? data : v));
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  async function loadBundle(shipment: string): Promise<Bundle> {
    if (!shipment || [...shipment].length > 64) throw Error("Enter a shipment ID of 1–64 characters");
    const record = await readShipment(shipment);
    if (!Number.isSafeInteger(record.sequence) || record.sequence < 1 || record.sequence > 6) throw Error("Invalid receipt count");
    const receipts = await fetchReceipts(shipment, record.sequence);
    const latest = await readShipment(shipment);
    if (latest.head !== record.head || latest.sequence !== record.sequence) throw Error("Shipment changed during retrieval. Compare again.");
    return {contract:address, chainId:61999, shipment, record, receipts};
  }
  async function compare() {
    setBusy(true); invalidate();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (async () => {
          const pending = new Map<string, Promise<Bundle>>();
          const bundles = await Promise.all(ids.map((id, i) => {
            if (files[i]) return files[i]!;
            if (!pending.has(id)) pending.set(id, loadBundle(id));
            return pending.get(id)!;
          }));
          const comparison = await compareBundles(bundles[0], bundles[1], address);
          const payload = {...comparison, observedAt:new Date().toISOString(), sources:files.map(f => f ? "OFFLINE_INTEGRITY_ONLY" : "FINALIZED_RPC_READ"), bundles};
          return {payload, sha256:await hash(payload)};
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("Comparison timed out. Try again.")), 45000); }),
      ]);
      setReport(result); setMessage("Both receipt chains, commitments, and deterministic metrics verified.");
    } catch (e: any) { setReport(null); setMessage(e.message || "Comparison failed"); }
    finally { clearTimeout(timer); setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type:"application/json"}));
    const a = document.createElement("a"); a.href = url; a.download = "coldchain-comparison.json"; a.click(); URL.revokeObjectURL(url);
  }
  const p = report?.payload;
  return <section className="card comparison">
    <h2>Compare shipment evidence</h2>
    <p>Compare two shipments, or inspect the same shipment’s assessment rounds. Records must contain submitted evidence. No wallet required.</p>
    <div className="form-grid">
      {[0, 1].map(i => <fieldset disabled={busy} key={i}>
        <legend>{i === 0 ? "Baseline" : "Candidate"}</legend>
        <label>Shipment ID<input value={ids[i]} maxLength={64} disabled={!!files[i]} onChange={e => { invalidate(); setIds(old => old.map((v, n) => n === i ? e.target.value : v)); }} /></label>
        <label>Or import exported record<input aria-label={i === 0 ? "Baseline file" : "Candidate file"} type="file" accept=".json,application/json" onChange={e => void importFile(e.target.files?.[0], i)} /></label>
        {files[i] && <p>Offline file: {files[i]!.shipment}. Integrity only; current chain state is not authenticated.</p>}
        <button className="secondary" onClick={() => { invalidate(); setFiles(old => old.map((v, n) => n === i ? null : v)); }}>Use live finalized reads</button>
      </fieldset>)}
    </div>
    <div className="buttons"><button disabled={busy} className="primary" onClick={() => void compare()}>{busy ? "Verifying…" : "Verify and compare"}</button><button className="secondary" disabled={!report || busy} onClick={download}>Export comparison report</button></div>
    {message && <p role="status">{message}</p>}
    {p && <>
      <p className="notice">{p.sameShipment ? "Same shipment selected: this is an identity comparison, not independent shipment evidence. " : "Two shipment records compared. "}{p.samePolicy ? "Exact policy match. " : "Different policies: numerical deltas do not establish improved compliance. "}{p.sameEvidence ? "Evidence commitments match." : "Evidence commitments differ."}</p>
      <div className="comparison-scroll"><table>
        <caption>Candidate minus baseline; temperature values use milli-Celsius and durations use seconds.</caption>
        <thead><tr><th>Measurement</th><th>Baseline</th><th>Candidate</th><th>Delta</th></tr></thead>
        <tbody>{Object.keys(p.delta).map(key => <tr key={key}><th>{key.replaceAll("_", " ")}</th><td>{p.left.metrics[key]}</td><td>{p.right.metrics[key]}</td><td>{p.delta[key]}</td></tr>)}</tbody>
      </table></div>
      <div className="form-grid">{[p.left, p.right].map((side, i) => <div key={i}>
        <h3>{i === 0 ? "Baseline" : "Candidate"}: {side.shipment}</h3>
        <p>{p.sources[i] === "FINALIZED_RPC_READ" ? "Live finalized record" : "Imported file · integrity only"} · {side.phase}</p>
        <p>Measured rule outcome: <strong>{side.metrics.status}</strong></p>
        <p>Hard breach: {String(side.metrics.hard_breach)} · Coverage gap: {String(side.metrics.coverage_gap)}</p>
        <p className="helper">The measured rule outcome does not interpret exceptions. Assessment verdicts below come from the recorded contract decisions.</p>
        <h3>Excursion intervals</h3>
        {side.metrics.excursions.length ? <ul>{side.metrics.excursions.map((x: any) => <li key={x.start}>{new Date(x.start * 1000).toISOString()} → {new Date(x.end * 1000).toISOString()} · {x.duration_s} s</li>)}</ul> : <p>No measured excursion intervals.</p>}
        <h3>Assessment history</h3>
        {!side.assessments.length && <p>Not assessed; no consensus verdict.</p>}
        {side.assessments.map((a: any) => <div className="receipt" key={a.sequence}><div><strong>Round {a.round}: {a.status}</strong><p>{a.reason}</p>{a.policy_quote && <blockquote>Policy: {a.policy_quote}</blockquote>}{a.incident_quote && <blockquote>Incident: {a.incident_quote}</blockquote>}</div></div>)}
        {side.assessments.length > 1 && <p>Verdict {side.assessments[0].status === side.assessments.at(-1).status ? "unchanged" : "changed"} after reassessment. Rationale {side.assessments[0].reason === side.assessments.at(-1).reason ? "unchanged" : "changed"}.</p>}
        {side.challenge && <p>Challenge: {side.challenge}</p>}
        <details><summary>Commitments</summary><p>Policy: <code>{side.policy_hash}</code></p><p>Evidence: <code>{side.evidence_hash}</code></p><p>Receipt head: <code>{side.head}</code></p></details>
      </div>)}</div>
      <p className="helper">SHA-256: <code>{report.sha256}</code>. Hashes check internal integrity; files can be fabricated or stale. Live reads trust Studionet RPC. Comparison does not authenticate sensors or authorize product release.</p>
    </>}
  </section>;
}
