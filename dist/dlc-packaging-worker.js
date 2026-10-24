importScripts('/dlc-assets.js');
let model,canvas,context,busy=false;
const ready=(async()=>{
 const {loadWasteModel}=await import('/waste-model.js');model=await loadWasteModel();
 canvas=new OffscreenCanvas(224,224);context=canvas.getContext('2d',{willReadFrequently:true});
 // One non-empty warm-up covers the object path; no three-pass startup gate.
 const {DATASET_SAMPLES}=await import('/sample-dataset.js');const bitmap=await createImageBitmap(await (await fetch(DATASET_SAMPLES[0].dataUrl)).blob());context.drawImage(bitmap,0,0,224,224);bitmap.close();await model.detect(canvas);context.clearRect(0,0,224,224);
 self.postMessage({type:'ready'});
})().catch(error=>self.postMessage({type:'fatal',error:error.message}));
self.onmessage=async({data})=>{if(data.type!=='frame'||busy)return;busy=true;try{await ready;if(!model)return;context.putImageData(new ImageData(new Uint8ClampedArray(data.pixels),224,224),0,0);const detections=(await model.detect(canvas)).map(p=>({class:p.class,score:p.score,bbox:p.bbox.map(n=>n/224)}));context.clearRect(0,0,224,224);self.postMessage({type:'result',id:data.id,detections});}catch(error){self.postMessage({type:'error',id:data.id,error:error.message});}finally{busy=false;}};
