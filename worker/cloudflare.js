import {handleApi} from '../lib/api.js';
import {REWARD_SCHEMA} from '../lib/rewards.js';
import {visionAsset} from './index.js';

// Binary models are static assets, keeping the Worker within free bundle limits.
const ready = new WeakMap();
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path.startsWith('/vision/'))return visionAsset(path);
  if(path==='/api'||path.startsWith('/api/')||path==='/dashboard'||path==='/action'){
   if(env.REWARDS_DB&&(path==='/api/history'||path.startsWith('/api/rewards')||path.startsWith('/api/dlc'))){
    let init=ready.get(env.REWARDS_DB);
    if(!init){init=env.REWARDS_DB.exec(REWARD_SCHEMA).catch(e=>{ready.delete(env.REWARDS_DB);throw e;});ready.set(env.REWARDS_DB,init);}
    try{await init;}catch{return Response.json({error:'Account storage initialization failed.'},{status:503});}
   }
   return handleApi(request,env);
  }
  return env.ASSETS.fetch(request);
 }
};
