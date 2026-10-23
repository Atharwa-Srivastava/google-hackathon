import { readFileSync, writeFileSync } from 'node:fs';

let code = readFileSync('dist/app.js', 'utf8');

// 1. Add import
if (!code.includes('sample-dataset.js')) {
  code = code.replace("import {detectItem} from './ai.js';", "import {detectItem} from './ai.js';\r\nimport {DATASET_SAMPLES} from './sample-dataset.js';");
}

// 2. Add activeSample variable
if (!code.includes('activeSample=null')) {
  code = code.replace('batch=null;', 'batch=null,activeSample=null;');
}

// 3. Clear activeSample on custom photo load and remove
code = code.replace("photo={data:prepared,mime:'image/jpeg'};", "activeSample=null;photo={data:prepared,mime:'image/jpeg'};");
code = code.replace("photo=null;$('#photo').value='';", "activeSample=null;photo=null;$('#photo').value='';");

// 4. Fallback in analyze if !key
const noKeySearch = "if(!key){if(tab==='photo'){";
const noKeyRepl = "if(!key){if(tab==='photo'){if(activeSample){const m=items.find(i=>i.name.toLowerCase()===activeSample.name.toLowerCase());if(m){identify(m,'Benchmark demo match · '+activeSample.label);return;}}";
if (code.includes(noKeySearch) && !code.includes('activeSample.label')) {
  code = code.replace(noKeySearch, noKeyRepl);
}

// 5. Append sample chip rendering at bottom of file
const chipScript = `\r\n// Benchmark dataset sample tray\r\nconst sampleChips=$('#sampleChips');if(sampleChips){sampleChips.innerHTML=DATASET_SAMPLES.map((s,idx)=>'<button class="sample-chip" data-sample="'+idx+'" type="button"><img src="'+s.dataUrl+'" alt="'+esc(s.label)+'"><div class="sample-chip-info"><strong>'+s.icon+' '+esc(s.label)+'</strong><small>'+esc(s.bin)+'</small></div></button>').join('');sampleChips.querySelectorAll('[data-sample]').forEach(btn=>{btn.onclick=()=>{const s=DATASET_SAMPLES[Number(btn.dataset.sample)];if(!s||busy)return;view('sort');changeTab('photo');activeSample=s;photo={data:s.dataUrl,mime:'image/jpeg'};$('#preview').src=s.dataUrl;$('#preview').hidden=false;$('#uploadPlaceholder').hidden=true;$('#removePhoto').hidden=false;$('#message').textContent='Analyzing benchmark sample: '+s.label+'…';$('#result').hidden=true;analyze();};});}\r\n`;

if (!code.includes("sampleChips=$('#sampleChips')")) {
  code += chipScript;
}

writeFileSync('dist/app.js', code, 'utf8');
console.log('Successfully patched dist/app.js');
