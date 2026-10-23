// DLC never uploads camera frames. This dedicated worker owns its inference queue.
let ortSession,head,litter,busy=false,context,packagingCache=null;
const ready=(async()=>{
 importScripts('/vision/dlc/ort.min.js');
 self.ort.env.wasm.numThreads=1;self.ort.env.wasm.proxy=false;self.ort.env.wasm.wasmPaths='/vision/dlc/';
 const [metadata,bytes]=await Promise.all([fetch('/dlc-head.json').then(r=>{if(!r.ok)throw Error('DLC material head unavailable.');return r.json();}),fetch('/dlc-backbone.onnx').then(r=>{if(!r.ok)throw Error('DLC feature model unavailable.');return r.arrayBuffer();})]);head=metadata;
 const checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(checksum!==head.backbone.sha256)throw Error('DLC model integrity check failed.');
 ortSession=await self.ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 const {loadWasteModel}=await import('/waste-model.js');litter=await loadWasteModel({household:false});
 const canvas=new OffscreenCanvas(224,224);context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#888';context.fillRect(0,0,224,224);
 await run(new Uint8ClampedArray(context.getImageData(0,0,224,224).data),null,true);
 // Non-empty warm-up also compiles the detector's object post-processing path.
 const {DATASET_SAMPLES}=await import('/sample-dataset.js');
 for(const sample of DATASET_SAMPLES.slice(0,2)){const bitmap=await createImageBitmap(await (await fetch(sample.dataUrl)).blob());context.drawImage(bitmap,0,0,224,224);bitmap.close();await run(new Uint8ClampedArray(context.getImageData(0,0,224,224).data),null,true);}
 self.postMessage({type:'ready',evaluation:head.evaluation,coverage:'Local material head + packaging detector'});
})().catch(error=>{self.postMessage({type:'fatal',error:error.message||'DLC models could not start.'});throw error;});
async function run(pixels,frame=null,forcePackaging=false){
 const input=new Float32Array(3*224*224),mean=head.normalization.mean,std=head.normalization.std;
 for(let i=0;i<224*224;i++)for(let channel=0;channel<3;channel++)input[channel*224*224+i]=(pixels[i*4+channel]/255-mean[channel])/std[channel];
 context.putImageData(new ImageData(pixels,224,224),0,0);
 const tensor=new self.ort.Tensor('float32',input,[1,3,224,224]);let outputs,prediction;
 const {predictMaterial,classifyDlc,frameSignature,canReusePackaging}=await import('/dlc-core.js');
 try{outputs=await ortSession.run({[head.inputName]:tensor});prediction=predictMaterial(outputs[ortSession.outputNames[0]].data,head);}finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
 const early=classifyDlc(prediction);if(!forcePackaging&&early.state==='reject')return {prediction,detections:[],decision:early};
 const current=frame?{scene:frame.scene,capturedAt:frame.capturedAt,signature:frameSignature(pixels)}:null;
 let detections;if(canReusePackaging(packagingCache,current))detections=packagingCache.detections;
 else{const objects=await litter.detect(context.canvas);detections=objects.map(p=>({class:p.class,score:p.score,bbox:p.bbox.map(n=>n/224)}));packagingCache=current?{...current,detections}:null;}
 return {prediction,detections,decision:classifyDlc({...prediction,detections})};
}
self.onmessage=async({data})=>{if(data.type!=='frame'||busy)return;busy=true;try{await ready;const tick=performance.now(),result=await run(new Uint8ClampedArray(data.pixels),data);self.postMessage({type:'result',id:data.id,scene:data.scene,capturedAt:data.capturedAt,inferenceMs:performance.now()-tick,...result});}catch(error){self.postMessage({type:'error',id:data.id,error:error.message||'DLC detection failed.'});}finally{busy=false;}};
