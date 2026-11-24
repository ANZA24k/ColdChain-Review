import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';import fs from 'node:fs';
const c=createClient({chain:studionet});try{console.log(JSON.stringify(await c.getContractSchemaForCode(fs.readFileSync('contracts/coldchain_review.py','utf8')),null,2));}catch(e){console.error(e);process.exitCode=1;}
