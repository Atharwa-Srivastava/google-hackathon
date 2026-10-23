import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWasteModel} from '../dist/waste-model.js';
test('adapter retains real-photo confidence levels that previously produced no tags',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 let disposed=0;
 const input={div(){return this;},expandDims(){return this;},dispose(){disposed++;}};
 globalThis.window={tf:{setBackend:async()=>{},ready:async()=>{},tidy:fn=>fn(),image:{resizeBilinear:()=>input},browser:{fromPixels:()=>input},dispose:()=>disposed++,loadGraphModel:async()=>({executeAsync:async()=>[
 [.1,.2,.4,.6,.5,.2,.8,.7,.1,.1,.2,.2],[.508,.429,.29],[12,20,12],[3]
 ].map(values=>({data:async()=>new Float32Array(values)}))})}};
 globalThis.fetch=async()=>Response.json({'12':'Drink can','20':'Paper cup'});
 try {const model=await loadWasteModel();const result=await model.detect({width:640,height:480});assert.deepEqual(result.map(r=>r.class),['Drink can','Paper cup','Drink can']);assert.ok(result[2].score<.3);assert.equal(disposed,2);assert.ok(result.every(r=>r.bbox[2]>0&&r.bbox[3]>0));}
 finally {globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});
