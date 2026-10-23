import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/catalog.js':'catalog.js'};
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(new URL('./dist/'+file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'});res.end(body);}catch{res.writeHead(500);res.end('Unable to load app');}}).listen(4173,'127.0.0.1',()=>console.log('WasteWise available at http://127.0.0.1:4173'));
