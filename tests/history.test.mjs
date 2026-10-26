import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openRewardsDatabase} from '../lib/rewards-sqlite.js';
import {handleApi} from '../lib/api.js';
test('history belongs to authenticated account, survives logout/reopen, and retries/corrections do not duplicate',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'eco-history-'));let db=openRewardsDatabase(join(folder,'db.sqlite'));
 const call=async(path,token,body)=>{const r=await handleApi(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{REWARDS_DB:db,REWARDS_ADMIN_KEY:'admin'});return {status:r.status,data:await r.json()};};
 try{
 const a=(await call('/api/rewards/accounts','admin',{name:'A'})).data,b=(await call('/api/rewards/accounts','admin',{name:'B'})).data;
 const entry={id:'entry-1',item:'Bottle',source:'photo',userId:b.user.id};
 assert.equal((await call('/api/history',a.token,entry)).status,200);
 assert.equal((await call('/api/history',a.token,entry)).status,200);
 assert.equal((await call('/api/history',a.token)).data.entries.length,1);
 assert.equal((await call('/api/history',b.token)).data.entries.length,0);
 assert.equal((await call('/api/history')).status,401);
 assert.equal((await call('/api/history','invalid')).status,401);
 await call('/api/history',a.token,{...entry,item:'Glass bottle',category:'Glass'});
 await call('/api/history',b.token,{...entry,item:'Paper'});
 db.close();db=openRewardsDatabase(join(folder,'db.sqlite'));
 assert.equal((await call('/api/history',a.token)).data.entries[0].item,'Glass bottle');
 assert.equal((await call('/api/history',b.token)).data.entries[0].item,'Paper');
 assert.equal((await call('/api/rewards/me',a.token)).data.points,0);
 await call('/api/history',a.token,{entries:[{id:'entry-2',item:'Can'},{id:'entry-3',item:'Cardboard'}]});
 const first=(await call('/api/history?limit=1',a.token)).data;
 const second=(await call('/api/history?limit=1&cursor='+encodeURIComponent(first.nextCursor),a.token)).data;
 assert.notEqual(first.entries[0].id,second.entries[0].id);
 assert.equal((await call('/api/history',a.token,{id:'../invalid',item:'x'})).status,400);
 }finally{db.close();await rm(folder,{recursive:true,force:true});}
});
