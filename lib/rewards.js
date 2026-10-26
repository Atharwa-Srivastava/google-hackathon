// Portable D1/SQLite API. All credits originate from authenticated bin stations.
export const REWARD_SCHEMA=`
CREATE TABLE IF NOT EXISTS reward_users(id TEXT PRIMARY KEY,name TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reward_bins(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,key_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS reward_sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,bin_id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,cancelled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS reward_events(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,kind TEXT NOT NULL,item TEXT NOT NULL,category TEXT NOT NULL,confidence REAL NOT NULL,created_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS one_observation ON reward_events(session_id,kind);
CREATE TABLE IF NOT EXISTS reward_ledger(id TEXT PRIMARY KEY,session_id TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL,bin_id TEXT NOT NULL,points INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS user_ledger ON reward_ledger(user_id,created_at);
CREATE INDEX IF NOT EXISTS active_sessions ON reward_sessions(bin_id,expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_bin ON reward_sessions(bin_id) WHERE cancelled=0;
CREATE TABLE IF NOT EXISTS user_history(id TEXT NOT NULL,user_id TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,id));
CREATE INDEX IF NOT EXISTS history_by_user ON user_history(user_id,created_at DESC,id DESC);
`;
const categories=['dry','wet','general','hazardous','glass'];
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const secret=()=>crypto.randomUUID()+crypto.randomUUID();
export async function handleRewards(request,env){
 const path=new URL(request.url).pathname;if(path!=='/api/history'&&!path.startsWith('/api/rewards')&&!path.startsWith('/api/dlc'))return null;
 const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Client, ngrok-skip-browser-warning'}});
 if(request.method==='OPTIONS')return response(null,200);
 const db=env.REWARDS_DB;if(!db)return response({error:'Rewards storage is not configured on this server.'},503);
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
 const first=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const run=(sql,...args)=>db.prepare(sql).bind(...args).run();
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const user=async()=>{const found=await first('SELECT id,name FROM reward_users WHERE token_hash=?',await digest(bearer));if(!bearer||!found)fail('Account token required',401);return found;};
 const admin=()=>{if(!env.REWARDS_ADMIN_KEY||bearer!==env.REWARDS_ADMIN_KEY)fail('Admin credential required',401);};
 try{
  let body={};if(request.method==='POST'){const reader=request.body?.getReader();let size=0,parts=[];if(reader)while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>16000){await reader.cancel();fail('Request too large',413);}parts.push(p.value);}try{body=JSON.parse(new TextDecoder().decode(Uint8Array.from(parts.flatMap(p=>Array.from(p)))));}catch{fail('Valid JSON required');}if(!body||Array.isArray(body)||typeof body!=='object')fail('JSON object required');}
  const now=Date.now();
  if(path==='/api/history'){
   const u=await user();
   if(request.method==='GET'){
    const params=new URL(request.url).searchParams,limit=Math.min(100,Math.max(1,Number(params.get('limit'))||50));let at=Number.MAX_SAFE_INTEGER,id='~';
    if(params.has('cursor')){const parts=params.get('cursor').split(':');at=Number(parts[0]);id=parts[1];if(!Number.isSafeInteger(at)||at<0||!id||!/^[\w-]{1,100}$/.test(id))fail('Invalid history cursor');}
    const rows=await all('SELECT * FROM user_history WHERE user_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?',u.id,at,at,id,Math.floor(limit)+1);
    const more=rows.length>limit,list=rows.slice(0,limit),last=list.at(-1);
    return response({userId:u.id,entries:list.map(row=>({id:row.id,...JSON.parse(row.payload),createdAt:row.created_at,updatedAt:row.updated_at})),nextCursor:more?last.created_at+':'+last.id:null});
   }
   if(request.method==='POST'){
    const entries=body.entries===undefined?[body]:body.entries;if(!Array.isArray(entries)||!entries.length||entries.length>30)fail('Send one entry or 1–30 entries');
    const clean=entries.map(entry=>{if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!/^[\w-]{1,100}$/.test(entry.id))fail('Each entry needs a stable id (use crypto.randomUUID)');if(typeof entry.item!=='string'||!entry.item.trim()||entry.item.length>160)fail('Each entry needs an item name (max 160 characters)');const payload={item:entry.item.trim(),source:['photo','text','live','dlc'].includes(entry.source)?entry.source:'text',quantity:Number.isInteger(entry.quantity)&&entry.quantity>0?Math.min(entry.quantity,100):1};for(const key of ['material','category','bin','ruleId','guideVersion','preparation','quotation','condition','notes','scanId'])if(entry[key]!==undefined){if(typeof entry[key]!=='string'||entry[key].length>2000)fail('Invalid '+key);payload[key]=entry[key];}return {id:entry.id,payload:JSON.stringify(payload)};});
    // User ID is always resolved from authentication, never accepted from the body.
    for(const entry of clean)await run('INSERT INTO user_history(id,user_id,payload,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',entry.id,u.id,entry.payload,now,now);
    return response({saved:true,userId:u.id,ids:clean.map(entry=>entry.id)});
   }
   return response({error:'Use GET or POST for history'},405);
  }
  if(path==='/api/rewards/accounts'&&request.method==='POST'){
   admin();const name=typeof body.name==='string'?body.name.trim().slice(0,80):'';if(!name)fail('Name required');const id=crypto.randomUUID(),token=secret();await run('INSERT INTO reward_users VALUES(?,?,?,?)',id,name,await digest(token),now);return response({user:{id,name},token,points:0},201);
  }
  if(path==='/api/rewards/me'&&request.method==='GET'){const u=await user();const balance=await first('SELECT COALESCE(SUM(points),0) AS points,COUNT(*) AS deposits FROM reward_ledger WHERE user_id=?',u.id);return response({user:u,...balance});}
  if(path==='/api/rewards/transactions'&&request.method==='GET'){const u=await user(),before=Number(new URL(request.url).searchParams.get('before'))||now+1;return response({transactions:await all('SELECT * FROM reward_ledger WHERE user_id=? AND created_at<? ORDER BY created_at DESC LIMIT 50',u.id,before)});}
  if(path==='/api/dlc/bins'&&request.method==='POST'){admin();if(!categories.includes(body.category))fail('Invalid bin category');if(typeof body.name!=='string'||!body.name.trim())fail('Bin name required');const id=crypto.randomUUID(),stationKey=secret();await run('INSERT INTO reward_bins(id,name,category,key_hash) VALUES(?,?,?,?)',id,body.name.trim().slice(0,80),body.category,await digest(stationKey));return response({bin:{id,name:body.name,category:body.category},stationKey},201);}
  if(path==='/api/dlc/bins'&&request.method==='GET')return response({bins:await all('SELECT id,name,category FROM reward_bins WHERE active=1')});
  if(path==='/api/dlc/sessions'&&request.method==='POST'){
   const u=await user(),bin=await first('SELECT id FROM reward_bins WHERE id=? AND active=1',String(body.binId||''));if(!bin)fail('Unknown bin',404);
   await run('UPDATE reward_sessions SET cancelled=1 WHERE expires_at<=? AND cancelled=0',now);
   const id=crypto.randomUUID(),expiresAt=now+120000;
   try{await run('INSERT INTO reward_sessions(id,user_id,bin_id,created_at,expires_at) VALUES(?,?,?,?,?)',id,u.id,bin.id,now,expiresAt);}catch(e){if(/UNIQUE/.test(e.message))fail('Bin already has an active session. Finish it or wait two minutes.',409);throw e;}
   return response({session:{id,binId:bin.id,expiresAt,status:'awaiting_item'},pointsPerDeposit:10},201);
  }
  const route=path.match(/^\/api\/dlc\/sessions\/([\w-]+)(?:\/(events|cancel))?$/);
  if(route){const session=await first('SELECT * FROM reward_sessions WHERE id=?',route[1]);if(!session)fail('Session not found',404);
   if(request.method==='GET'&&!route[2]){const u=await user();if(u.id!==session.user_id)fail('Session does not belong to this account',403);const credit=await first('SELECT points FROM reward_ledger WHERE session_id=?',session.id);return response({session:{id:session.id,binId:session.bin_id,expiresAt:session.expires_at,status:credit?'credited':session.cancelled?'cancelled':now>=session.expires_at?'expired':(await first("SELECT id FROM reward_events WHERE session_id=? AND kind='item_seen'",session.id))?'awaiting_deposit':'awaiting_item'},awardedPoints:credit?.points||0});}
   if(request.method==='POST'&&route[2]==='cancel'){const u=await user();if(u.id!==session.user_id)fail('Forbidden',403);await run('UPDATE reward_sessions SET cancelled=1 WHERE id=?',session.id);return response({cancelled:true});}
   if(request.method==='POST'&&route[2]==='events'){
    const bin=await first('SELECT * FROM reward_bins WHERE id=? AND active=1',session.bin_id);if(!bin||!bearer||await digest(bearer)!==bin.key_hash)fail('Authenticated bin station required',401);
    if(typeof body.eventId!=='string'||!/^[\w-]{8,100}$/.test(body.eventId))fail('Unique eventId required');
    const previous=await first('SELECT * FROM reward_events WHERE id=?',body.eventId);if(previous){if(previous.session_id!==session.id||previous.kind!==body.kind)fail('Event ID already used',409);const credit=await first('SELECT points FROM reward_ledger WHERE session_id=?',session.id);return response({duplicate:true,awardedPoints:credit?.points||0});}
    if(session.cancelled||now>=session.expires_at){const credited=await first('SELECT points FROM reward_ledger WHERE session_id=?',session.id);if(credited&&body.kind==='deposit_confirmed')return response({duplicate:true,awardedPoints:credited.points});fail('Session ended or expired',409);}
    if(body.kind==='item_seen'){
     if(body.category!==bin.category||!Number.isFinite(body.confidence)||body.confidence<.8||body.confidence>1||typeof body.item!=='string'||!body.item.trim()||body.accepted!==true)fail('Clear accepted waste matching this bin is required',422);
     await run('INSERT INTO reward_events VALUES(?,?,?,?,?,?,?)',body.eventId,session.id,body.kind,body.item.slice(0,100),bin.category,body.confidence,now);return response({status:'awaiting_deposit',awardedPoints:0});
    }
    if(body.kind!=='deposit_confirmed'||body.crossedDepositLine!==true||body.clearAfterDeposit!==true)fail('Camera crossing and clear-after evidence required',422);
    const seen=await first("SELECT * FROM reward_events WHERE session_id=? AND kind='item_seen'",session.id);if(!seen||now-seen.created_at>15000)fail('Fresh accepted-item observation required (15 seconds)',422);
    // Single atomic SQL statement enforces session lifecycle, event uniqueness and
    // one credit per session even under concurrent camera requests.
    const result=await run(`INSERT OR IGNORE INTO reward_ledger(id,session_id,user_id,bin_id,points,created_at)
     SELECT ?,id,user_id,bin_id,10,? FROM reward_sessions WHERE id=? AND cancelled=0 AND expires_at>?`,crypto.randomUUID(),now,session.id,now);
    await run('INSERT OR IGNORE INTO reward_events VALUES(?,?,?,?,?,?,?)',body.eventId,session.id,body.kind,seen.item,bin.category,seen.confidence,now);
    await run('UPDATE reward_sessions SET cancelled=1 WHERE id=?',session.id);
    return response({status:'credited',awardedPoints:10,newCredit:!!result.meta?.changes,verification:'trusted-camera-attestation'});
   }
  }
  return response({error:'Unknown endpoint or method'},404);
 }catch(e){return response({error:e.status?e.message:'Rewards operation failed'},e.status||500);}
}
