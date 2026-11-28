import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { hash } from '../src/audit.ts';
const config=JSON.parse(readFileSync('src/config.json'));
const fixture=JSON.parse(readFileSync('docs/live-record.json'));
const bundle={contract:config.address,chainId:61999,shipment:'CCR-LIVE-001',...fixture};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox']});
const results=[];
try {
for(const width of [390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173');
 await page.getByRole('navigation').getByRole('button',{name:'Shipment comparison',exact:true}).click();
 for(const label of ['Baseline file','Candidate file']) await page.getByLabel(label,{exact:true}).setInputFiles({name:'captured-record.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
 await page.getByRole('button',{name:'Verify and compare',exact:true}).click();
 await page.getByText('Both receipt chains, commitments, and deterministic metrics verified.',{exact:true}).waitFor();
 assert.equal(await page.getByText('Round 2: COMPLIANT',{exact:true}).count(),2);
 await page.getByText(/Same shipment selected/).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export comparison report'}).click();
 const download=await downloadPromise;const exported=JSON.parse(readFileSync(await download.path()));
 assert.equal(exported.sha256,await hash(exported.payload));
 assert.deepEqual(exported.payload.sources,['OFFLINE_INTEGRITY_ONLY','OFFLINE_INTEGRITY_ONLY']);
 assert.equal(exported.payload.left.assessments.length,2);
 const corrupt=structuredClone(bundle);corrupt.receipts[3].result.reason='tampered';
 await page.getByLabel('Candidate file',{exact:true}).setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
 assert.equal(await page.getByRole('button',{name:'Export comparison report'}).isEnabled(),false);
 await page.getByRole('button',{name:'Verify and compare',exact:true}).click();
 await page.getByText('Receipt integrity or shipment mismatch',{exact:true}).waitFor();
 assert.equal(await page.getByRole('table').count(),0);
 assert.deepEqual(errors,[]);
 results.push({width,passed:['offline import','receipt verification','both assessment rounds','same shipment warning','report download and hash','stale report cleared','tamper rejected','no overflow','no runtime errors']});
 if(width===1440){
   await page.getByLabel('Candidate file',{exact:true}).setInputFiles({name:'captured-record.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
   await page.getByRole('button',{name:'Verify and compare',exact:true}).click();
   await page.getByText('Both receipt chains, commitments, and deterministic metrics verified.',{exact:true}).waitFor();
   mkdirSync('docs/milestone-v1',{recursive:true});await page.screenshot({path:'docs/milestone-v1/comparison.png',fullPage:true});
 }
 await page.close();
}

if(process.env.LIVE_RPC === '1') {
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 await page.route('https://studio.genlayer.com/api',async route=>{
  try {const request=route.request();const response=await fetch(request.url(),{method:request.method(),headers:{'content-type':'application/json'},body:request.postData()});await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});}
  catch {await route.abort();}
 });
 await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173');
 await page.getByRole('navigation').getByRole('button',{name:'Shipment comparison',exact:true}).click();
 await page.getByRole('button',{name:'Verify and compare',exact:true}).click();
 try { await page.getByText('Both receipt chains, commitments, and deterministic metrics verified.',{exact:true}).waitFor({timeout:60000}); } catch(e) { console.error('Live comparison status:',await page.getByRole('status').allTextContents()); throw e; }
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export comparison report'}).click();
 const downloaded=await pending;const bytes=readFileSync(await downloaded.path());const exported=JSON.parse(bytes);
 assert.deepEqual(exported.payload.sources,['FINALIZED_RPC_READ','FINALIZED_RPC_READ']);
 assert.equal(exported.sha256,await hash(exported.payload));
 assert.equal(exported.payload.left.assessments.length,2);
 writeFileSync('docs/milestone-v1/live-comparison.json',bytes);
 results.push({mode:'fresh finalized RPC read using a browser request bridge',sameShipment:true,receipts:exported.payload.bundles[0].receipts.length,assessmentRounds:2,sha256:exported.sha256});
 await page.close();
}
writeFileSync('docs/milestone-v1/ui-validation.json',JSON.stringify({date:new Date().toISOString(),mode:'captured historical fixture, offline integrity only',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
