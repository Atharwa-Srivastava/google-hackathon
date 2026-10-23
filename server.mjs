import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createWorker} from './worker/index.js';
import {handleApi} from './lib/api.js';
try{process.loadEnvFile(new URL('./.env',import.meta.url));}catch(e){if(e.code!=='ENOENT')throw e;}
const assets={};for(const file of ['index.html','style.css','app.js','ai.js','batch.js','catalog.js','live.js','live-core.js','live-store.js','live-session.js','live-capture.js','waste-rules.js','live-detector.js','waste-model.js','object-tracker.js'])assets['/'+file]={body:await readFile(new URL('./dist/'+file,import.meta.url),'utf8'),type:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'};
const worker=createWorker(assets,handleApi);
http.createServer(async(req,res)=>{try{const options={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){options.body=req;options.duplex='half';}const host=req.headers['x-forwarded-host']||req.headers.host||'127.0.0.1:4173';const proto=req.headers['x-forwarded-proto']||'http';const request=new Request(proto+'://'+host+req.url,options);const response=await worker.fetch(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Server unavailable.');}}).listen(4173,'127.0.0.1',()=>console.log('WasteWise available at http://127.0.0.1:4173'));
