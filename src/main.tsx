import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Snowflake,
  ShieldCheck,
  Package,
  Activity,
  FileCheck2,
  ExternalLink,
  Wallet,
  Search,
  Download,
  Check,
  AlertCircle,
  BookOpen,
  ArrowUpRight,
  Thermometer,
  ChevronRight,
} from "lucide-react";
import {
  connect,
  readShipment,
  fetchReceipts,
  address,
  requireDeployment,
  verifyHistory,
  reader,
} from "./chain";
import { policy, evidence, compliantEvidence } from "./fixtures";
import config from "./config.json";
import "./style.css";
import { Comparison } from "./comparison";
function App() {
  const [tab, setTab] = useState("Overview"),
    [id, setId] = useState("CCR-LIVE-001"),
    [record, setRecord] = useState<any>(null),
    [wallet, setWallet] = useState<any>(null),
    [counterparty, setCounterparty] = useState(""),
    [p, setP] = useState(JSON.stringify(policy, null, 2)),
    [e, setE] = useState(JSON.stringify(evidence, null, 2)),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [tx, setTx] = useState(localStorage.getItem("coldchain-pending-tx") || ""),
    [receipts, setReceipts] = useState<any[]>([]),
    [example, setExample] = useState(true);
  useEffect(() => {
    const p = (window as any).ethereum;
    if (!p?.on) return;
    const reset = () => {
      setWallet(null);
      setStatus(
        "Wallet account or network changed. Reconnect before submitting.",
      );
    };
    p.on("accountsChanged", reset);
    p.on("chainChanged", reset);
    return () => {
      p.removeListener?.("accountsChanged", reset);
      p.removeListener?.("chainChanged", reset);
    };
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try {
      await fn();
    } catch (err: any) {
      const message = err.shortMessage || err.message || String(err);
      setStatus(
        /unknown RPC|HTTP request failed|fetch failed|Failed to fetch|Unexpected token/i.test(
          message,
        )
          ? "Could not complete the GenLayer request. Try again shortly. If a transaction was submitted, check its status before sending another."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    setStatus(
      "Loading the finalized record and verifying its receipt history…",
    );
    const r = await readShipment(id);
    const h = await fetchReceipts(id, r.sequence);
    await verifyHistory(r, h, id);
    setRecord(r);
    setExample(false);
    setReceipts(h);
    setStatus("Finalized record loaded. Receipt history verified.");
  }
  async function write(name: string, args: any[]) {
    requireDeployment();
    if (!wallet) throw new Error("Connect a wallet before submitting.");
    setStatus("Awaiting wallet approval…");
    const h = await wallet.client.writeContract({
      address,
      functionName: name,
      args,
    });
    setTx(h);
    localStorage.setItem("coldchain-pending-tx", h);
    setStatus("Submitted. Waiting for consensus…");
    const receipt = await wallet.client.waitForTransactionReceipt({
      hash: h,
      waitUntil: "finalized",
      interval: 4000,
      retries: 60,
    });
    if (
      receipt.txExecutionResultName !== "FINISHED_WITH_RETURN" ||
      receipt.lifecycle?.outcome !== "accepted"
    )
      throw new Error(
        "Transaction failed or consensus was undetermined. Inspect it in Studio.",
      );
    localStorage.removeItem("coldchain-pending-tx");
    setStatus("Finalized. Refreshing contract state…");
    await load();
    setStatus("Transaction finalized; contract state refreshed.");
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            network: config.network,
            chainId: config.chainId,
            contract: address,
            shipment: id,
            record,
            receipts,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${id}-receipt.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const displayRows = evidence.readings;
  const chart = displayRows
    .map(
      (r: number[], i: number) =>
        `${40 + i * (640 / (displayRows.length - 1))},${200 - r[1] / 65}`,
    )
    .join(" ");
  return (
    <div className="shell">
      <aside>
        <a href="#" className="brand">
          <span className="brand-icon">
            <Snowflake size={23} />
          </span>
          <span>
            ColdChain<span className="brand-light">Review</span>
          </span>
        </a>
        <div className="workspace-label">SHIPMENT ASSURANCE</div>
        <nav>
          {[
            ["Overview", Activity],
            ["Shipment workspace", Package],
            ["Receipt ledger", FileCheck2],
            ["Shipment comparison", Activity],
            ["How it works", BookOpen],
          ].map(([label, Icon]: any) => (
            <button
              key={label}
              className={tab === label ? "active" : ""}
              onClick={() => setTab(label)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-tag">
            <span />
            GenLayer Studionet
          </div>
          <p>
            Evidence you can trace.
            <br />
            Decisions you can review.
          </p>
          <a
            href="https://github.com/ANZA24k/ColdChain-Review"
            target="_blank"
            rel="noreferrer"
          >
            View source <ExternalLink size={14} />
          </a>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{tab}</strong>
          </div>
          <div className="header-actions">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
            >
              Open Studio <ExternalLink size={14} />
            </a>
            <button
              className="wallet"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const w = await connect();
                  setWallet(w);
                  setCounterparty(w.account);
                  setStatus("Wallet connected to Studionet.");
                })
              }
            >
              <Wallet size={16} />
              {wallet
                ? wallet.account.slice(0, 6) + "…" + wallet.account.slice(-4)
                : "Connect wallet"}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">COLD CHAIN INTELLIGENCE</div>
              <h1>
                {tab === "Overview" ? "Every excursion. A clear record." : tab}
              </h1>
              <p>
                Verify agreed handling requirements with evidence-grounded,
                on-chain reviews.
              </p>
            </div>
            <button
              className="primary"
              onClick={() => setTab("Shipment workspace")}
            >
              <Package size={17} /> Review a shipment
            </button>
          </div>
          <div className="notice">
            <AlertCircle size={18} />
            <span>
              <strong>Contract deployed on Studionet.</strong> Public reads are
              available. Use a browser wallet for transactions, or Studio’s
              inbuilt wallet.{" "}
              <a href={config.explorer} target="_blank" rel="noreferrer">
                View contract
              </a>
            </span>
          </div>
          {status && (
            <div role="status" className="status">
              {busy && <span className="spinner" />}
              {status}
              {tx && (
                <a
                  href="https://studio.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect transaction in Studio
                </a>
              )}
            </div>
          )}
          {tab === "Overview" && (
            <>
              <div className="stats">
                <Stat
                  icon={<Package />}
                  label="Review scope"
                  value="Shipment handling"
                  sub="Against an immutable agreement"
                />
                <Stat
                  icon={<Thermometer />}
                  label="Measurement precision"
                  value="0.001 °C"
                  sub="Integer-based temperature checks"
                />
                <Stat
                  icon={<ShieldCheck />}
                  label="Decision integrity"
                  value="Consensus backed"
                  sub="Independent exception interpretation"
                />
              </div>
              <section className="review-card">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">SHIPMENT SPOTLIGHT</span>
                    <h2>
                      Colombo to Kandy{" "}
                      <span className="sample">Sample evidence</span>
                    </h2>
                    <p>CCR-001 · Chilled goods · 24 Nov 2026</p>
                  </div>
                  <span className="pill amber">Exception review</span>
                </div>
                <div className="shipment-body">
                  <div className="temperature">
                    <div className="chart-heading">
                      <h3>Temperature journey</h3>
                      <span>
                        <i /> Agreed range: 2–8 °C
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 720 250"
                      role="img"
                      aria-label="Sample shipment temperature plot showing an excursion to 9 degrees Celsius"
                    >
                      <rect
                        x="40"
                        y="77"
                        width="640"
                        height="92"
                        fill="#e8f5ef"
                      />
                      <line
                        x1="40"
                        x2="680"
                        y1="77"
                        y2="77"
                        stroke="#b0d7c1"
                        strokeDasharray="5 5"
                      />
                      <line
                        x1="40"
                        x2="680"
                        y1="169"
                        y2="169"
                        stroke="#b0d7c1"
                        strokeDasharray="5 5"
                      />
                      <text x="5" y="82">
                        8°C
                      </text>
                      <text x="5" y="174">
                        2°C
                      </text>
                      <polyline
                        points={chart}
                        fill="none"
                        stroke="#1e8287"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      {displayRows.map((r: number[], i: number) => (
                        <circle
                          key={i}
                          cx={40 + i * (640 / (displayRows.length - 1))}
                          cy={200 - r[1] / 65}
                          r="4"
                          fill={r[1] > 8000 ? "#d89635" : "#1e8287"}
                        />
                      ))}
                      <text x="40" y="235">
                        00:00 UTC
                      </text>
                      <text x="340" y="235">
                        00:30
                      </text>
                      <text x="645" y="235">
                        01:00
                      </text>
                    </svg>
                    <div className="chart-footer">
                      <span>7 readings · 60 minute window</span>
                      <span>Illustrative data, not a live shipment</span>
                    </div>
                  </div>
                  <div className="review-summary">
                    <h3>What needs a closer look</h3>
                    <div className="excursion-value">
                      10 <span>minutes outside range</span>
                    </div>
                    <p>
                      A documented unloading excursion exceeds the normal
                      5-minute limit. Validators interpret whether the locked
                      exception applies.
                    </p>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setTab("Shipment workspace");
                        setExample(true);
                      }}
                    >
                      Inspect evidence <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="bottom-grid">
                <section className="card">
                  <div className="card-icon">
                    <ShieldCheck />
                  </div>
                  <h2>Rules first. Reasoning where it matters.</h2>
                  <p>
                    Temperature and duration limits are checked
                    deterministically. GenLayer validators independently
                    interpret permitted handling exceptions.
                  </p>
                  <div className="steps">
                    <span>
                      <Check size={15} /> Immutable policies
                    </span>
                    <span>
                      <Check size={15} /> Grounded decisions
                    </span>
                    <span>
                      <Check size={15} /> Hash-linked receipts
                    </span>
                  </div>
                </section>
                <section className="card dark">
                  <Snowflake size={29} />
                  <h2>A review, with clear boundaries.</h2>
                  <p>
                    ColdChainReview assesses supplied handling evidence. It does
                    not authenticate sensors, certify product safety, or replace
                    an authorized release decision.
                  </p>
                  <button onClick={() => setTab("How it works")}>
                    Understand the review process <ExternalLink size={15} />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "Shipment workspace" && (
            <>
              <section className="card">
                <div className="section-title">
                  <div>
                    <h2>Shipment workspace</h2>
                    <p>
                      Register, accept, submit, assess, and challenge a shipment
                      review.
                    </p>
                  </div>
                  <span className="pill">{record?.phase || "Not loaded"}</span>
                </div>
                <div className="form-row">
                  <label>
                    Shipment ID
                    <input
                      value={id}
                      onChange={(v) => {
                        setId(v.target.value);
                        setRecord(null);
                        setReceipts([]);
                      }}
                      maxLength={64}
                    />
                  </label>
                  <label>
                    Counterparty address
                    <input
                      placeholder="0x…"
                      value={counterparty}
                      onChange={(v) => setCounterparty(v.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy}
                    className="secondary"
                    onClick={() => run(load)}
                  >
                    <Search size={16} /> Load on-chain record
                  </button>
                </div>
                <div className="form-grid">
                  <label>
                    Transportation policy (JSON)
                    <textarea
                      spellCheck={false}
                      value={p}
                      onChange={(v) => setP(v.target.value)}
                    />
                  </label>
                  <label>
                    Temperature log and incident (JSON)
                    <textarea
                      spellCheck={false}
                      value={e}
                      onChange={(v) => setE(v.target.value)}
                    />
                  </label>
                </div>
                <div className="buttons">
                  <button
                    className="secondary"
                    onClick={() => {
                      setP(JSON.stringify(policy, null, 2));
                      setE(JSON.stringify(evidence, null, 2));
                      setExample(true);
                    }}
                  >
                    Load exception fixture
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      setE(JSON.stringify(compliantEvidence, null, 2))
                    }
                  >
                    Load in-range fixture
                  </button>
                </div>
                <p className="helper">
                  Readings use [Unix seconds, milli-Celsius]. The prior reading
                  represents the interval until the next reading. All submitted
                  evidence becomes public; use synthetic data for testing.
                </p>
                <div className="workflow">
                  {[
                    ["1 · Register policy", "register", [id, counterparty, p]],
                    ["2 · Accept & lock", "accept", [id]],
                    ["3 · Submit evidence", "submit", [id, e]],
                    ["4 · Assess", "assess", [id]],
                  ].map(([label, name, args]: any) => (
                    <button
                      key={name}
                      className="primary"
                      disabled={busy || !address}
                      onClick={() => run(() => write(name, args))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label>
                  Challenge reason
                  <textarea
                    className="short"
                    placeholder="Identify the disputed interpretation and supporting facts…"
                    maxLength={2000}
                    value={reason}
                    onChange={(v) => setReason(v.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  disabled={busy || !address || !reason}
                  onClick={() => run(() => write("challenge", [id, reason]))}
                >
                  Record challenge
                </button>
                {tx && (
                  <div className="tx-details">
                    <code>{tx}</code>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const r = await reader.getTransaction({
                            hash: tx as any,
                          });
                          setStatus(
                            String(r.statusName) +
                              " · " +
                              String(r.txExecutionResultName),
                          );
                          if (r.statusName === "FINALIZED") await load();
                        })
                      }
                    >
                      Refresh transaction status
                    </button>
                  </div>
                )}
                <p className="helper">
                  One challenge and two assessments per shipment. Evidence and
                  policy cannot be replaced after locking.
                </p>
              </section>
              <section className="card result">
                <h2>Contract record</h2>
                {record ? (
                  <>
                    <div className="record-summary">
                      <span className="pill">
                        {record.result?.status || record.phase}
                      </span>
                      <p>{record.result?.reason || "Awaiting assessment"}</p>
                      {record.result && (
                        <div className="result-metrics">
                          <span>
                            Outside range:{" "}
                            <strong>{record.result.total_excursion_s}s</strong>
                          </span>
                          <span>
                            Longest excursion:{" "}
                            <strong>
                              {record.result.longest_excursion_s}s
                            </strong>
                          </span>
                          <span>
                            Assessment: <strong>{record.round} of 2</strong>
                          </span>
                        </div>
                      )}
                      <p>
                        Policy quote:{" "}
                        {record.result?.policy_quote ||
                          "No semantic exception applied"}
                      </p>
                      <p>
                        Incident quote:{" "}
                        {record.result?.incident_quote ||
                          "No semantic exception applied"}
                      </p>
                    </div>
                    <details>
                      <summary>Full contract record</summary>
                      <pre>{JSON.stringify(record, null, 2)}</pre>
                    </details>
                  </>
                ) : (
                  <div className="empty">
                    <FileCheck2 />
                    <h3>No on-chain record loaded</h3>
                    <p>
                      {example
                        ? "The form contains synthetic evidence. It has not been submitted."
                        : "Load a shipment ID to inspect its contract state."}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
          {tab === "Receipt ledger" && (
            <section className="card">
              <div className="section-title">
                <div>
                  <h2>Tamper-evident history</h2>
                  {receipts.length > 0 && (
                    <span className="pill">Hash chain verified</span>
                  )}
                  <p>
                    Each contract transition binds its prior receipt, actor,
                    sequence, and state hash.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={!record}
                  onClick={download}
                >
                  <Download size={16} /> Export record
                </button>
              </div>
              {receipts.length ? (
                receipts.map((r) => (
                  <div className="receipt" key={r.sequence}>
                    <span className="receipt-number">{r.sequence}</span>
                    <div>
                      <strong>{r.action}</strong>
                      {r.action === "ASSESS" && r.result && (
                        <div className="receipt-decision">
                          <span className="pill">
                            {r.result.status} · round {r.round}
                          </span>
                          <p>{r.result.reason}</p>
                        </div>
                      )}
                      <code>{r.hash}</code>
                      <small>Previous: {r.previous}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <FileCheck2 />
                  <h3>No receipts loaded</h3>
                  <p>
                    Load an existing shipment in the workspace to retrieve its
                    public contract receipts.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setTab("Shipment workspace")}
                  >
                    Open workspace
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "Shipment comparison" && <Comparison />}
          {tab === "How it works" && (
            <>
              <section className="card prose">
                <h2>From agreed policy to auditable review</h2>
                <ol>
                  <li>
                    <strong>Register an agreement.</strong> Define the shipment
                    window, range, absolute limits, sampling gap, excursion
                    durations, and exception clause. The counterparty accepts
                    and locks it.
                  </li>
                  <li>
                    <strong>Submit a complete evidence bundle.</strong> Supply
                    ordered temperature readings, provenance notes, and the
                    incident report. Canonical JSON and SHA-256 bind the exact
                    submitted content.
                  </li>
                  <li>
                    <strong>Apply deterministic checks.</strong> Absolute
                    breaches are non-compliant. Missing window coverage or
                    excessive sampling gaps are inconclusive. Ordinary duration
                    limits use integer seconds.
                  </li>
                  <li>
                    <strong>Interpret an exception.</strong> When ordinary
                    duration limits are exceeded, independent validators
                    interpret the locked clause against the incident, requiring
                    exact supporting quotes and matching verdicts.
                  </li>
                  <li>
                    <strong>Inspect or challenge.</strong> Either party can
                    request one reassessment with a recorded challenge. Previous
                    assessments remain committed in the receipt history.
                  </li>
                </ol>
                <h3>What the result means</h3>
                <p>
                  COMPLIANT means the supplied handling evidence meets the
                  agreed policy. NON_COMPLIANT identifies a measured breach or
                  clear exclusion. INCONCLUSIVE requires human follow-up.
                  Network or model errors leave the transaction unresolved; they
                  never become a successful review.
                </p>
                <h3>Data and authority</h3>
                <p>
                  Shipment policy is the agreed source of authority. Logs and
                  reports are party-supplied claims, not authenticated
                  observations. No universal medical or food safety range is
                  assumed. Missing real-world evidence cannot be invented by an
                  AI model.
                </p>
                <h3>Using the Studio inbuilt wallet</h3>
                <p>
                  Open Studio, upload contracts/coldchain_review.py from GitHub,
                  deploy in Normal (Full Consensus) mode, and use its methods in
                  the listed order. Studio holds its wallet separately; this
                  site never requests its private key.
                </p>
                <a
                  href="https://github.com/ANZA24k/ColdChain-Review"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read source and deployment instructions{" "}
                  <ExternalLink size={14} />
                </a>
              </section>
            </>
          )}
          <footer>
            <span>ColdChainReview · Evidence-grounded shipment assurance</span>
            <span>Handling compliance ≠ product safety certification</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Stat({ icon, label, value, sub }: any) {
  return (
    <section className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <div>{icon}</div>
      </div>
      <h2>{value}</h2>
      <p>{sub}</p>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
