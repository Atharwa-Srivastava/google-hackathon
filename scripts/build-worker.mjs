import {readFile,mkdir,writeFile} from 'node:fs/promises';
const publicFiles=['index.html','style.css','app.js','ai.js','batch.js','catalog.js'];
const assets={};for(const file of publicFiles){assets['/'+file]={body:await readFile('dist/'+file,'utf8'),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'};}
let source='';for(const file of ['dist/catalog.js','lib/provider.js','lib/prompt.js','lib/api.js','worker/index.js'])source+=(await readFile(file,'utf8')).replace(/^import .*?;\r?\n/gm,'').replace(/\bexport /g,'')+'\n';
source+='\nconst assets='+JSON.stringify(assets)+';\nexport default createWorker(assets,handleApi);\n';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Worker with server-only AI and allowlisted public assets.');
