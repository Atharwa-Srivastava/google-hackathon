import {items,rules} from './catalog.js';
export function validateDetection(raw){
 const item=items.find(i=>i.name===raw?.item);
 const condition=item?.name==='Pizza box'&&['clean','greasy','mixed'].includes(raw?.condition)?raw.condition:'';
 const rule=item&&rules.find(r=>r.id===(item.name==='Pizza box'&&condition==='greasy'?'R7':item.rule));
 const validRule=rule&&(raw.ruleId===rule.id||(item?.name==='Pizza box'&&raw.ruleId===item.rule));
 const certain=raw?.certain===true&&!!item&&!!validRule&&(item.name!=='Pizza box'||!!condition);
 const identified=!!item&&raw?.certain===true;
 return {item:item?.name||null,identified,label:typeof raw?.label==='string'?raw.label.slice(0,160):item?.name||'Unclear object',location:typeof raw?.location==='string'?raw.location.slice(0,120):'',quantity:Number.isInteger(raw?.quantity)&&raw.quantity>0&&raw.quantity<=100?raw.quantity:1,condition,certain,question:!item?.rule&&identified?'Item identified, but this sample guide has no collection rule. Ask campus facilities or your local waste service for an accepted collection route.':typeof raw?.question==='string'?raw.question.slice(0,500):'Please confirm what this object is and its material.',rule:rule?.id||'',name:item?.name||'Unclear object',material:item?.material||'Not confirmed',category:certain?(item.name==='Coffee cup'||condition==='mixed'?'Separate components':rule.category):identified&&!item.rule?'Check collection':'Needs a closer look'};
}
export function normalizeBatch(answer){
 if(!answer||typeof answer!=='object')throw Error('The AI returned no readable item list. Please try again.');
 const list=Array.isArray(answer.items)?answer.items:[answer];
 if(!list.length)throw Error(typeof answer.question==='string'?answer.question:'No waste could be identified. Try a closer, better-lit photo.');
 return {entries:list.slice(0,30).map(validateDetection),incomplete:answer.incomplete===true||list.length>30,overview:typeof answer.overview==='string'?answer.overview.slice(0,400):''};
}
