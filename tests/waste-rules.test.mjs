import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyWasteObject, WASTE_CATEGORIES} from '../dist/waste-rules.js';

test('classifies organic food waste into wet / green bin', () => {
  const result = classifyWasteObject('food waste');
  assert.equal(result.recognized, true);
  assert.equal(result.category, WASTE_CATEGORIES.WET.name);
  assert.equal(result.bin, 'Food Waste Bin');
  assert.equal(result.dustbin, 'Biodegradable');
  assert.equal(result.color, '#22c55e');
  assert.equal(result.icon, '🟢');
});

test('classifies recyclable bottles and cans into dry / blue bin', () => {
  const bottle = classifyWasteObject('clear plastic bottle');
  assert.equal(bottle.recognized, true);
  assert.equal(bottle.category, WASTE_CATEGORIES.DRY_RECYCLABLE.name);
  assert.equal(bottle.dustbin, 'Dry recycling');
  assert.equal(bottle.color, '#3b82f6');

  const can = classifyWasteObject('drink can');
  assert.equal(can.recognized, true);
  assert.equal(can.dustbin, 'Dry recycling');
});

test('classifies electronic items into special hazardous collection', () => {
  const phone = classifyWasteObject('battery');
  assert.equal(phone.recognized, true);
  assert.equal(phone.category, WASTE_CATEGORIES.HAZARDOUS.name);
  assert.equal(phone.dustbin, 'Special collection');
  assert.equal(phone.color, '#ef4444');

  const phoneAlias = classifyWasteObject('battery');
  assert.equal(phoneAlias.recognized, true);
  assert.equal(phoneAlias.category, WASTE_CATEGORIES.HAZARDOUS.name);
  assert.equal(phoneAlias.dustbin, 'Special collection');
  assert.equal(phoneAlias.color, '#ef4444');
});

test('handles case insensitivity and whitespace', () => {
  const res = classifyWasteObject('  FoOd WaStE  ');
  assert.equal(res.recognized, true);
  assert.equal(res.category, WASTE_CATEGORIES.WET.name);
});

test('strictly rejects persons, furniture, animals and background objects', () => {
  for (const nonWaste of ['person', 'chair', 'couch', 'dog', 'dining table', 'car', 'tv']) {
    const res = classifyWasteObject(nonWaste);
    assert.equal(res.recognized, false);
    assert.equal(res.isNonWaste, true);
    assert.equal(res.category, 'Not Waste');
  }
});
