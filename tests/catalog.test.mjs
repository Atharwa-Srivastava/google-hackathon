import test from 'node:test';
import assert from 'node:assert/strict';
import {items,rules,matchItems} from '../dist/catalog.js';
test('20 supported items all cite a real rule',()=>{assert.equal(items.length,20);for(const item of items)assert.ok(rules.some(r=>r.id===item.rule));});
test('demo examples match the intended item',()=>{for(const name of ['Plastic bottle','Pizza box','Coffee cup','Banana peel'])assert.equal(matchItems(name)[0].name,name);});
test('ambiguous bottle requires clarification',()=>assert.ok(matchItems('a bottle').length>1));
test('unknown items do not invent a category',()=>assert.equal(matchItems('mystery object').length,0));
test('mixed cup rule supports both components',()=>{const r=rules.find(r=>r.id==='R6');assert.match(r.text,/general waste/);assert.match(r.text,/rigid plastic lids/);});
