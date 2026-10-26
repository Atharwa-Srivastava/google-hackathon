import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {openRewardsDatabase} from '../lib/rewards-sqlite.js';
import {handleRewards} from '../lib/rewards.js';
let content='';try{content=await readFile('.env','utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
let key=content.match(/^REWARDS_ADMIN_KEY=(.+)$/m)?.[1]?.trim();if(!key){key=randomBytes(32).toString('hex');content=content.replace(/^REWARDS_ADMIN_KEY=.*$/m,'');await writeFile('.env',content+'\nREWARDS_ADMIN_KEY='+key+'\n');}
try{process.loadEnvFile('.env');}catch{}
const db=openRewardsDatabase(process.env.REWARDS_DB_PATH||'data/private/rewards.sqlite');
try{const output='data/private/rewards-onboarding.json';try{await readFile(output);console.log('Rewards already initialized. Credentials remain in '+output);process.exitCode=0;}catch{
 const env={REWARDS_ADMIN_KEY:key,REWARDS_DB:db};const create=async(path,body)=>{const r=await handleRewards(new Request('http://localhost'+path,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body)}),env);if(!r.ok)throw Error('Provisioning failed');return r.json();};
 const account=await create('/api/rewards/accounts',{name:'Demo member'}),station=await create('/api/dlc/bins',{name:'Campus dry recycling bin',category:'dry'});await mkdir('data/private',{recursive:true});await writeFile(output,JSON.stringify({account,station},null,2));console.log('Rewards database initialized. Private demo credentials: '+output);
 }}finally{db.close();}
