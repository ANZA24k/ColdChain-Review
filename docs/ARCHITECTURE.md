# Architecture

A React/Vite client calls GenLayer directly. No shared backend signer is used.

REGISTERED → LOCKED → SUBMITTED → REVIEWED → CHALLENGED → REVIEWED.

Numeric checks use integer milli-Celsius and seconds. Any hard-bound violation is NON_COMPLIANT. Otherwise missing coverage or excessive sampling gaps are INCONCLUSIVE. Ordinary duration overruns go to semantic review. Absent permission means NON_COMPLIANT; missing required incident evidence means INCONCLUSIVE.

The GenLayer leader and each validator independently execute a structured JSON task. Validators check shape, decisive source quotes, bounded rationale, and exact verdict agreement. They do not require identical reasoning text. The prompt receives full readings, observed extrema, excursion count, longest/total duration, policy, incident, and challenge. Contradictory claims must be inconclusive.

Accepted JSON is canonicalized with json.dumps(sort_keys=True,separators=(',',':'),ensure_ascii=True), encoded as UTF-8, and hashed with SHA-256. Canonical content, rather than upload whitespace, is bound.

Receipts contain shipment ID, sequence, actor, action, previous hash, state hash, phase, round, policy/evidence hashes, result snapshot, and challenge hash. Each hash excludes its own hash field. The current record head equals the latest receipt hash. To verify its state hash, restore the current record's sequence to sequence-1 and head to that receipt's previous hash, matching the pre-save representation.

LLM/provider failure or consensus disagreement does not increment the successful round. There is no automatic product-release decision.
