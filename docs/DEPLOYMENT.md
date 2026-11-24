# Deployment

Production: https://coldchain-review.vercel.app
Vercel project: coldchain-review, team anza0x.
Framework: Vite. Node: 22.x. Build: npm run build. Output: dist.

Vercel's Git integration returned repo_no_access for ANZA24k/ColdChain-Review. The app is published directly through Vercel's authenticated deployment API; source is maintained through the connected GitHub account. A GitHub push currently does not automatically publish a website update.

Contract: 0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA
RPC: https://studio.genlayer.com/api
Network: Studionet, 61999.

Upload contracts/coldchain_review.py to Studio, use Normal (Full Consensus), and deploy with no constructor parameters. Wait for finalization and check execution success separately from consensus outcome. Configure src/config.json with the resulting address. Never put signing keys in frontend configuration.

The current development instance was updated to request structured JSON output after multi-model testing exposed format-related disagreement. getContractCode was fetched afterward and the exact source recovered to this repository. See EVIDENCE.md for its SHA-256.

To resume live verification, use Studio's inbuilt account 0xcD72fA5B6A496d84B4A10bCFF31D3B7c12346a9e and the deployed contract. CCR-LIVE-001 is currently SUBMITTED, round 0. Call assess; verify a successful accepted result. Then challenge once and assess again. Record actual hashes and verify the receipt chain. Do not mark these steps completed until confirmed.
