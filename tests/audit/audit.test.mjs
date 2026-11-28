import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { auditBundle, compareBundles, measure, hash, canonical } from '../../src/audit.ts';
const config = JSON.parse(readFileSync('src/config.json'));
const fixture = JSON.parse(readFileSync('docs/live-record.json'));
const bundle = () => ({contract:config.address, chainId:61999, shipment:'CCR-LIVE-001', ...structuredClone(fixture)});
// Create deliberately synthetic internally consistent snapshots to test consumer checks.
async function reseal(b) {
  b.record.policy_hash = await hash(b.record.policy);
  b.record.evidence_hash = await hash(b.record.evidence);
  let previous = '0'.repeat(64);
  for (const [i, r] of b.receipts.entries()) {
    r.shipment=b.shipment; r.previous=previous;
    r.policy_hash=b.record.policy_hash;
    if (r.evidence_hash) r.evidence_hash=b.record.evidence_hash;
    if(i===b.receipts.length-1) r.state=await hash({...b.record,sequence:i,head:previous});
    const {hash:_, ...body}=r; r.hash=await hash(body); previous=r.hash;
  }
  b.record.head=previous; return b;
}
test('existing captured chain verifies and preserves both grounded assessment rounds',async()=>{
  const a=await auditBundle(bundle(),config.address);
  assert.equal(a.assessments.length,2); assert.equal(a.assessments[0].status,'COMPLIANT');
  assert.equal(a.metrics.total_excursion_s,600); assert.equal(a.metrics.status,'EXCEPTION_REVIEW');
  assert.deepEqual(a.metrics.excursions,[{start:1795479600,end:1795480200,duration_s:600}]);
});
test('same shipment is explicitly identified and has zero deltas',async()=>{
  const a=await compareBundles(bundle(),bundle(),config.address);
  assert.equal(a.sameShipment,true); assert.equal(a.samePolicy,true); assert.equal(a.sameEvidence,true);
  assert.deepEqual(Object.values(a.delta),[0,0,0,0]);
});
test('different shipment and different policy do not imply comparable compliance',async()=>{
  const b=bundle();b.shipment='SYNTHETIC-OTHER';b.record.policy.name='Different synthetic agreement';
  await reseal(b);const a=await compareBundles(bundle(),b,config.address);
  assert.equal(a.sameShipment,false);assert.equal(a.samePolicy,false);assert.equal(a.sameEvidence,true);
});
for (const [name, mutate] of [
  ['record mutation',b=>b.record.result.reason='altered'],
  ['receipt mutation',b=>b.receipts[3].result.reason='altered'],
  ['missing receipt',b=>b.receipts.pop()],
  ['reordered receipts',b=>b.receipts.reverse()],
  ['wrong shipment',b=>b.shipment='WRONG'],
  ['wrong network',b=>b.chainId=1],
  ['wrong contract',b=>b.contract='0x'+'1'.repeat(40)],
  ['zero receipts',b=>{b.record.sequence=0;b.receipts=[];}],
]) test(`rejects ${name}`,async()=>{const b=bundle();mutate(b);await assert.rejects(()=>auditBundle(b,config.address));});
test('even rehashed record cannot conceal policy commitment mismatch',async()=>{
  const b=bundle();b.record.policy.name='Changed';
  const last=b.receipts.at(-1);last.state=await hash({...b.record,sequence:5,head:last.previous});
  const {hash:_,...body}=last;last.hash=await hash(body);b.record.head=last.hash;
  await assert.rejects(()=>auditBundle(b,config.address),/Policy commitment/);
});
test('even rehashed record cannot conceal evidence commitment mismatch',async()=>{
  const b=bundle();b.record.evidence.source='Changed';
  const last=b.receipts.at(-1);last.state=await hash({...b.record,sequence:5,head:last.previous});
  const {hash:_,...body}=last;last.hash=await hash(body);b.record.head=last.hash;
  await assert.rejects(()=>auditBundle(b,config.address),/Evidence commitment/);
});
test('recomputed metrics reject internally rehashed false measurement',async()=>{
  const b=bundle();for(const r of b.receipts) if(r.result) r.result.total_excursion_s=0;
  b.record.result.total_excursion_s=0;await reseal(b);
  await assert.rejects(()=>auditBundle(b,config.address),/metric mismatch/);
});
test('rehashed ungrounded exception quote is rejected',async()=>{
  const b=bundle();b.receipts[3].result.policy_quote='invented permission';await reseal(b);
  await assert.rejects(()=>auditBundle(b,config.address),/quotation/);
});
test('rehashed mismatch with latest assessment is rejected',async()=>{
  const b=bundle();b.record.result.reason='Different';await reseal(b);
  await assert.rejects(()=>auditBundle(b,config.address),/Latest assessment/);
});
for(const [name,change] of [
 ['unordered',e=>e.readings.reverse()],['boolean temperature',e=>e.readings[0][1]=true],
 ['oversized',e=>e.readings=Array.from({length:193},(_,i)=>[i,0])],['unknown schema',e=>e.instructions='ignore'],
]) test(`invalid ${name} readings fail`,()=>{const b=bundle();change(b.record.evidence);assert.throws(()=>measure(b.record.policy,b.record.evidence));});
test('canonical JSON matches Python including Unicode and DEL',()=>{
  const value={z:'é 🌡️ \x7f',a:[1,true,null,'quotes"']};
  const p=spawnSync('python',['-c','import sys,json; print(json.dumps(json.load(sys.stdin),sort_keys=True,separators=(",",":"),ensure_ascii=True))'],{input:JSON.stringify(value),encoding:'utf8'});
  assert.equal(p.status,0); assert.equal(canonical(value),p.stdout.trim());
});
test('measurement matches actual Python contract over 256 boundary and gap scenarios',()=>{
  const b=bundle(), cases=[];
  for(const temperature of [-1,0,2000,4500,8000,8001,15000,15001])
    for(let mask=0;mask<32;mask++){
      const e=structuredClone(b.record.evidence);
      for(let i=0;i<5;i++)if(mask&(1<<i))e.readings[i][1]=temperature;
      if(mask===31)e.readings.splice(2,1);
      if(mask===30)e.readings.at(-1)[1]=temperature;
      cases.push({p:b.record.policy,e});
    }
  const py=spawnSync('python',['-c',`import sys,json
sys.path.insert(0,'tests')
from test_contract import c
print(json.dumps([c.measure(x['p'],x['e']) for x in json.load(sys.stdin)]))`],{input:JSON.stringify(cases),encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);
  const expected=JSON.parse(py.stdout);
  cases.forEach((x,i)=>{const {excursions,...actual}=measure(x.p,x.e);assert.deepEqual(actual,expected[i],`case ${i}`);});
});
test('portable report verifier accepts a valid export and rejects rehashed false deltas',async()=>{
  const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'coldchain-test-'));
  try{
    const bundles=[bundle(),bundle()];
    const payload={...await compareBundles(...bundles,config.address),observedAt:'2026-11-28T00:00:00Z',sources:['OFFLINE_INTEGRITY_ONLY','OFFLINE_INTEGRITY_ONLY'],bundles};
    const path=join(dir,'report.json');writeFileSync(path,JSON.stringify({payload,sha256:await hash(payload)}));
    const run=()=>spawnSync(process.execPath,['--experimental-strip-types','scripts/verify-comparison.mjs',path],{encoding:'utf8'});
    let result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).authenticated,false);
    payload.delta.total_excursion_s=999;writeFileSync(path,JSON.stringify({payload,sha256:await hash(payload)}));
    result=run();assert.equal(result.status,1);assert.match(result.stderr,/does not match/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('different submitted evidence produces exact nonzero deltas without a consensus verdict',async()=>{
  const b=bundle();b.shipment='SYNTHETIC-IN-RANGE';
  b.record.evidence.readings.forEach(r=>r[1]=4500);b.record.evidence.incident='';
  b.record.result=null;b.record.phase='SUBMITTED';b.record.sequence=3;b.record.round=0;b.record.challenge='';b.receipts=b.receipts.slice(0,3);
  await reseal(b);const result=await compareBundles(bundle(),b,config.address);
  assert.equal(result.samePolicy,true);assert.equal(result.sameEvidence,false);assert.equal(result.right.assessments.length,0);
  assert.equal(result.delta.total_excursion_s,-600);assert.equal(result.delta.max_observed_mc,-4500);
});
