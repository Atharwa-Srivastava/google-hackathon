// Published Trash AI YOLOv5/TACO graph, pinned to an upstream revision (MIT).
export const MODEL_REVISION='a11de7cb60bfb21399f64c57e48384a61a5044f7';
const BASE='/vision/model/';
let pending;
const scripts=new Map();
function loadScript(src){if(scripts.has(src))return scripts.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>{s.remove();scripts.delete(src);reject(Error('Could not download the local detector. Check your connection and retry.'));};document.head.appendChild(s);});scripts.set(src,p);return p;}
export async function loadWasteModel(){if(pending)return pending;pending=(async()=>{
 if(!window.tf)await loadScript('/vision/tf.min.js');const tf=window.tf;try{await tf.setBackend('webgl');}catch{await tf.setBackend('cpu');}await tf.ready();
 const labelsResponse=await fetch(BASE+'name_map.json');if(!labelsResponse.ok)throw Error('Waste labels could not be downloaded.');const labels=await labelsResponse.json();
 const model=await tf.loadGraphModel(BASE+'model.json');
 return {name:'Trash AI · 60 litter classes',async detect(canvas){
 const input=tf.tidy(()=>tf.image.resizeBilinear(tf.browser.fromPixels(canvas),[640,640]).div(255).expandDims(0));let outputs;
 try{outputs=await model.executeAsync(input,['Identity','Identity_1','Identity_2','Identity_3']);const [boxes,scores,classes,count]=await Promise.all(outputs.map(t=>t.data()));const results=[];for(let i=0;i<Math.min(count[0],scores.length);i++){if(scores[i]<.58)continue;const [x1,y1,x2,y2]=boxes.slice(i*4,i*4+4);results.push({class:labels[Math.round(classes[i])]||'',score:scores[i],bbox:[x1*canvas.width,y1*canvas.height,(x2-x1)*canvas.width,(y2-y1)*canvas.height]});}return results;}finally{input.dispose();if(outputs)tf.dispose(outputs);}
 }};
 })().catch(e=>{pending=null;throw e;});return pending;}
