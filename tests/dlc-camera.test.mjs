import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

test('DLC keeps camera through backgrounding, uncertain checks and model recovery; manual Stop releases it',async()=>{
 const originals=new Map();const set=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 let now=0,raf=null,color=128,stops=0,cameraRequests=0,releases=0,recoveries=0,callback;
 const views=[],sent=[],video={readyState:4,paused:false,videoWidth:640,videoHeight:480,srcObject:null,play:async()=>{video.paused=false;}};
 const track={label:'Test camera',stop(){stops++;},onended:null},stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const runtime={preload(){},acquire(listener){callback=listener;return {send(data){if(data.type==='frame')sent.push(data);},release(){releases++;},recover(reason){recoveries++;callback({type:'restarting',reason});}};}};
 set('__dlcRuntimeFixture',runtime);set('document',{hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(224*224*4).fill(color)})})})});
 set('navigator',{userAgent:'Test laptop',mediaDevices:{getUserMedia:async constraints=>{assert.equal(constraints.audio,false);cameraRequests++;return stream;}}});
 set('Worker',class{});set('OffscreenCanvas',class{});set('window',{});set('performance',{now:()=>now});set('requestAnimationFrame',fn=>{raf=fn;return 1;});set('cancelAnimationFrame',()=>{raf=null;});
 try{
  const compiled=await build({entryPoints:['src/dlc/engine.ts'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'runtime-fixture',setup(b){b.onLoad({filter:/[\\/]dlc-runtime\.js$/},()=>({contents:'export const dlcRuntime=globalThis.__dlcRuntimeFixture;',loader:'js'}));}}]});
  const {DlcEngine}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  const engine=new DlcEngine(video,view=>views.push(view));await engine.start();callback({type:'ready',packagingReady:false,coverage:'Material detector ready'});
  let answered=0;const tick=(amount=100)=>{now+=amount;assert.ok(raf);raf(now);if(color===128&&sent.length>answered){answered=sent.length;callback({type:'result',id:sent.at(-1).id,inferenceMs:10,decision:{state:'idle',label:'Empty view',reason:'Show waste'}});}};for(let i=0;i<12;i++)tick();assert.equal(views.at(-1).state,'ready');assert.equal(views.at(-1).packagingReady,false);
  tick(86400000);assert.equal(stops,0);assert.equal(views.at(-1).state,'ready');
  engine.visibilityChanged(true);assert.equal(stops,0);assert.equal(views.at(-1).state,'background');const beforeBackground=sent.length;tick(10000);assert.equal(sent.length,beforeBackground);engine.visibilityChanged(false);assert.equal(cameraRequests,1);assert.equal(stops,0);
  color=200;const beforeItem=sent.length;tick();assert.equal(sent.length,beforeItem+1);tick(2100);assert.equal(views.at(-1).state,'checking');assert.equal(stops,0);
  tick(2500);assert.equal(recoveries,1);assert.equal(views.at(-1).state,'loading');assert.equal(stops,0);assert.equal(video.srcObject,stream);
  callback({type:'ready',packagingReady:true,coverage:'All local models ready'});tick();assert.equal(cameraRequests,1);
  const beforeConfirmation=sent.length;now+=800;callback({type:'result',id:sent.at(-1).id,inferenceMs:800,decision:{state:'accept',label:'Cardboard',rule:'R2'}});
  assert.equal(sent.length,beforeConfirmation+1,'confirmation must be captured without waiting for another display frame');
  now+=100;callback({type:'result',id:sent.at(-1).id,inferenceMs:100,decision:{state:'accept',label:'Cardboard',rule:'R2'}});assert.equal(views.at(-1).state,'accept');
  const previousCount=views.length;engine.stop();assert.equal(stops,1);assert.equal(releases,1);assert.equal(video.srcObject,null);assert.equal(views.at(-1).state,'paused');
  callback({type:'result',id:sent.at(-1).id,decision:{state:'accept',label:'Old result',rule:'R1'}});assert.equal(views.length,previousCount+1);engine.destroy();assert.equal(stops,1);
 }finally{for(const [key,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
