import {detectItem} from './provider.js';
import {sortingPrompt} from './prompt.js';
const limits=new Map();
function json(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function serverConfig(env){const provider=env.AI_PROVIDER==='google'?'google':'apinex';return {provider,key:(provider==='google'?env.GOOGLE_API_KEY:env.APINEX_API_KEY)||'',model:(provider==='google'?env.GOOGLE_MODEL:env.APINEX_MODEL)||(provider==='google'?'gemini-3.8-flash':'free/gemini-3.8-flash')};}
export async function handleApi(request,env,fetcher=fetch){
 const path=new URL(request.url).pathname,config=serverConfig(env);
 if(path==='/api/config'&&request.method==='GET')return json({provider:config.provider,configured:!!config.key});
 if(path!=='/api/analyze')return json({error:'Not found'},404);
 if(request.method!=='POST')return json({error:'Use POST for analysis.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Cross-site analysis requests are not allowed.'},403);
 if(!config.key)return json({error:'Photo AI is not configured yet. The site owner needs to add the server API key.'},503);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Send a JSON photo or description.'},415);
 const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();if(limits.size>2000){for(const [k,v]of limits)if(now-v.start>60000)limits.delete(k);if(limits.size>2000)limits.clear();}
 const counter=limits.get(ip);if(counter&&now-counter.start<60000&&counter.count>=12)return json({error:'Too many requests. Wait a minute and try again.'},429);limits.set(ip,counter&&now-counter.start<60000?{...counter,count:counter.count+1}:{start:now,count:1});
 let body;try{if(Number(request.headers.get('content-length'))>3000000)return json({error:'Photo is too large.'},413);const reader=request.body?.getReader();if(!reader)return json({error:'Add a photo or description.'},400);let size=0;const chunks=[];while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>3000000){await reader.cancel();return json({error:'Photo is too large.'},413);}chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}body=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid request.'},400);}
 const description=typeof body?.description==='string'?body.description.trim().slice(0,3000):'';let photo=null;
 if(body?.photo){const data=body.photo.data,mime=body.photo.mime;if(typeof data!=='string'||!['image/jpeg','image/png','image/webp'].includes(mime)||!data.startsWith('data:'+mime+';base64,')||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(data))return json({error:'Upload a valid JPG, PNG or WEBP photo.'},400);photo={data,mime};}
 if(!description&&!photo)return json({error:'Add a photo or description first.'},400);
 try{return json(await detectItem({...config,prompt:sortingPrompt(description,!!photo),photo},fetcher));}catch(e){return json({error:String(e.message).split(config.key).join('[redacted]')},502);}
}
