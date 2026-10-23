import './build-ui.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const publicFiles=['index.html','brag-reel.html','wastewise_ar_scanner_hero.jpg','wastewise_verified_collection_handover.jpg','studio.js','studio.css','style.css','app.js','ai.js','batch.js','catalog.js','management.js','live.js','live-core.js','live-store.js','live-session.js','live-capture.js','waste-rules.js','live-detector.js','waste-model.js','object-tracker.js','visual-motion.js','live-tags.js','vision-worker.js','vision-client.js','sample-dataset.js'];
const assets={};for(const file of publicFiles){assets['/'+file]={body:file.endsWith('.jpg')?(await readFile('dist/'+file)).toString('base64'):await readFile('dist/'+file,'utf8'),encoding:file.endsWith('.jpg')?'base64':undefined,type:file.endsWith('.jpg')?'image/jpeg':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'};}
let source='';for(const file of ['dist/waste-rules.js','dist/catalog.js','lib/provider.js','lib/prompt.js','lib/api.js','worker/index.js'])source+=(await readFile(file,'utf8')).replace(/^import .*?;\r?\n/gm,'').replace(/\bexport /g,'')+'\n';
source+='\nconst assets='+JSON.stringify(assets)+';\nexport default createWorker(assets,handleApi);\n';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Worker with server-only AI and allowlisted public assets.');
