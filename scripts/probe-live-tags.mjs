// Controlled, public-image integration probe. Never prints environment secrets.
import {readFile} from 'node:fs/promises';
import {handleApi} from '../lib/api.js';
try{process.loadEnvFile(new URL('../.env',import.meta.url));}catch{}
const url=process.argv[2]||'https://raw.githubusercontent.com/opensacorg/trash-ai/a11de7cb60bfb21399f64c57e48384a61a5044f7/frontend/public/samples/sample02.jpg';
const bytes=url.startsWith('http')?Buffer.from(await (await fetch(url)).arrayBuffer()):await readFile(url);
const request=new Request('http://localhost/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'live-frame',photo:{mime:'image/jpeg',data:'data:image/jpeg;base64,'+bytes.toString('base64')}})});
const start=Date.now(),response=await handleApi(request,process.env),result=await response.json();
console.log(JSON.stringify({status:response.status,elapsedMs:Date.now()-start,items:result.items?.map(i=>({item:i.item,certain:i.certain})),tagObjects:result.tagObjects,error:result.error}));
