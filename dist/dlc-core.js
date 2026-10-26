import {classifyWasteObject,NON_WASTE_CLASSES} from './waste-rules.js';
// DLC decisions are a separate conservative bin policy, not a replacement for sorting.
export const DLC_BUDGET_MS=2000;
export const DLC_FRESH_MS=1100;
const rejects={battery:['Battery / e-waste','Use special collection. Batteries never belong in this dry-recycling bin.','R8'],biological:['Food / organic waste','Keep food out of the dry bin. Use the food-waste route in the guide.','R5'],glass:['Glass','This bin is for dry recyclables under R1–R3. Use the separate glass collection.','R4'],clothes:['Clothing / fabric','Use a textile collection or donation route. This dry bin does not accept clothes.',''],shoes:['Shoes','Check a reuse or specialist collection route. Keep shoes out of this bin.',''],trash:['Mixed / general waste','This bin does not accept general waste or mixed packaging.','R6']};
const rigid=new Set(['clear plastic bottle','other plastic bottle','bottle','plastic bottle','plastic lid','other plastic container','plastic container','spread tub','tupperware','disposable food container']);
const cans=new Set(['drink can','food can','can','tin can','aluminum can','aluminium can','aerosol']);
const unsafe=new Map([['battery',['Battery','Use special collection.','R8']],['food waste',['Food scraps','Keep food out of the dry bin.','R5']],['glass bottle',['Glass bottle','Use separate glass collection.','R4']],['glass jar',['Glass jar','Use separate glass collection.','R4']],['paper cup',['Lined cup','Separate components under the guide.','R6']],['drink carton',['Mixed carton','Keep out of this dry-recycling bin.','R6']],['crisp packet',['Multilayer wrapper','General-waste route under this sample guide.','R6']],['plastic film',['Flexible film','Not accepted by this dry-bin policy.','R6']],['single-use carrier bag',['Flexible plastic bag','Not accepted by this dry-bin policy.','R6']],['tissues',['Soiled paper / tissue','Use general waste under R7.','R7']],['pizza box',['Pizza box','Condition matters. Use the normal scanner to check clean and greasy sections.','R2']]]);
for(const label of ['glass cup','broken glass'])unsafe.set(label,['Glass','Use separate glass collection; check safe handling for broken pieces.','R4']);
for(const label of ['banana','apple','orange','broccoli','carrot','sandwich','pizza','hot dog','donut','cake'])unsafe.set(label,['Food / organic waste','Keep food out of this dry recycling bin.','R5']);
for(const label of ['laptop','cell phone','mouse','keyboard','electronic','electronics','e-waste'])unsafe.set(label,['Electronic waste','Use special collection for electronics.','R8']);for(const label of ['shoe','shoes'])unsafe.set(label,['Shoes','Check a reuse or specialist collection route. Keep shoes out of this bin.','']);for(const label of ['clothes','clothing','textile','fabric'])unsafe.set(label,['Clothing / fabric','Use a textile collection or donation route. This dry bin does not accept clothes.','']);for(const label of ['cup','disposable cup'])unsafe.set(label,['Lined cup','Separate components under the guide.','R6']);
for(const label of ['other plastic wrapper','garbage bag','polypropylene bag','aluminium blister pack','carded blister pack','foam cup','foam food container','styrofoam piece','squeezable tube','cigarette'])unsafe.set(label,['Not accepted packaging','This object is not verified for this dry-recycling bin. Check the normal scanner.','']);
export function classifyDlc({material='',confidence=0,margin=0,threshold=1.01,similarity=1,minSimilarity=0,detections=[]}={}){
 const objects=detections.filter(d=>Number.isFinite(d.score)&&d.score>=.45&&Array.isArray(d.bbox)&&d.bbox[2]*d.bbox[3]>=.015).map(d=>({...d,class:String(d.class).trim().toLowerCase()}));
 for(const object of objects){const hit=unsafe.get(object.class);if(hit&&object.score>=.55)return {state:'reject',label:hit[0],reason:hit[1],rule:hit[2],confidence:object.score};}
 if(rejects[material]&&confidence>=Math.max(.80,Math.min(threshold,.93))&&margin>=.18){const [label,reason,rule]=rejects[material];return {state:'reject',label,reason,rule,confidence};}
 const strongCan=material==='metal'&&objects.some(d=>cans.has(d.class)&&d.score>=.60);
 const required=strongCan?.99:Math.max(.92,threshold);
 if(!Number.isFinite(confidence)||confidence<required||margin<.22||similarity<minSimilarity)return {state:'checking',label:'Not verified yet',reason:'Hold one item steady inside the inspection area.',rule:'',confidence};
 if(material==='paper'||material==='cardboard')return {state:'accept',label:material==='paper'?'Paper':'Cardboard',reason:'Material match for R2. Only empty, clean, dry and uncoated paper/cardboard belongs here.',rule:'R2',confidence};
 if(material==='metal'&&objects.some(d=>cans.has(d.class)&&d.score>=.55))return {state:'accept',label:'Metal can / food tin',reason:'Empty metal packaging matches R3. Rinse residue and let dry.',rule:'R3',confidence};
 if(material==='plastic'&&objects.some(d=>(rigid.has(d.class)||classifyWasteObject(d.class).category==='Dry Recyclable Waste'||d.class==='bottle')&&d.score>=.45))return {state:'accept',label:'Rigid plastic packaging',reason:'Rigid packaging matches R1. Empty, rinse, dry and separate lids.',rule:'R1',confidence};
 return {state:'checking',label:material?material[0].toUpperCase()+material.slice(1)+' needs a check':'Not verified',reason:'The material alone does not prove that this bin accepts the object.',rule:'',confidence};
}
const paperTypes=new Set(['normal paper','magazine paper','corrugated carton','paper bag','toilet tube','egg carton','cardboard','paper','cardboard box','paper / newspaper','carton','meal carton','other carton','wrapping paper']);
export function selectDlcTarget(detections=[],human={faces:[],palms:[]}){
 const hasHuman=(human.faces?.length||0)+(human.palms?.length||0)>0;
 return detections.map(d=>({...d,class:String(d.class).toLowerCase()})).filter(d=>{
  if(!Array.isArray(d.bbox)||d.bbox.length!==4||d.bbox.some(x=>!Number.isFinite(x))||d.score<(hasHuman?.65:.50))return false;
  const [x,y,w,h]=d.bbox;if(w<=0||h<=0||w*h<.015||w*h>.92)return false;
  if(NON_WASTE_CLASSES.has(d.class))return false;const info=classifyWasteObject(d.class);if(!info.recognized&&!rigid.has(d.class)&&!cans.has(d.class)&&!unsafe.has(d.class)&&!paperTypes.has(d.class)&&d.class!=='shoe')return false;
  for(const [boxes,limit] of [[human.faces||[],.55],[human.palms||[],.65]])for(const box of boxes){const b=box.bbox,overlap=Math.max(0,Math.min(x+w,b[0]+b[2])-Math.max(x,b[0]))*Math.max(0,Math.min(y+h,b[1]+b[3])-Math.max(y,b[1]));if(overlap/(w*h)>limit)return false;}
  return true;
 }).sort((a,b)=>b.score-a.score)[0]||null;
}
export function resolveDlcScene(prediction,target,human={faces:[],palms:[]}){
 if(target){const label=String(target.class).toLowerCase().trim();if(target.score>=.50){const bad=unsafe.get(label);if(bad)return {state:'reject',label:bad[0],reason:bad[1],rule:bad[2],confidence:target.score};if(rigid.has(label)||cans.has(label)||paperTypes.has(label)){const rule=cans.has(label)?'R3':rigid.has(label)?'R1':'R2';return {state:'accept',label:cans.has(label)?'Metal can / food tin':rigid.has(label)?'Rigid plastic packaging':'Paper / cardboard',reason:'Recognized by the live object detector. Only empty, clean and dry packaging belongs in this bin.',rule,confidence:target.score};}const info=classifyWasteObject(label);if(info.recognized&&!info.isNonWaste){if(info.category==='Dry Recyclable Waste'||info.dustbin==='Dry recycling'||label==='bottle'||label==='cardboard'){const rule=cans.has(label)?'R3':paperTypes.has(label)?'R2':'R1';return {state:'accept',label:info.label||'Dry recyclable packaging',reason:'Recognized dry waste matches bin policy.',rule,confidence:target.score};}else{const rule=info.category==='Wet / Biodegradable Waste'?'R5':info.category==='Hazardous / E-Waste'?'R8':info.category==='Glass collection'?'R4':'R6';return {state:'reject',label:info.label||'Wrong bin waste',reason:'Belongs in '+info.dustbin+'. Keep out of this dry bin.',rule,confidence:target.score};}}}}
 const hasHuman=(human.faces?.length||0)+(human.palms?.length||0)>0;
 if(hasHuman&&!target||['clothes','shoes','trash'].includes(prediction.material)&&(!target||hasHuman))return {state:'idle',label:hasHuman?'People and hands ignored':'Show only the waste item',reason:'No separate waste item is confirmed. Keep the item in the square; do not drop until green.',rule:''};
 if(prediction.similarity<prediction.minSimilarity)return {state:'checking',label:'Item not confirmed',reason:'Bring the waste closer and keep the background outside the square.',rule:''};
 if(!target&&['battery','biological','glass'].includes(prediction.material)&&(prediction.confidence<.96||prediction.margin<.35))return {state:'checking',label:'Need a clearer item view',reason:'Still checking. Uncertainty is not a wrong-bin decision.',rule:''};
 return classifyDlc({...prediction,detections:target?[target]:[]});
}
export class DlcDecisionGate{
 constructor({budget=DLC_BUDGET_MS,fresh=DLC_FRESH_MS}={}){this.budget=budget;this.fresh=fresh;this.scene=0;this.reset();}
 reset(){this.started=null;this.scene++;this.ignored=false;this.candidate='';this.hits=0;this.lastResult=-Infinity;this.lastCaptured=-Infinity;this.last=null;this.state={state:'idle',label:'Ready for the next item',reason:'Show one waste item inside the square. People and hands are ignored.',rule:'',elapsed:0};return this.state;}
 observe({present,changed=false},now){
  if(!present){if(this.started!==null||this.state.state!=='idle')return this.reset();return this.state;}
  if(this.started===null){this.started=now;this.scene++;}
  if(changed){this.scene++;this.started=now;this.ignored=false;this.last=null;this.candidate='';this.hits=0;this.state={state:'checking',label:'Checking this view',reason:'Hold the item steady. Do not drop until green.',rule:'',elapsed:0};}
  if(this.ignored)return this.state;
  if(this.last&&now-this.lastResult>this.fresh){this.last=null;this.candidate='';this.hits=0;this.started=now;this.state={state:'checking',label:'Rechecking the item',reason:'The last result expired. Keep the item visible; do not drop yet.',rule:'',elapsed:0};}
  if(this.state.state==='idle')this.state={state:'checking',label:'Looking for waste',reason:'Show one item clearly. Do not drop until green.',rule:'',elapsed:now-this.started};
  if(now-this.started>=this.budget&&this.state.state!=='accept'&&this.state.state!=='reject')this.state={state:'checking',label:'Not clear yet',reason:'Bring only the waste closer to the square. Still checking; do not drop yet.',rule:'',elapsed:now-this.started,uncertain:true};
  return this.state;
 }
 result(result,{capturedAt,scene},now){
  if(scene!==this.scene||!Number.isFinite(capturedAt)||capturedAt>now||now-capturedAt>this.fresh||capturedAt<=this.lastCaptured)return this.state;this.lastCaptured=capturedAt;
  if(result.state==='idle'){this.ignored=true;this.started=now;this.last=null;this.candidate='';this.hits=0;this.state={...result,elapsed:0,rule:''};return this.state;}
  if(this.started===null||this.ignored){this.started=now;this.ignored=false;}
  if(this.state.state==='accept'&&result.state!=='accept'||this.state.state==='reject'&&result.state!=='reject')this.started=now;
  this.lastResult=now;this.last=result;
  if(result.state==='accept'||result.state==='reject'){
   const key=result.state+'|'+result.label+'|'+result.rule;this.hits=this.candidate===key?this.hits+1:1;this.candidate=key;
   if(this.hits>=2){const same=this.state.state===result.state&&this.state.label===result.label;this.state={...result,elapsed:same?this.state.elapsed:now-this.started};}
   else this.state={state:'checking',label:'Confirming '+result.label.toLowerCase(),reason:'Checking a second fresh view. Do not drop yet.',rule:'',elapsed:now-this.started};
   return this.state;
  }
  this.candidate='';this.hits=0;this.state={...result,elapsed:now-this.started};return this.observe({present:true},now);
 }
}
export function frameSignature(pixels,size=224){const out=[];for(let y=4;y<size;y+=8)for(let x=4;x<size;x+=8){const p=(y*size+x)*4;out.push(pixels[p],pixels[p+1],pixels[p+2]);}return out;}
export function sceneDifference(a,b){if(!a||a.length!==b?.length)return {mean:255,ratio:1};let total=0,changed=0;for(let i=0;i<a.length;i+=3){const delta=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;total+=delta;if(delta>22)changed++;}return {mean:total/(a.length/3),ratio:changed/(a.length/3)};}
export function canReusePackaging(cache,frame){if(!cache||!frame||cache.scene!==frame.scene||frame.capturedAt<cache.capturedAt||frame.capturedAt-cache.capturedAt>6000)return false;const difference=sceneDifference(cache.signature,frame.signature);return difference.mean<30&&difference.ratio<.55;}
export function predictMaterial(features,head){
 if(features.length!==head.featureCount)throw Error('DLC model and material head do not match.');
 const scores=head.weights.map((row,c)=>{let sum=head.bias[c];for(let i=0;i<features.length;i++)sum+=((features[i]-head.featureMean[i])/head.featureScale[i])*row[i];return sum;});
 const max=Math.max(...scores),exps=scores.map(x=>Math.exp(x-max)),total=exps.reduce((a,b)=>a+b,0),rank=exps.map((x,i)=>({i,p:x/total})).sort((a,b)=>b.p-a.p),best=rank[0],material=head.classes[best.i];let similarity=1;if(head.centroids){let dot=0,norm=0;for(let i=0;i<features.length;i++){dot+=features[i]*head.centroids[best.i][i];norm+=features[i]*features[i];}similarity=dot/Math.max(1e-9,Math.sqrt(norm));}
 return {material,confidence:best.p,margin:best.p-(rank[1]?.p||0),threshold:head.thresholds[material],similarity,minSimilarity:head.minSimilarity?.[material]??0,probabilities:Object.fromEntries(rank.map(({i,p})=>[head.classes[i],p]))};
}
