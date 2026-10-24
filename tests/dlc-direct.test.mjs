import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDlcScene,selectDlcTarget,canReusePackaging} from '../dist/dlc-core.js';
test('live detector bottle, can and cardboard evidence does not require a second material classifier to agree',()=>{for(const label of ['Clear plastic bottle','Food Can','Corrugated carton']){const target=selectDlcTarget([{class:label,score:.8,bbox:[.2,.2,.3,.5]}]);assert.equal(resolveDlcScene({material:'glass',confidence:.6},target).state,'accept');}});
test('ordinary movement preserves object evidence; substantial scene replacement does not',()=>{const cache={scene:1,capturedAt:100,signature:[100,100,100]};assert.equal(canReusePackaging(cache,{scene:1,capturedAt:400,signature:[120,120,120]}),true);assert.equal(canReusePackaging(cache,{scene:1,capturedAt:400,signature:[200,200,200]}),false);});
test('people cannot become a dry object from their class name',()=>{assert.equal(selectDlcTarget([{class:'person',score:.99,bbox:[.1,.1,.5,.5]}]),null);});
