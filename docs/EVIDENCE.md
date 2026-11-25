# Verification evidence — 25 November 2026

## Release

The owner will publish the supplied static ZIP on Netlify and provide the public URL. The package is built and tested; it has not been published to Netlify by the agent.

Contract: https://explorer-studio.genlayer.com/address/0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA

Network: GenLayer Studionet (61999).

Release source SHA-256: 6b3cf4087a8a2e015d4a70abd488489c98f374aeeb156de08c3d50f817dec901

getContractCode matches contracts/coldchain_review.py byte for byte. The source, canonical policy/evidence hashes, six receipt hashes, chain links, and current state hash were independently recomputed by scripts/verify-live.mjs.

## Complete live workflow

| Action | Transaction |
| --- | --- |
| Deploy | 0x0b0c1acdbf24ab51e1363d4716ceb4cfb406b5dd33faf622be7d6099e60487a7 |
| Register policy | 0x26308ac35f86e5ef2d6095c33b28d4583a8a0aeb323131cfee67ccac599f688a |
| Accept and lock | 0xa04da9ac66ac7600fc65b7489976c5cc65b17a7fe260e7dbaea54d00cc9fa7a2 |
| Submit evidence | 0x667ca4bd62bb40edbad89c48ed7ffb863bf8b81fe7c160f9f12cd332a6f268cf |
| Assess | 0xae36bd25ba5d6b3e8c35ac16dd161bd16506d72d55d756162f151fee0062fd9f |
| Challenge | 0x6493c00604ce0abd330b596b98052f4dd5699a2234878157b31730e0f87182f8 |
| Reassess | 0xc885791f2916fb996c033435d0a0f0a4b6291b866ad6314e67ebb33a49203a84 |

Finalized reads for CCR-LIVE-001 show phase REVIEWED, round 2, status COMPLIANT, and six receipts. Both assessment snapshots are COMPLIANT, with exact supporting clause and incident quotations. The challenge asks whether the explicit unloading allowance overrides the ordinary duration cap. The preserved snapshots and final record are in live-record.json; the verification summary is in source-and-chain-verification.json.

These signed actions used Studio's inbuilt wallet 0xcD72fA5B6A496d84B4A10bCFF31D3B7c12346a9e. The synthetic fixture deliberately uses that account for both party roles. Local authorization tests cover separate identities; this fixture does not establish two independent organizations.

## Earlier unsuccessful development attempts

Before the structured JSON correction, 0x4d851cf22708c4641274c6139a406e02da9845a0605f9e7c7072d007f43049a2 and 0x2949925ffc69831bdf7766a10d090b4fe58a340437c90d440c24bff034c55e37 had majority disagreement. They committed no assessment receipt. A finalized leader execution alone was never treated as an accepted review.

The correction uses response_format="json" while retaining schema, quotation, independent verdict, and fail-closed checks. The two later successful assessment receipts belong to this exact corrected release source. The hosted development instance supports Studio code updates; reviewers should check the source hash instead of assuming hosted bytecode can never change.

## Validation

- 29 contract/adversarial tests pass against the actual source with a local storage/context shim.
- Hosted GenVM schema validation passes.
- TypeScript/Vite production build passes.
- Responsive navigation, horizontal overflow, and missing-wallet handling were checked at 390, 768, and 1440 px.
- Live UI integration reads finalized contract state, verifies receipt hashes and current state, and exports JSON.
- EIP-1193 connection, account request, and network selection are exercised with a test provider. Actual signed transactions use Studio's inbuilt wallet, not a live MetaMask signature.

The local browser integration uses a Node transport bridge to the actual public RPC because this execution environment's browser networking differs. Public website reads were also exercised directly in the interactive browser. Intermittent Studio rate limits and connection failures are surfaced as request errors and do not authorize replaying a submitted transaction.

The synthetic 2–8°C example is an agreed fixture, not a product safety recommendation. Sensor authenticity, custody, safety certification, and release authority remain outside scope. No public social post was created.
