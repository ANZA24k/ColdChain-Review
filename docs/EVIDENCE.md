# Verification evidence — 24 November 2026

## Published

Website: https://coldchain-review.vercel.app
Contract: https://explorer-studio.genlayer.com/address/0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA
Release source SHA-256: 6b3cf4087a8a2e015d4a70abd488489c98f374aeeb156de08c3d50f817dec901

The source was read back with getContractCode after the structured-output correction. This repository contains that exact contract file.

## Confirmed live transactions

- Deploy: 0x0b0c1acdbf24ab51e1363d4716ceb4cfb406b5dd33faf622be7d6099e60487a7
- Register: 0x26308ac35f86e5ef2d6095c33b28d4583a8a0aeb323131cfee67ccac599f688a
- Accept: 0xa04da9ac66ac7600fc65b7489976c5cc65b17a7fe260e7dbaea54d00cc9fa7a2
- Submit: 0x667ca4bd62bb40edbad89c48ed7ffb863bf8b81fe7c160f9f12cd332a6f268cf

These finalized using the Studio inbuilt wallet. The fixture intentionally uses the same account for both party roles; independent-party authorization is covered locally, not proven organizationally.

## Unsuccessful assessments, retained honestly

0x4d851cf22708c4641274c6139a406e02da9845a0605f9e7c7072d007f43049a2 and 0x2949925ffc69831bdf7766a10d090b4fe58a340437c90d440c24bff034c55e37 had majority disagreement. A finalized transaction with a successful leader execution is not sufficient to establish an accepted assessment. No review receipt was committed; the shipment remained SUBMITTED at round 0.

The correction uses response_format="json". Its deployed source was read back and verified. The execution environment disconnected before the corrected assessment, challenge, and reassessment could be signed through the Studio wallet. Those live steps remain unverified.

A prior diagnostic instance 0x85EDd946ab0241C010E5c1c0f0da6C076d940d18 produced a successful semantic COMPLIANT assessment (0x240977d7ada1f04b2a9c09663b387fb20fb367c7523be40f844158c68ff25250), but it is not the release contract and is not a substitute for release verification.

## Checks

- 29 local contract/adversarial tests passed.
- GenVM schema validation passed.
- Production TypeScript/Vite build passed.
- Desktop/tablet/mobile navigation, overflow, and absent-wallet checks passed at 1440, 768, and 390 px.
- The public Vercel website was opened and loaded the release contract record through browser RPC.
- Three release receipts and their current state hash were verified before the disconnect.
- Dependency audit had zero reported vulnerabilities after patch updates.

MetaMask was not used for a live signature; actual signed deployment and registration steps used Studio's inbuilt wallet as requested. No video or social post was published. The project is published but its final corrected live lifecycle is not yet complete.
