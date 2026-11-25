# Netlify deployment

The owner will publish ColdChainReview manually on Netlify and provide the final public URL. No Netlify login or secret is required in the application.

## Ready-to-upload ZIP

Use ColdChainReview-Netlify.zip. Its root contains index.html, assets/, _headers, and _redirects. Upload the ZIP through Netlify's manual deploy interface, or extract it and drop the extracted folder. Do not upload the source repository as a manual static deploy: it needs a build first.

After publishing, open the site, select Shipment workspace, and load CCR-LIVE-001. Open Receipt ledger to inspect the verified six-step history and export JSON. Connect a browser wallet only for your own new submissions; public reads do not require it. Studio's inbuilt wallet remains a separate transaction surface.

## Building from source

Requires Node 22+ and Python 3.12+.

```bash
npm ci
npm test
npm run build
```

netlify.toml sets build command npm run build and publish directory dist. The public/ directory supplies the security headers and SPA fallback in manual deployments. .netlify/ is excluded from version control. No environment secrets are required.

## GenLayer

- Contract: 0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA
- Network: Studionet, 61999
- RPC: https://studio.genlayer.com/api
- Explorer: https://explorer-studio.genlayer.com/address/0xeC25c1Cf6F45c2623bE79f48ADF927ce7F1966dA

The release address is configured in src/config.json. Never include a private key or seed phrase in frontend configuration. Studio's inbuilt signer belongs to Studio and is not shared across origins.

To deploy a separate contract, validate its schema, upload contracts/coldchain_review.py in Studio, deploy in Normal (Full Consensus), verify finalization and successful accepted execution, update src/config.json, rebuild, and publish the new output. Source changes must be verified against getContractCode. See EVIDENCE.md for this release's checks and source hash.
