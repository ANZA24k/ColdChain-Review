# ColdChainReview

Intelligent shipment temperature compliance verification with GenLayer.

- Website: [Open ColdChainReview](https://fastidious-pasca-1d66e0.netlify.app/)
- Contract: [0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA](https://explorer-studio.genlayer.com/address/0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA)
- Network: Studionet (61999)
- [Source](contracts/coldchain_review.py), [verification evidence](docs/EVIDENCE.md), [security](SECURITY.md)

## Problem and workflow

Logistics parties can agree on temperature limits but disagree about documented handling exceptions. ColdChainReview binds a fixed transportation agreement, ordered temperature logs, incident, interpretation, challenge, and decision history to a shared contract.

Register a unique shipment ID and counterparty; the counterparty accepts; the owner submits evidence once; either party assesses. One challenge and one reassessment are allowed. Evidence and policy cannot be replaced. Receipts preserve verdicts and supporting quotations.

Integer arithmetic detects hard breaches, coverage gaps, longest excursions, and aggregate excursions. GenLayer validators independently interpret permitted soft-limit exceptions using complete readings, extrema, excursion counts, policy prose, and incident evidence. They must agree on the verdict. Decisive outputs require exact source quotations. Malformed output is inconclusive; consensus or provider failures leave the record unreviewed.

## Try it

Open Shipment workspace and load CCR-LIVE-001 without a wallet. Inspect the record and Receipt ledger, which verifies its SHA-256 chain before displaying it. This fixture is synthetic. Its complete lifecycle has finalized: two COMPLIANT assessments and six verified receipts; see EVIDENCE.md.

For a new shipment, connect a browser wallet on Studionet or use GenLayer Studio's inbuilt wallet. Use a new ID, register the policy, switch to the counterparty to accept, return to the owner to submit, and assess. Either party can challenge after the first successful assessment and assess once more.

Studio's inbuilt signer is separate from this site's origin. Never paste its private key into the app.

## Develop

Requires Node 22+ and Python 3.12+.

```bash
npm ci
npm test
npm run build
npm run dev
node scripts/schema.mjs
node scripts/verify-live.mjs
```

The 29 local tests execute the contract source with a storage/context shim. They cover numeric limits, missing coverage, duplicates, authorization, evidence immutability, bounded challenges, grounded AI results, and validator disagreement. They are not a substitute for live GenVM consensus.

## Rules and limits

Readings are [Unix seconds, milli-Celsius]. Each reading represents the interval until the next; the final reading still counts for hard-bound checks. Temperature bounds and duration allowances are inclusive. Hard breaches cannot be waived. Missing start/end coverage or excessive sampling gaps are inconclusive. Ordinary duration overruns require an applicable exception. Policies have no universal safety authority: the fixture's 2–8°C range is a synthetic agreement.

Evidence is canonical JSON hashed with SHA-256. Maximum policy size is 5,000 UTF-8 bytes; evidence is 18,000 bytes and 2–192 readings. Provenance text is stored as a claim; URLs are not fetched. Prior assessments remain in hash-linked receipts.

This verifies supplied handling evidence. It does not authenticate sensors, certify product safety, or authorize product release. All submitted evidence is public. Studionet can reset. Future operational integrations could add signed logger records and custody attestations; these are not implemented.

See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), and [submission notes](docs/SUBMISSION.md).
