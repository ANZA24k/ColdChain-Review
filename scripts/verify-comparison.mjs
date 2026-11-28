// This command verifies exported data, never authenticates chain state or authorizes release.
import { readFileSync } from 'node:fs';
import { compareBundles, hash, canonical } from '../src/audit.ts';
import config from '../src/config.json' with { type:'json' };
try {
  if (!process.argv[2]) throw Error('Usage: node --experimental-strip-types scripts/verify-comparison.mjs report.json');
  const bytes=readFileSync(process.argv[2]);
  if(bytes.length>600000) throw Error('Report exceeds 600 KB');
  const report=JSON.parse(bytes.toString('utf8'));
  if(!report.payload || report.sha256!==await hash(report.payload)) throw Error('Report hash mismatch');
  const {bundles,sources,observedAt,...claimed}=report.payload;
  if(!Array.isArray(bundles)||bundles.length!==2)throw Error('Two record bundles required');
  const actual=await compareBundles(bundles[0],bundles[1],config.address);
  if(canonical(actual)!==canonical(claimed))throw Error('Comparison does not match verified bundles');
  console.log(JSON.stringify({integrity:true,authenticated:false,mode:'OFFLINE_INTEGRITY_ONLY',sha256:report.sha256},null,2));
} catch(e) {console.error(e.message);process.exitCode=1;}
