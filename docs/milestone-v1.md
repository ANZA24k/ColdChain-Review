# Milestone v1 — Verified shipment comparisons and portable audits

Date: 2026-11-28

## Baseline and delta

Repository baseline: [5db9d95a43762c70592a6129005179ae2e00c79e](https://github.com/ANZA24k/ColdChain-Review/commit/5db9d95a43762c70592a6129005179ae2e00c79e). This is the pre-update repository head; Explorer acceptance timing is not available in this repository.

| Before | New functionality |
| --- | --- |
| Inspect one shipment and its receipts | Compare two finalized shipment records side by side |
| Metrics displayed from stored results | Independently recompute excursions, intervals, extrema, hard breaches and coverage gaps from readings |
| Read assessment receipts separately | Show every assessment round, supporting quotations, challenge and changed verdict/rationale together |
| Export one record | Export a comparison with both full evidence bundles and a canonical SHA-256 payload hash |
| No standalone export audit | Offline CLI revalidates both chains, commitments, metrics and comparison deltas |
| No browser comparison regression coverage | Automated mobile/tablet/desktop workflow, tampering and export checks plus contract parity tests |

The new feature is **Shipment comparison** in the application navigation. Logistics reviewers can compare handling evidence across shipments or audit the rationale of a challenged review without a wallet. Different policies and duplicate shipment selections are explicitly flagged; numerical differences are not treated as a new compliance verdict.

## Integrity and scope

Both records must have submitted evidence. The verifier checks shipment identity on every receipt, sequence/count bounds, prior hash links, the current state hash, policy/evidence commitments, measured metrics in all assessment receipts, latest result consistency, and exact quotations supporting approved exception interpretations. Hard-limit and coverage outcomes must match deterministic rules.

Live mode uses `LATEST_FINAL`, rereads the shipment after collecting receipts, rejects a changed head, deduplicates repeated IDs and bounds the comparison operation to 45 seconds. Imported files are limited to 256 KB each and labeled **OFFLINE_INTEGRITY_ONLY**. Offline hashes cannot authenticate a fabricated file or prove current chain state. Live reads trust the configured Studionet RPC. This feature neither authenticates sensors nor authorizes product release, and does not re-run semantic consensus.

Contract source, configuration address, network and existing explorer links are preserved. No new contract deployment or write transaction was required. Existing recorded assessments remain authoritative for semantic exception decisions.

## Reviewer walkthrough

1. Build with `npm ci && npm run build`; start with `npm run dev`.
2. Open **Shipment comparison**. Both inputs initially contain `CCR-LIVE-001`.
3. Click **Verify and compare**. The existing synthetic fixture has six receipts and two COMPLIANT assessment rounds. The page flags that this is the same shipment; it is not evidence of two real shipments.
4. Inspect the 600-second excursion, the challenge and changed rationale, with unchanged verdict. Compare another submitted shipment by replacing one ID.
5. Export the comparison JSON. Verify it separately:

```sh
node --experimental-strip-types scripts/verify-comparison.mjs coldchain-comparison.json
```

The verifier returns `integrity: true` and `authenticated: false`; offline verification never grants release authority. To import individual records, export them from **Receipt ledger** in this version. New exports include `chainId`. Earlier exports without `chainId` are rejected rather than assigned a network silently.

## Implementation and evidence

- [Comparison interface](../src/comparison.tsx)
- [Independent audit and metric recomputation](../src/audit.ts)
- [Offline report verifier](../scripts/verify-comparison.mjs)
- [Adversarial and Python parity tests](../tests/audit/audit.test.mjs)
- [Browser workflow tests](../scripts/check-comparison.mjs)
- [CI workflow](../.github/workflows/verify.yml)
- [Browser validation results](milestone-v1/ui-validation.json) and [captured-fixture screenshot](milestone-v1/comparison.webp)
- [Fresh live browser comparison report](milestone-v1/live-comparison.json) (existing synthetic shipment compared with itself; six receipts and both assessment rounds; browser requests forwarded unchanged through the test runner).
- [Example offline report](milestone-v1/example-report.json)
- [Validation and preservation record](milestone-v1/validation.json)
- [Existing deployed source and chain verification](source-and-chain-verification.json)

The captured fixture is synthetic and predates this milestone. Browser offline tests use its preserved history; they do not claim new consensus transactions, production shipments or adoption. Any fresh live comparison observations are recorded separately.

## Submission text

**Title:** Verified shipment comparisons and portable audit reports

**Changes & Improvements:** Added a shipment comparison workspace to ColdChainReview. Reviewers can compare finalized shipment records, inspect excursion intervals and measurement deltas, and trace both assessment rounds with supporting quotes and challenge rationale. The client independently verifies receipt chains, shipment identity, policy/evidence hashes and recomputed temperature metrics, rejecting tampered or inconsistent records. Different policies and duplicate shipment selections are flagged. Portable comparison reports include both evidence bundles and a SHA-256 payload hash; a new offline CLI rechecks report integrity without claiming chain authentication. Added adversarial tests, 256 Python-contract parity scenarios, responsive browser checks and CI. Existing contract source, address and explorer links are unchanged.

Select **ColdChainReview / ColdChain-Review** as the linked project in Explorer; the originally pasted form selected Release Gate. This document supplies submission material; it does not claim that the contribution form has been submitted.

## Published delta and CI evidence

- [Implementation commit](https://github.com/ANZA24k/ColdChain-Review/commit/ad84a1bdca0bd25b9ea9c1c86042729329399868)
- [Exact baseline-to-tested-update comparison](https://github.com/ANZA24k/ColdChain-Review/compare/5db9d95a43762c70592a6129005179ae2e00c79e...8456d4db32e3dc08a65f4afe14cbbf0c858e649f)
- [Successful GitHub CI run](https://github.com/ANZA24k/ColdChain-Review/actions/runs/46124624768), including 29 contract tests, 24 audit tests (256 Python parity scenarios), production build and browser comparison checks. The run includes downloadable comparison-validation artifacts.

The tested release pins Ubuntu 24.04 because the project's Playwright version does not support the newer ubuntu-latest runner image. All checks pass on the pinned runner.

The existing Netlify site has **not** been updated in this milestone session because browser sign-in was not completed. `ColdChainReview-Milestone-v1-Netlify.zip` contains the verified production build for manual deployment to the existing site, preserving its URL. ZIP SHA-256: `da4c831867be73afab6ba779dd1ef821e5868643bd9a371e29bed3c64a734e37`. No public website deployment or contribution-form submission is claimed.
