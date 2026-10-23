import { readFileSync, writeFileSync } from 'node:fs';

let liveCode = readFileSync('dist/live.js', 'utf8');

liveCode = liveCode.replace(
  "d.label+' · '+d.dustbin).join(' | ')",
  "d.label+' · '+(d.dustbin==='Biodegradable'?'Wet Waste · Green Bin':d.dustbin)).join(' | ')"
);

liveCode = liveCode.replace(
  "'tissues':'Used tissue'}",
  "'tissues':'Used tissue','wet waste':'Vegetable scraps','organic waste':'Vegetable scraps','kitchen waste':'Vegetable scraps','food waste':'Vegetable scraps'}"
);

liveCode = liveCode.replace(
  "`Visible now: ${top.label} · ${top.dustbin}. ${top.note}`",
  "`Visible now: ${top.label} · ${top.dustbin==='Biodegradable'?'Wet Waste (Green Bin)':top.dustbin}. ${top.note}`"
);

writeFileSync('dist/live.js', liveCode, 'utf8');
console.log('Successfully patched dist/live.js');
