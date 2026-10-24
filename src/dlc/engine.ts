import {DlcDecisionGate,frameSignature,sceneDifference} from '../../dist/dlc-core.js';
import {dlcRuntime} from '../../dist/dlc-runtime.js';
export type DlcView={state:'off'|'loading'|'calibrating'|'ready'|'checking'|'accept'|'reject'|'background'|'paused'|'error';label:string;reason:string;rule?:string;elapsed?:number;confidence?:number;inferenceMs?:number;coverage?:string;packagingReady?:boolean;sound?:boolean;roi?:{width:number;height:number};evaluation?:{datasetImages:number;testAccuracy:number;split:Record<string,number>;note:string};cameraName?:string};
type Pending={id:number;scene:number;visualScene:number;capturedAt:number;watchdogAt:number;signature:number[]};
export class DlcEngine {
 private stream:MediaStream|null=null;
 private lease:ReturnType<typeof dlcRuntime.acquire>|null=null;
 private frame=0;private generation=0;private lastFrame=0;private workerReady=false;private running=false;private backgrounded=false;
 private pending:Pending|null=null;private requestId=0;private baseline:number[]|null=null;private previous:number[]|null=null;private latest:number[]=[];private stableFrames=0;private lastSent=0;
 private visualScene=0;private recognizedUntil=0;private gate=new DlcDecisionGate();private canvas=document.createElement('canvas');private context:CanvasRenderingContext2D;
 private audio:AudioContext|null=null;private lastBeep=-Infinity;private sound=true;private lastKey='';private evaluation:DlcView['evaluation'];private coverage='Preparing local models';private packagingReady=false;private deviceId='';private reconnectTimer:ReturnType<typeof setTimeout>|null=null;
 constructor(private video:HTMLVideoElement,private update:(state:DlcView)=>void){
  this.canvas.width=224;this.canvas.height=224;const context=this.canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Camera image processing is unavailable.');this.context=context;
  // Download/compile ahead of the permission prompt; this never opens a camera.
  if(typeof Worker!=='undefined')dlcRuntime.preload();
 }
 async enableAudio(){try{const AudioClass=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!AudioClass)return false;if(!this.audio)this.audio=new AudioClass();await this.audio.resume();return this.audio.state==='running';}catch{return false;}}
 setSound(enabled:boolean){this.sound=enabled;if(enabled)void this.enableAudio();}
 testBeep(){void this.enableAudio().then(ok=>{if(ok)this.beep(true);});}
 private beep(force=false){if(!this.sound||this.audio?.state!=='running'||!force&&performance.now()-this.lastBeep<3000)return;this.lastBeep=performance.now();for(const offset of [0,.17]){const oscillator=this.audio.createOscillator(),gain=this.audio.createGain(),t=this.audio.currentTime+offset;oscillator.type='sine';oscillator.frequency.value=880;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.10,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.12);oscillator.connect(gain);gain.connect(this.audio.destination);oscillator.start(t);oscillator.stop(t+.13);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}}
 private emit(view:DlcView){const full={...view,coverage:this.coverage,packagingReady:this.packagingReady,evaluation:this.evaluation,sound:this.audio?.state==='running'&&this.sound};const key=JSON.stringify({...full,elapsed:view.elapsed?Math.round(view.elapsed/50)*50:0,inferenceMs:view.inferenceMs?Math.round(view.inferenceMs):0});if(key===this.lastKey)return;this.lastKey=key;this.update(full);if(view.state==='reject')this.beep();}
 async start(deviceId=''){
  this.stop(false);this.visualScene++;this.recognizedUntil=0;const generation=++this.generation;this.running=true;this.backgrounded=document.hidden;this.deviceId=deviceId;this.workerReady=false;this.packagingReady=false;this.baseline=null;this.previous=null;this.stableFrames=0;this.pending=null;this.gate.reset();this.lastFrame=0;this.lastSent=0;this.lastKey='';this.lastBeep=-Infinity;
  this.emit({state:'loading',label:'Opening the bin camera',reason:'Material checks start first. Packaging verification prepares in parallel.',rule:'',elapsed:0,inferenceMs:0});void this.enableAudio();
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')throw Error('DLC needs camera access, workers and OffscreenCanvas. Use current laptop Chrome or Edge.');
   this.lease=dlcRuntime.acquire((data:any)=>{
    if(generation!==this.generation||!this.running)return;
    if(data.type==='unavailable'){this.pending=null;this.workerReady=false;this.packagingReady=false;this.gate.reset();this.coverage=data.reason;this.emit({state:'loading',label:'Detection is paused',reason:data.reason,rule:'',elapsed:0});return;}
    if(data.type==='restarting'){this.pending=null;this.workerReady=false;this.packagingReady=false;this.gate.reset();this.coverage=data.reason;this.emit({state:this.backgrounded?'background':'loading',label:'Detector is recovering',reason:'The camera stays on. No item is approved while the detector reconnects.',rule:'',elapsed:0});return;}
    if(data.type==='coverage'){const changed=this.packagingReady!==data.packagingReady;this.packagingReady=!!data.packagingReady;this.coverage=data.coverage;if(changed){this.gate.reset();if(this.workerReady&&this.baseline&&!this.backgrounded)this.showGate(this.gate.state);}return;}
    if(data.type==='ready'){this.workerReady=true;this.evaluation=data.evaluation;this.packagingReady=!!data.packagingReady;this.coverage=data.coverage;if(this.backgrounded)return;if(this.baseline)this.showGate(this.gate.reset());else this.calibrate();return;}
    if(data.type==='packaging-update'||data.type==='tick'){if(this.workerReady&&!this.pending&&!this.backgrounded)this.loop(performance.now());return;}
    if((data.type!=='result'&&data.type!=='skipped')||data.id!==this.pending?.id)return;
    const pending=this.pending;this.pending=null;if(data.type==='skipped'){this.loop(performance.now());return;}if(this.backgrounded||!pending)return;
    const diff=sceneDifference(pending.signature,this.latest);if(diff.mean>40&&diff.ratio>.65){this.recognizedUntil=0;this.showGate(this.gate.observe({present:true,changed:true},performance.now()));return;}
    if(data.candidate||data.decision.state==='accept'||data.decision.state==='reject')this.recognizedUntil=performance.now()+1500;else if(data.decision.state==='idle')this.recognizedUntil=0;
    this.showGate(this.gate.result(data.decision,pending,performance.now()),data.inferenceMs);
    // A completed inference can capture its confirmation immediately. Recognition
    // must not wait for a throttled animation frame or the display refresh rate.
    this.loop(performance.now());
   });
   await this.openCamera(generation);
   if(generation!==this.generation)return;
   this.frame=requestAnimationFrame(t=>this.loop(t));
  }catch(error){if(generation===this.generation)this.cameraFailure(error);}
 }
 private async openCamera(generation:number){
  const mobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{...(this.deviceId?{deviceId:{exact:this.deviceId}}:{facingMode:{ideal:mobile?'environment':'user'}}),width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:60}}});
  if(generation!==this.generation||!this.running){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.video.srcObject=stream;await this.video.play();if(generation!==this.generation)return;
  stream.getVideoTracks()[0].onended=()=>{if(this.running&&generation===this.generation)this.reconnectCamera();};
  const side=Math.min(this.video.videoWidth,this.video.videoHeight)*.70;
  this.emit({state:this.backgrounded?'background':this.workerReady?'calibrating':'loading',label:this.backgrounded?'Camera remains on':this.workerReady?'Clear the inspection area':'Starting material checks',reason:this.workerReady?'Keep the square empty and still for one second.':'Your preview is live. The smaller material model starts before the packaging model.',roi:{width:side/this.video.videoWidth*100,height:side/this.video.videoHeight*100},cameraName:stream.getVideoTracks()[0].label,rule:'',elapsed:0});
 }
 private reconnectCamera(){
  this.gate.reset();this.baseline=null;this.previous=null;this.pending=null;this.emit({state:'loading',label:'Reconnecting camera',reason:'The device disconnected. DLC is trying to reconnect automatically.',rule:'',elapsed:0});
  if(this.reconnectTimer)return;const generation=this.generation;this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;void this.openCamera(generation).catch(error=>{if(generation!==this.generation||!this.running)return;if((error as DOMException).name==='NotAllowedError'){this.cameraFailure(error);return;}this.reconnectCamera();});},1500);
 }
 private cameraFailure(error:unknown){this.stop(false);this.emit({state:'error',label:'Camera access is unavailable',reason:(error as DOMException).name==='NotAllowedError'?'Camera permission was denied or revoked. Allow the webcam and tap Start.':(error as Error).message||'Reconnect the camera and tap Start.',rule:'',elapsed:0,inferenceMs:0});}
 visibilityChanged(hidden:boolean){
  this.backgrounded=hidden;if(!this.running)return;this.gate.reset();
  if(hidden){this.pending=null;this.lease?.send({type:'idle'});this.emit({state:'background',label:'Camera remains on',reason:'Detection resumes automatically when you return. No green signal is active in the background.',rule:'',elapsed:0});return;}
  if(this.pending)this.pending.watchdogAt=performance.now();
  if(this.video.paused&&this.stream)void this.video.play().catch(()=>{});
  if(this.workerReady&&this.baseline)this.showGate(this.gate.state);else if(this.workerReady)this.calibrate();else this.emit({state:'loading',label:'Detector is preparing',reason:'Camera stays on while the local detector becomes ready.',rule:'',elapsed:0});
 }
 calibrate(){this.baseline=null;this.previous=null;this.stableFrames=0;this.gate.reset();this.emit({state:'calibrating',label:'Clear the inspection area',reason:'Keep the square empty and still for one second. No item should be inside during setup.',rule:'',elapsed:0});}
 private showGate(raw:{state:string;label:string;reason:string;rule?:string;elapsed?:number;confidence?:number},inferenceMs?:number){this.emit({...raw,state:raw.state==='idle'?'ready':raw.state as DlcView['state'],...(typeof inferenceMs==='number'?{inferenceMs}:{})});}
 private loop(now:number){
  if(!this.running)return;cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(t=>this.loop(t));
  if(this.backgrounded||!this.workerReady||this.video.readyState<2||this.video.paused||now-this.lastFrame<90)return;this.lastFrame=now;
  if(this.pending&&now-this.pending.watchdogAt>4500){this.lease?.recover('A material check stalled. Restarting detection while the camera stays open.');return;}
  const w=this.video.videoWidth,h=this.video.videoHeight,side=Math.min(w,h)*.70;if(!side)return;this.context.drawImage(this.video,(w-side)/2,(h-side)/2,side,side,0,0,224,224);const image=this.context.getImageData(0,0,224,224),signature=frameSignature(image.data);this.latest=signature;
  if(!this.baseline){const difference=this.previous?sceneDifference(signature,this.previous):{mean:255};this.stableFrames=difference.mean<5?this.stableFrames+1:0;this.previous=signature;if(this.stableFrames>=10){this.baseline=signature;this.previous=signature;this.showGate(this.gate.reset());}return;}
  const background=sceneDifference(signature,this.baseline),rawPresent=background.mean>12&&background.ratio>.10,change=this.previous?sceneDifference(signature,this.previous):{mean:0,ratio:0};this.previous=signature;
  const changed=change.mean>40&&change.ratio>.65;if(changed){this.recognizedUntil=0;this.visualScene++;}
  const present=rawPresent||this.recognizedUntil>now;
  const state=this.gate.observe({present,changed:present&&changed},now);this.showGate(state);
  if(this.pending||now-this.lastSent<(present?180:500))return;this.lastSent=now;const id=++this.requestId;this.pending={id,scene:this.gate.scene,visualScene:this.visualScene,capturedAt:now,watchdogAt:now,signature};this.lease?.send({type:'frame',...this.pending,pixels:image.data.buffer});
 }
 retryDetector(){this.recognizedUntil=0;this.gate.reset();this.lease?.retry();}
 stop(announce=true){
  this.running=false;this.generation++;cancelAnimationFrame(this.frame);this.lease?.release();this.lease=null;this.workerReady=false;this.pending=null;
  if(this.reconnectTimer)clearTimeout(this.reconnectTimer);this.reconnectTimer=null;
  this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;this.video.srcObject=null;this.gate.reset();
  if(announce)this.emit({state:'paused',label:'Camera stopped by you',reason:'Tap Start to reuse the warmed detector. No item is currently approved.',rule:'',elapsed:0,inferenceMs:0});
 }
 destroy(){this.stop(false);void this.audio?.close();this.audio=null;}
}
