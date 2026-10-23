import {items,rules} from './catalog.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routes={
 'Dry recycling':{color:'#3b82f6',action:'Keep paper and cardboard clean and dry; flatten boxes. Empty rigid plastic and metal packaging, rinse away residue and let dry. Separate lids.'},
 'Food waste':{color:'#22c55e',action:'Remove packaging, stickers and other non-food parts. Place the fruit and vegetable scraps, eggshells and loose tea leaves accepted by R5 in the food-waste bin.'},
 'Glass collection':{color:'#a78bfa',action:'Empty and rinse glass bottles and jars. Separate lids; R4 sends metal lids to dry recycling. Use the glass collection point. Broken glass needs facilities advice.'},
 'General waste':{color:'#b58900',action:'Empty remaining contents from mixed packaging. Keep rigid plastic lids separate for dry recycling after rinsing and drying. Separate clean cardboard from greasy sections.'},
 'Special collection':{color:'#dc4848',action:'Keep batteries, bulbs and small electronic devices out of campus bins. Take them to the staffed special-waste desk under sample rule R8.'},
 'Check collection':{color:'#68756f',action:'Keep these items separate while checking their material, condition or collection route with campus facilities. This guide does not establish a disposal bin for them.'}
};
export function managementPlan(entries=[]){
 const groups=new Map(),compost=[],reuse=[],electronics=[];
 const add=(category,entry,note='')=>{if(!groups.has(category))groups.set(category,{category,...routes[category],items:[],ruleIds:new Set()});const group=groups.get(category);group.items.push({name:entry.name||entry.label||'Unclear object',quantity:entry.quantity||1,note});if(entry.rule&&category!=='Check collection')group.ruleIds.add(entry.rule);};
 for(const entry of entries){
  const item=items.find(i=>i.name===(entry.item||entry.name));
  // Revalidate historical/provider categories instead of trusting their display text.
  const rule=rules.find(r=>r.id===entry.rule),valid=entry.certain&&item&&rule&&(rule.id===item.rule||(item.name==='Pizza box'&&entry.condition==='greasy'&&rule.id==='R7'));
  if(valid){if(item.name==='Coffee cup'){add('General waste',entry,'Cup body');add('Dry recycling',entry,'Rigid plastic lid, only if present');}
   else if(item.name==='Pizza box'&&entry.condition==='mixed'){add('Dry recycling',entry,'Clean sections only');add('General waste',{...entry,rule:'R7'},'Greasy sections only');}
   else add(rule.category,entry);
  }else add('Check collection',entry,item&&!item.rule?'Identified; collection not covered':'Confirm identification / condition');
  if(item&&(valid||entry.identified)){
   if(item.compost)compost.push({name:item.name,type:item.compost});
   if(item.family==='E-waste and batteries')electronics.push(item.name);
   if(['R1','R2','R4'].includes(item.rule)&&valid&&entry.condition!=='greasy'&&entry.condition!=='mixed')reuse.push(item.name);
  }
 }
 return {groups:[...groups.values()].map(g=>({...g,ruleIds:[...g.ruleIds]})),compost,reuse,electronics,groupCount:entries.length};
}
export function renderManagement(entries,{provisional=false}={}){
 if(!entries?.length)return '';const plan=managementPlan(entries),e=escape;
 return '<section class="management-plan" aria-label="Overall waste management summary"><div class="eyebrow">YOUR NEXT SMALL ACTIONS</div><h2>Your waste management plan</h2><p>'+plan.groupCount+' item groups · '+plan.groups.length+' sorting destinations. Quantities are estimates; component rows describe the same item, not extra objects.'+(provisional?' This plan updates as you scan.':'')+'</p><div class="management-grid">'+plan.groups.map(g=>'<article class="management-card" style="--route:'+g.color+'"><h3>'+e(g.category)+'</h3><ul>'+g.items.map(i=>'<li><strong>'+e(i.name)+'</strong> <small>× ~'+e(i.quantity)+'</small>'+(i.note?'<br><small>'+e(i.note)+'</small>':'')+'</li>').join('')+'</ul><p>'+e(g.action)+'</p>'+(g.ruleIds.length?'<details><summary>Supporting sample guide passages</summary>'+g.ruleIds.map(id=>{const r=rules.find(r=>r.id===id);return '<blockquote><strong>'+e(id)+'</strong> · '+e(r.text)+'</blockquote>';}).join('')+'</details>':'<small>No applicable sample guide passage. Confirm the collection route.</small>')+'</article>').join('')+'</div>'+
 (plan.compost.length?'<details class="recovery-card" open><summary>Turn suitable scraps into compost</summary><p><strong>From your scan:</strong> '+plan.compost.map(i=>e(i.name)+' ('+i.type+')').join(', ')+'.</p><ol><li>Remove packaging and stickers. Chop scraps; crush eggshells.</li><li>Mix food scraps (“greens”) with dry leaves or other suitable “browns”; cover fresh scraps with browns.</li><li>Keep moist, not waterlogged, and turn to introduce air. A household pile needs time to break down and cure.</li><li>Use mature, dark, crumbly compost with an earthy smell in garden soil or as mulch. Raw peels are not ready-to-use fertilizer.</li></ol><p>For a basic home pile, avoid meat, dairy, grease, pet waste, treated wood and plastic, including compostable packaging. Check facility acceptance for these materials.</p><p class="hint">General home-composting education, separate from campus collection rules. Compost improves soil and supplies nutrients; it does not guarantee a complete fertilizer replacement. <a href="https://www.epa.gov/recycle/composting-home" target="_blank" rel="noopener">EPA composting guidance ↗</a></p></details>':'')+
 (plan.electronics.length?'<details class="recovery-card" open><summary>Give electronics a useful second life</summary><p>Repair or donate working devices where possible. Back up and delete personal data before handing them over. Ask your manufacturer or local registered collection service which items they accept.</p><p>Separate a battery only if it is user-removable and manufacturer instructions allow it. Do not open sealed devices. For intact loose lithium/rechargeable batteries, protect terminals with nonconductive tape or separate bags. For swelling or damage, contact the manufacturer or a qualified collection service for instructions.</p><p class="hint">General safety and reuse guidance: <a href="https://www.epa.gov/recycle/electronics-donation-and-recycling" target="_blank" rel="noopener">Electronics ↗</a> · <a href="https://www.epa.gov/recycle/used-household-batteries" target="_blank" rel="noopener">Batteries ↗</a>. Confirm local acceptance; these sources do not define your campus policy.</p></details>':'')+
 (plan.reuse.length?'<div class="recovery-card"><h3>Before you throw it away</h3><p>Check whether '+plan.reuse.map(e).join(', ')+' can be safely reused for storage or packing. Keep containers suited to their original use; do not assume disposable packaging is food-safe for repeated use.</p></div>':'')+
 '<p class="hint">Greenfield Campus is a fictional sample guide. Colours are visual aids, not universal bin standards. Hidden items and unconfirmed materials still need a check.</p></section>';
}
export function initLibrary(){
 const $=s=>document.querySelector(s);if(!$('#itemLibrary'))return;
 $('#catalogCount').textContent=items.length+' everyday items';
 $('#libraryFamily').innerHTML='<option value="">All materials</option>'+[...new Set(items.map(i=>i.family))].map(f=>'<option>'+escape(f)+'</option>').join('');
 const draw=()=>{const q=$('#librarySearch').value.toLowerCase().trim(),family=$('#libraryFamily').value;const matches=items.filter(i=>(!family||i.family===family)&&(i.name+' '+i.material+' '+i.keywords).toLowerCase().includes(q));$('#libraryCount').textContent=matches.length+' of '+items.length+' items · '+items.filter(i=>i.family==='E-waste and batteries').length+' electronics, batteries and bulbs';$('#itemLibrary').innerHTML=matches.map(i=>'<article class="library-item"><strong>'+escape(i.name)+'</strong><small>'+escape(i.material)+'</small><span class="badge">'+escape(rules.find(r=>r.id===i.rule)?.category||'Check collection')+(i.rule?' · '+i.rule:'')+'</span>'+(i.compost?'<small>Home-compost option · '+i.compost+'</small>':'')+'</article>').join('')||'<p>No matches. Ask your local waste service about unlisted items.</p>';};
 $('#librarySearch').oninput=draw;$('#libraryFamily').onchange=draw;draw();
 $('#downloadCatalog').onclick=()=>{const data={version:2,locality:'Fictional Greenfield Campus',notice:'Curated recognition and disposal catalog, not labelled image training data. Collection rules are demonstration policy.',rules,items};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='eco-tracker-'+items.length+'-item-catalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
