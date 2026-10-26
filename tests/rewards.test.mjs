import test from 'node:test';
import assert from 'node:assert/strict';
import {openRewardsDatabase} from '../lib/rewards-sqlite.js';
import {handleApi} from '../lib/api.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('SQLite accounts and ledger survive closing and reopening the database',async()=>{const folder=await mkdtemp(join(tmpdir(),'eco-rewards-')),file=join(folder,'rewards.sqlite');let db=openRewardsDatabase(file);try{await db.prepare('INSERT INTO reward_users VALUES(?,?,?,?)').bind('persisted','Member','hashed-token',1).run();await db.prepare('INSERT INTO reward_ledger VALUES(?,?,?,?,?,?)').bind('credit','session','persisted','bin',10,1).run();db.close();db=openRewardsDatabase(file);assert.equal((await db.prepare('SELECT SUM(points) AS points FROM reward_ledger WHERE user_id=?').bind('persisted').first()).points,10);assert.equal((await db.prepare('SELECT name FROM reward_users WHERE id=?').bind('persisted').first()).name,'Member');}finally{db.close();await rm(folder,{recursive:true,force:true});}});
test('persisted account ledger credits one trusted deposit exactly once and blocks clients, mismatches and expired evidence',async()=>{
 const db=openRewardsDatabase(':memory:'),env={REWARDS_DB:db,REWARDS_ADMIN_KEY:'admin-test'};
 const call=async(path,body,token)=>{const r=await handleApi(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,body:await r.json()};};
 try{
 assert.equal((await call('/api/rewards/accounts',{name:'A'})).status,401);
 const account=(await call('/api/rewards/accounts',{name:'A'},'admin-test')).body;
 const station=(await call('/api/dlc/bins',{name:'Public dry bin',category:'dry'},'admin-test')).body;
 const start=async()=>(await call('/api/dlc/sessions',{binId:station.bin.id},account.token)).body.session;
 const s=await start(),path='/api/dlc/sessions/'+s.id+'/events';
 assert.equal((await call('/api/dlc/sessions',{binId:station.bin.id},account.token)).status,409);
 const seen={eventId:crypto.randomUUID(),kind:'item_seen',item:'Bottle',category:'dry',accepted:true,confidence:.9};
 assert.equal((await call(path,seen,account.token)).status,401);
 assert.equal((await call(path,{...seen,category:'wet'},station.stationKey)).status,422);
 const deposited={eventId:crypto.randomUUID(),kind:'deposit_confirmed',crossedDepositLine:true,clearAfterDeposit:true};
 assert.equal((await call(path,deposited,station.stationKey)).status,422);
 assert.equal((await call(path,seen,station.stationKey)).body.awardedPoints,0);
 const results=await Promise.all([call(path,deposited,station.stationKey),call(path,{...deposited,eventId:crypto.randomUUID()},station.stationKey)]);
 assert.ok(results.some(x=>x.body.status==='credited'));
 assert.equal((await call('/api/rewards/me',null,account.token)).body.points,10);
 assert.equal((await call(path,deposited,station.stationKey)).body.duplicate,true);
 assert.equal((await call('/api/rewards/transactions',null,account.token)).body.transactions.length,1);
 assert.equal((await call('/api/dlc/sessions/'+s.id,null,account.token)).body.session.status,'credited');
 const next=await start();await call('/api/dlc/sessions/'+next.id+'/events',{...seen,eventId:crypto.randomUUID()},station.stationKey);
 await db.prepare('UPDATE reward_events SET created_at=0 WHERE session_id=?').bind(next.id).run();
 assert.equal((await call('/api/dlc/sessions/'+next.id+'/events',{...deposited,eventId:crypto.randomUUID()},station.stationKey)).status,422);
 assert.equal((await call('/api/dlc/sessions/'+next.id+'/cancel',{},account.token)).status,200);
 assert.equal((await call('/api/rewards/me',null,'wrong')).status,401);
 }finally{db.close();}
});
