import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('dist/dlc-assets.js','utf8');
test('DLC persists only public model bytes and keys backbone cache entries by checksum',async()=>{
 const stored=new Map();let network=0;const caches={open:async()=>({match:async key=>stored.get(key)?.clone(),put:async(key,value)=>{stored.set(key,value);}})},self={location:{href:'https://eco.test/dlc-worker.js',origin:'https://eco.test'},caches,fetch:async()=>{network++;return new Response('model-'+network);}};
 vm.runInNewContext(source,{self,caches,URL});
 assert.equal(await (await self.fetch('/dlc-backbone.onnx?sha=one')).text(),'model-1');
 assert.equal(await (await self.fetch('/dlc-backbone.onnx?sha=one')).text(),'model-1');assert.equal(network,1);
 await self.fetch('/dlc-backbone.onnx?sha=two');assert.equal(network,2);
 for(const url of ['/api/config','/api/analyze','/dlc-head.json','https://other.test/model'])await self.fetch(url);
 assert.equal(stored.size,2);assert.equal(network,6);
});
test('denied model cache falls back to the network without interrupting startup',async()=>{let calls=0;const caches={open:async()=>{throw Error('Quota / storage denied');}},self={location:{href:'https://eco.test/dlc-worker.js',origin:'https://eco.test'},caches,fetch:async()=>{calls++;return new Response('valid model');}};vm.runInNewContext(source,{self,caches,URL});assert.equal(await(await self.fetch('/vision/model/model.json')).text(),'valid model');assert.equal(calls,1);});
