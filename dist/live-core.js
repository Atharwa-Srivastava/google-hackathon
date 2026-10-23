import {validateDetection} from './batch.js';
export const SCAN_INTERVAL=8000;
export function groupKey(e){return e.item?e.item+'|'+(e.condition||''):('unclear|'+e.label.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());}
export function mergeObservations(previous,answer,dismissed=[]){
 if(!answer||!Array.isArray(answer.items))throw Error('The scan returned an unreadable item list. Please try again.');
 const merged=new Map(previous.map(e=>[groupKey(e),e]));
 for(const raw of answer.items.slice(0,30)){const entry=validateDetection(raw),key=groupKey(entry);if(dismissed.includes(key))continue;const old=merged.get(key);if(old?.corrected)continue;
 merged.set(key,{...entry,id:old?.id||crypto.randomUUID(),quantity:Math.max(old?.quantity||0,entry.quantity),...(old?.certain&&!entry.certain?old:{}),estimated:true});}
 return [...merged.values()].slice(0,30);
}
export function retainFrames(frames,frame){const next=[...frames,frame];return next.length<=8?next:[next[0],...next.slice(-7)];}
export function observationPayload(entries){return entries.slice(0,30).map(({item,label,condition,quantity,certain})=>({item,label,condition,quantity,certain}));}
export function viewChanged(previous,next){return !previous||previous.reduce((sum,value,i)=>sum+Math.abs(value-next[i]),0)/next.length>9;}
export function elapsedLabel(ms){const seconds=Math.floor(ms/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
