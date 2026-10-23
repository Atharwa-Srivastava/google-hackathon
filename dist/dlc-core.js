// DLC decisions are a separate conservative bin policy, not a replacement for sorting.
export const DLC_BUDGET_MS=2000;
export const DLC_FRESH_MS=1100;
const rejects={battery:['Battery / e-waste','Use special collection. Batteries never belong in this dry-recycling bin.','R8'],biological:['Food / organic waste','Keep food out of the dry bin. Use the food-waste route in the guide.','R5'],glass:['Glass','This bin is for dry recyclables under R1–R3. Use the separate glass collection.','R4'],clothes:['Clothing / fabric','Use a textile collection or donation route. This dry bin does not accept clothes.',''],shoes:['Shoes','Check a reuse or specialist collection route. Keep shoes out of this bin.',''],trash:['Mixed / general waste','This bin does not accept general waste or mixed packaging.','R6']};
const rigid=new Set(['clear plastic bottle','other plastic bottle','plastic lid','other plastic container','spread tub']);
const cans=new Set(['drink can','food can']);
const unsafe=new Map([['battery',['Battery','Use special collection.','R8']],['food waste',['Food scraps','Keep food out of the dry bin.','R5']],['glass bottle',['Glass bottle','Use separate glass collection.','R4']],['glass jar',['Glass jar','Use separate glass collection.','R4']],['paper cup',['Lined cup','Separate components under the guide.','R6']],['drink carton',['Mixed carton','Keep out of this dry-recycling bin.','R6']],['crisp packet',['Multilayer wrapper','General-waste route under this sample guide.','R6']],['plastic film',['Flexible film','Not accepted by this dry-bin policy.','R6']],['single-use carrier bag',['Flexible plastic bag','Not accepted by this dry-bin policy.','R6']],['tissues',['Soiled paper / tissue','Use general waste under R7.','R7']],['pizza box',['Pizza box','Condition matters. Use the normal scanner to check clean and greasy sections.','R2']]]);
for(const label of ['glass cup','broken glass'])unsafe.set(label,['Glass','Use separate glass collection; check safe handling for broken pieces.','R4']);
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
 if(material==='plastic'&&objects.some(d=>rigid.has(d.class)&&d.score>=.55))return {state:'accept',label:'Rigid plastic packaging',reason:'Rigid packaging matches R1. Empty, rinse, dry and separate lids.',rule:'R1',confidence};
 return {state:'checking',label:material?material[0].toUpperCase()+material.slice(1)+' needs a check':'Not verified',reason:'The material alone does not prove that this bin accepts the object.',rule:'',confidence};
}
export class DlcDecisionGate{
 constructor({budget=DLC_BUDGET_MS,fresh=DLC_FRESH_MS}={}){this.budget=budget;this.fresh=fresh;this.reset();}
 reset(){this.started=null;this.scene=(this.scene??0)+1;this.timedOut=false;this.candidate='';this.hits=0;this.lastResult=-Infinity;this.last=null;this.state={state:'idle',label:'Ready for the next item',reason:'Show one item inside the inspection area.',rule:'',elapsed:0};return this.state;}
 observe({present,changed=false},now){
  if(!present)return this.reset();
  if(this.started===null){this.started=now;this.scene++;this.state={state:'checking',label:'Checking the item',reason:'Hold one item steady inside the square.',rule:'',elapsed:0};}
  if(changed){this.scene++;this.candidate='';this.hits=0;this.last=null;this.state={state:'checking',label:'Checking this view',reason:'Keep the item steady.',rule:'',elapsed:now-this.started};}
  if(this.last&&this.state.state!=='reject'&&now-this.lastResult>this.fresh){this.last=null;this.hits=0;this.candidate='';this.state={state:'checking',label:'Checking current item',reason:'The previous decision is no longer fresh.',rule:'',elapsed:now-this.started};}
  if(now-this.started>=this.budget&&this.state.state!=='accept'&&this.state.state!=='reject'){this.timedOut=true;this.state={state:'reject',label:'Not verified — do not drop',reason:'No reliable accepted match within two seconds. Remove the item and use the normal scanner.',rule:'',elapsed:now-this.started,uncertain:true};}
  return this.state;
 }
 result(result,{capturedAt,scene},now){
  if(this.started===null||this.timedOut||scene!==this.scene||now-capturedAt>this.fresh)return this.state;
  if(this.state.state==='reject')return this.state;
  if(now-this.started>=this.budget&&this.state.state!=='accept'&&this.state.state!=='reject')return this.observe({present:true},now);
  this.lastResult=now;this.last=result;
  if(result.state==='reject'){this.candidate='';this.hits=0;const elapsed=this.state.state==='reject'?this.state.elapsed:now-this.started;this.state={...result,elapsed};return this.state;}
  if(result.state==='accept'){
   const key=result.label+'|'+result.rule;this.hits=this.candidate===key?this.hits+1:1;this.candidate=key;
   const elapsed=this.state.state==='accept'&&this.state.label===result.label?this.state.elapsed:now-this.started;
   this.state=this.hits>=2?{...result,elapsed}:{state:'checking',label:'Confirming '+result.label.toLowerCase(),reason:'One more matching view before green.',rule:result.rule,elapsed:now-this.started};return this.state;
  }
  this.candidate='';this.hits=0;if(this.state.state!=='reject')this.state={...result,elapsed:now-this.started};return this.observe({present:true},now);
 }
}
export function frameSignature(pixels,size=224){const out=[];for(let y=4;y<size;y+=8)for(let x=4;x<size;x+=8){const p=(y*size+x)*4;out.push(pixels[p],pixels[p+1],pixels[p+2]);}return out;}
export function sceneDifference(a,b){if(!a||a.length!==b?.length)return {mean:255,ratio:1};let total=0,changed=0;for(let i=0;i<a.length;i+=3){const delta=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;total+=delta;if(delta>22)changed++;}return {mean:total/(a.length/3),ratio:changed/(a.length/3)};}
export function canReusePackaging(cache,frame){if(!cache||!frame||cache.scene!==frame.scene||frame.capturedAt<cache.capturedAt||frame.capturedAt-cache.capturedAt>1600)return false;const difference=sceneDifference(cache.signature,frame.signature);return difference.mean<6&&difference.ratio<.10;}
export function predictMaterial(features,head){
 if(features.length!==head.featureCount)throw Error('DLC model and material head do not match.');
 const scores=head.weights.map((row,c)=>{let sum=head.bias[c];for(let i=0;i<features.length;i++)sum+=((features[i]-head.featureMean[i])/head.featureScale[i])*row[i];return sum;});
 const max=Math.max(...scores),exps=scores.map(x=>Math.exp(x-max)),total=exps.reduce((a,b)=>a+b,0),rank=exps.map((x,i)=>({i,p:x/total})).sort((a,b)=>b.p-a.p),best=rank[0],material=head.classes[best.i];let similarity=1;if(head.centroids){let dot=0,norm=0;for(let i=0;i<features.length;i++){dot+=features[i]*head.centroids[best.i][i];norm+=features[i]*features[i];}similarity=dot/Math.max(1e-9,Math.sqrt(norm));}
 return {material,confidence:best.p,margin:best.p-(rank[1]?.p||0),threshold:head.thresholds[material],similarity,minSimilarity:head.minSimilarity?.[material]??0,probabilities:Object.fromEntries(rank.map(({i,p})=>[head.classes[i],p]))};
}
