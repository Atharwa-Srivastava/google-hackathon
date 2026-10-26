import './build-ui.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {publicFiles} from './public-files.mjs';
const assets={};for(const file of publicFiles){assets['/'+file]={body:/\.(jpg|onnx)$/.test(file)?(await readFile('dist/'+file)).toString('base64'):await readFile('dist/'+file,'utf8'),encoding:/\.(jpg|onnx)$/.test(file)?'base64':undefined,type:file.endsWith('.onnx')?'application/octet-stream':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'};}
let source='';for(const file of ['dist/waste-rules.js','dist/catalog.js','lib/provider.js','lib/prompt.js','lib/rewards.js','lib/intelligence.js','lib/api.js','worker/index.js'])source+=(await readFile(file,'utf8')).replace(/^import .*?;\r?\n/gm,'').replace(/\bexport /g,'')+'\n';
source+='\nconst assets='+JSON.stringify(assets)+';\nexport default createWorker(assets,handleApi);\n';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Worker with server-only AI and allowlisted public assets.');
