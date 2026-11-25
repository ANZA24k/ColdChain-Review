import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "node:fs";
const c = createClient({ chain: studionet });
const hashes = JSON.parse(fs.readFileSync("docs/transaction-hashes.json"));
const out = [];
for (const [action, hash] of Object.entries(hashes)) {
  const x = await c.getTransaction({ hash });
  const y = Object.fromEntries(
    [
      "hash",
      "from_address",
      "to_address",
      "statusName",
      "txExecutionResultName",
      "result_name",
      "leader_only",
      "execution_mode",
      "lifecycle",
    ].map((k) => [k, x[k]]),
  );
  const data = x.consensus_data || {};
  y.action = action;
  y.votes = data.votes;
  y.leaders = (data.leader_receipt || []).map((r) => ({
    eq_outputs: Object.fromEntries(
      Object.entries(r.eq_outputs || {}).map(([k, v]) => [
        k,
        v.payload?.readable,
      ]),
    ),
    error: r.genvm_result?.error_description,
  }));
  y.validators = (data.validators || []).map((r) => ({
    address: r.node_config?.address,
    vote: r.vote,
    nondet_disagree: r.nondet_disagree,
    error: r.genvm_result?.error_description,
    model_tokens: r.execution_stats?.llm,
  }));
  out.push(y);
}
fs.writeFileSync("docs/transactions.json", JSON.stringify(out, null, 2) + "\n");
console.log(
  out.map((x) => ({
    action: x.action,
    hash: x.hash,
    status: x.statusName,
    execution: x.txExecutionResultName,
    outcome: x.lifecycle?.outcome,
  })),
);
