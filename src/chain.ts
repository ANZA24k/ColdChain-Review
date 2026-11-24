import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import config from './config.json';
export const reader = createClient({chain:studionet});
export const address = config.address as `0x${string}`;
export function requireDeployment(){if(!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Contract deployment is pending: Studio has no available validators. Source and local validation are available.');}
export async function readShipment(id:string){requireDeployment();return JSON.parse(String(await reader.readContract({address,functionName:'get_shipment',args:[id]})));}
export async function connect(){
 const provider=(window as any).ethereum;
 if(!provider) throw new Error('No browser wallet found. Open GenLayer Studio to use its inbuilt wallet, or install MetaMask.');
 const accounts=await provider.request({method:'eth_requestAccounts'});
 try {await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]});}
 catch(e:any){if(e.code!==4902)throw e;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0xf22f',chainName:'GenLayer Studionet',nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},rpcUrls:[config.rpc]}]});}
 return {client:createClient({chain:studionet,provider,account:accounts[0]}),account:String(accounts[0])};
}
export async function fetchReceipts(id:string,count:number){requireDeployment();const values=[];for(let i=1;i<=count;i++)values.push(JSON.parse(String(await reader.readContract({address,functionName:'get_receipt',args:[id,BigInt(i)]}))));return values;}
export async function hash(value:unknown){const raw=JSON.stringify(sort(value));const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function sort(v:any):any {if(Array.isArray(v))return v.map(sort);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])]));return v;}
