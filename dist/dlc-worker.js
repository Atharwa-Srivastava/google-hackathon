// Fast material inference and independent packaging loading share no blocking queue.
importScripts('/dlc-assets.js');
let humanGuard,guardCache=null,latestFrame=null,ortSession,head,context,busy=false,currentSession=0,packagingCache=null,packaging=null,packagingReady=false,packagingPending=null,packageTimer=null,retryTimer=null,packageAttempt=0,tickTimer=null;
function startTicks(){if(!tickTimer)tickTimer=setInterval(()=>{if(currentSession>=0&&!busy)self.postMessage({type:'tick',session:currentSession});},100);}
const sendCoverage=coverage=>self.postMessage({type:'coverage',coverage,packagingReady});
function startPackaging(){
 if(packaging)return;
 const worker=new Worker('/dlc-packaging-worker.js');packaging=worker;sendCoverage('Material checks start first · packaging model loading in parallel');
 packageTimer=setTimeout(()=>recoverPackaging('Packaging download is slow. Material checks and camera remain active.'),90000);
 worker.onmessage=async({data})=>{
  if(worker!==packaging)return;
  if(data.type==='ready'){clearTimeout(packageTimer);packageTimer=null;packagingReady=true;sendCoverage('All local models ready');return;}
  if(data.type==='fatal'||data.type==='error'){recoverPackaging('Packaging detector is recovering. Camera and material checks remain active.');return;}
  if(data.type!=='result'||data.id!==packagingPending?.id)return;
  clearTimeout(packageTimer);packageTimer=null;const pending=packagingPending;packagingPending=null;
  if(pending.session===currentSession&&latestFrame?.scene===pending.scene){const {sceneDifference}=await import('/dlc-core.js');const diff=sceneDifference(pending.signature,latestFrame.signature);if(diff.mean<30&&diff.ratio<.55){packagingCache={scene:pending.scene,capturedAt:latestFrame.capturedAt,signature:pending.signature,detections:data.detections};self.postMessage({type:'packaging-update',session:currentSession});}}
 };
 worker.onerror=()=>{if(worker===packaging)recoverPackaging('Packaging detector is recovering. Camera stays open.');};
}
function pausePackaging(message){if(packageTimer)clearTimeout(packageTimer);packageTimer=null;packaging?.terminate();packaging=null;packagingReady=false;packagingCache=null;packagingPending=null;sendCoverage(message);}
function recoverPackaging(message){if(packageTimer)clearTimeout(packageTimer);packageTimer=null;packaging?.terminate();packaging=null;packagingReady=false;packagingCache=null;packagingPending=null;sendCoverage(message);if(packageAttempt>=2){pausePackaging('Waste verifier paused after repeated errors. Tap Retry detector.');return;}if(!retryTimer)retryTimer=setTimeout(()=>{retryTimer=null;startPackaging();},Math.min(30000,1000*2**Math.min(packageAttempt++,5)));}
const ready=(async()=>{
 const modelData=fetch('/dlc-head.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('DLC material head unavailable.');return r.json();});
 // TensorFlow download/compilation cannot block this worker's material model.
 startPackaging();
 importScripts('/vision/dlc/ort.min.js');
 self.ort.env.wasm.numThreads=1;self.ort.env.wasm.proxy=false;self.ort.env.wasm.wasmPaths='/vision/dlc/';
 head=await modelData;
 const response=await fetch('/dlc-backbone.onnx?sha='+head.backbone.sha256);if(!response.ok)throw Error('DLC feature model unavailable.');const bytes=await response.arrayBuffer();
 const checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(checksum!==head.backbone.sha256)throw Error('DLC model integrity check failed.');
 ortSession=await self.ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 const {createHumanGuard}=await import('/dlc-human.js');humanGuard=await createHumanGuard(self.ort);
 const canvas=new OffscreenCanvas(224,224);context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#888';context.fillRect(0,0,224,224);
 await predict(context.getImageData(0,0,224,224).data);await humanGuard.detect(context.getImageData(0,0,224,224).data);
 self.postMessage({type:'ready',evaluation:head.evaluation,packagingReady,coverage:packagingReady?'All local models ready':'Material detector ready · packaging still preparing'});
})().catch(error=>self.postMessage({type:'fatal',error:error.message||'Material detector could not start.'}));
async function predict(pixels){
 const input=new Float32Array(3*224*224),mean=head.normalization.mean,std=head.normalization.std;
 for(let i=0;i<224*224;i++)for(let channel=0;channel<3;channel++)input[channel*224*224+i]=(pixels[i*4+channel]/255-mean[channel])/std[channel];
 const tensor=new self.ort.Tensor('float32',input,[1,3,224,224]);let outputs;
 try{outputs=await ortSession.run({[head.inputName]:tensor});const {predictMaterial}=await import('/dlc-core.js');return predictMaterial(outputs[ortSession.outputNames[0]].data,head);}finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
}
async function run(pixels,frame){
 const {frameSignature,canReusePackaging,sceneDifference,selectDlcTarget,resolveDlcScene}=await import('/dlc-core.js');
 const signature=frameSignature(pixels),scene=frame.session+':'+(frame.visualScene??frame.scene),current={scene,capturedAt:frame.capturedAt,signature};latestFrame=current;
 const fresh=canReusePackaging(packagingCache,current),detections=fresh?packagingCache.detections:[];
 if(packagingReady&&!packagingPending&&(!fresh||frame.capturedAt-packagingCache.capturedAt>750)){
  packagingPending={id:frame.id,session:frame.session,...current};const copy=pixels.slice();packaging.postMessage({type:'frame',id:frame.id,pixels:copy.buffer},[copy.buffer]);
  packageTimer=setTimeout(()=>{sendCoverage('Waste verification is slow; camera stays on.');packageTimer=setTimeout(()=>pausePackaging('Waste verifier paused after a stalled frame. Tap Retry detector.'),12000);},3500);
 }
 const change=guardCache?sceneDifference(guardCache.signature,signature):{mean:255,ratio:1};
 const human=guardCache&&frame.capturedAt-guardCache.at<400&&change.mean<6&&change.ratio<.1?guardCache.human:await humanGuard.detect(pixels);guardCache={human,signature,at:frame.capturedAt};
 const target=selectDlcTarget(detections,human);
 let materialPixels=pixels;
 if(target){context.putImageData(new ImageData(pixels,224,224),0,0);const [x,y,w,h]=target.bbox,pad=.12*Math.max(w,h),left=Math.max(0,x-pad),top=Math.max(0,y-pad),right=Math.min(1,x+w+pad),bottom=Math.min(1,y+h+pad),crop=new OffscreenCanvas(224,224),ctx=crop.getContext('2d');ctx.drawImage(context.canvas,left*224,top*224,(right-left)*224,(bottom-top)*224,0,0,224,224);materialPixels=ctx.getImageData(0,0,224,224).data;}
 let prediction=await predict(materialPixels),decision=resolveDlcScene(prediction,target,human);
 // Tight crops can remove a can's identifying rim. With no human present,
 // retain the wider material view only if it independently verifies acceptance.
 if(target&&!human.faces.length&&!human.palms.length&&decision.state==='checking'){
  const wider=await predict(pixels),verified=resolveDlcScene(wider,target,human);
  if(verified.state==='accept'&&wider.confidence>prediction.confidence){prediction=wider;decision=verified;}
 }
 if(!packagingReady&&decision.state==='accept')return {prediction,detections,human,decision:{state:'checking',label:'Waste verification preparing',reason:'Camera is live. Do not drop until a green decision appears.',rule:''}};
 return {prediction,detections,human,candidate:decision.state!=='idle'&&prediction.confidence>=.75&&prediction.margin>=.2&&prediction.similarity>=prediction.minSimilarity,decision};
}

self.onmessage=async({data})=>{
 if(data.type==='dispose'){if(tickTimer)clearInterval(tickTimer);if(retryTimer)clearTimeout(retryTimer);if(packageTimer)clearTimeout(packageTimer);packaging?.terminate();self.close();return;}
 if(data.type==='idle'){if(tickTimer)clearInterval(tickTimer);tickTimer=null;currentSession=-1;packagingCache=null;guardCache=null;latestFrame=null;context?.clearRect(0,0,224,224);return;}
 if(data.type!=='frame')return;if(busy){self.postMessage({type:'skipped',id:data.id,session:data.session});return;}busy=true;currentSession=data.session;startTicks();
 try{await ready;if(!ortSession)return;const tick=performance.now(),result=await run(new Uint8ClampedArray(data.pixels),data);if(currentSession===data.session)self.postMessage({type:'result',id:data.id,session:data.session,scene:data.scene,capturedAt:data.capturedAt,inferenceMs:performance.now()-tick,...result});}
 catch(error){self.postMessage({type:'fatal',error:error.message||'DLC detection failed.'});}finally{busy=false;}
};
