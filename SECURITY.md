# Security model

All evidence is public. Use synthetic or non-sensitive data. Sensor authenticity, calibration, custody, omitted readings, safety certification, and product release are outside scope.

Controls: exact input schemas; duplicate-key rejection; bounded UTF-8 payloads; strictly ordered integer readings; immutable policy and evidence; owner-only submission; counterparty-only acceptance; party-only assessment/challenge; one challenge and two successful assessments.

The numeric branch cannot be waived by an AI. Full readings and derived metrics are supplied to independent validators. Source quotations are checked exactly; model output is schema-validated; structured JSON output is requested. Disagreement or model errors never imply compliance. Text is treated as untrusted evidence, never instructions.

The app waits for finalization and successful execution, verifies current state and receipt hashes, and keeps a pending transaction ID. It never holds a Studio private key. Receipt snapshots preserve earlier results.

Consensus is not proof of physical truth. Correlated models, collusion, prompt injection, and fraudulent party statements remain risks. Two addresses do not establish two independent organizations. The interval model cannot prove actual temperature between samples.

Studionet supports development-time source upgrades; the release source hash and observed upgrade history are documented. A code hash check is needed when reviewing a mutable hosted development contract. There is no administration or record-replacement method in the contract's own public API.
