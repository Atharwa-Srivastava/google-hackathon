import test from 'node:test';
import assert from 'node:assert/strict';
import {items,rules,matchItems} from '../dist/catalog.js';
test('141 unique household entries distinguish guide coverage from recognition',()=>{assert.equal(items.length,141);assert.equal(new Set(items.map(i=>i.name)).size,141);for(const item of items){assert.ok(item.family);assert.equal(item.collectionCovered,!!item.rule);if(item.rule)assert.ok(rules.some(r=>r.id===item.rule));}assert.equal(items.filter(i=>i.family==='E-waste and batteries').length,34);});
test('demo examples match the intended item',()=>{for(const name of ['Plastic bottle','Pizza box','Coffee cup','Banana peel'])assert.equal(matchItems(name)[0].name,name);});
test('ambiguous bottle requires clarification',()=>assert.ok(matchItems('a bottle').length>1));
test('unknown items do not invent a category',()=>assert.equal(matchItems('mystery object').length,0));
test('mixed cup rule supports both components',()=>{const r=rules.find(r=>r.id==='R6');assert.match(r.text,/general waste/);assert.match(r.text,/rigid plastic lids/);});
