import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const deployment=JSON.parse(await readFile('cloudflare.deploy.json','utf8'));
const built=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
// A separate deployment file preserves the original Sites project identity.
const root=resolve('.');
const config={...built,name:deployment.name,main:resolve('dist/server/index.js'),
 assets:{...built.assets,directory:resolve('dist/client')},
 d1_databases:[{binding:'DB',database_name:deployment.database_name,database_id:deployment.database_id}],
 vars:deployment.backend_url?{WASTEWISE_API_BASE_URL:deployment.backend_url}:{},
 services:[],workers_dev:false,preview_urls:false,
 routes:deployment.domain?[{pattern:deployment.domain,custom_domain:true}]:[],observability:{enabled:false}};
delete config.dev;delete config.build;delete config.topLevelName;
await mkdir('.cloudflare',{recursive:true});
await writeFile('.cloudflare/wrangler.json',JSON.stringify(config,null,2)+'\n');
console.log('Prepared standalone Cloudflare config for '+deployment.name+'; Sites identity unchanged.');
