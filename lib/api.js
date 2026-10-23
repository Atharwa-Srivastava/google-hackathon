import {detectItem} from './provider.js';
import {sortingPrompt,livePrompt} from './prompt.js';
import {rules,items,matchItems} from '../dist/catalog.js';
import {classifyWasteObject,WASTE_CATEGORIES} from '../dist/waste-rules.js';

const limits=new Map();

function json(value,status=200,extra={}){
  return Response.json(value,{
    status,
    headers:{
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Client, x-api-client, ngrok-skip-browser-warning, Ngrok-Skip-Browser-Warning, *',
      ...extra
    }
  });
}

export function serverConfig(env){
  const provider=env.AI_PROVIDER==='google'?'google':'apinex';
  return {
    provider,
    key:(provider==='google'?env.GOOGLE_API_KEY:env.APINEX_API_KEY)||'',
    model:(provider==='google'?env.GOOGLE_MODEL:env.APINEX_MODEL)||(provider==='google'?'gemini-3.8-flash':'free/gemini-3.8-flash')
  };
}

async function parseBody(request,limit=3000000){
  try{
    const reader=request.body?.getReader();
    if(!reader){
      if(typeof request.text==='function'){
        const text=await request.text();
        return text?JSON.parse(text):null;
      }
      return null;
    }
    let size=0;const chunks=[];
    while(true){
      const part=await reader.read();
      if(part.done)break;
      size+=part.value.byteLength;
      if(size>limit)return {tooLarge:true};
      chunks.push(part.value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const text=new TextDecoder().decode(bytes);
    return text?JSON.parse(text):null;
  }catch{
    return null;
  }
}

export async function handleApi(request,env,fetcher=fetch){
  const url=new URL(request.url),path=url.pathname.replace(/\/+/g, '/').replace(/\/$/, '')||'/',config=serverConfig(env);

  // CORS Preflight
  if(request.method==='OPTIONS'){
    return new Response(null,{
      status:204,
      headers:{
        'Access-Control-Allow-Origin':'*',
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Client, x-api-client, ngrok-skip-browser-warning, Ngrok-Skip-Browser-Warning, *',
        'Access-Control-Max-Age':'86400'
      }
    });
  }

  // 1. Existing Config Check
  if(path==='/api/config'&&request.method==='GET'){
    return json({provider:config.provider,configured:!!config.key});
  }

  // Dashboard endpoint for MotionSites mobile app
  if((path==='/dashboard'||path==='/api/dashboard')&&request.method==='GET'){
    return json({
      status:'success',
      demo:true,
      metrics:{
        itemsSorted: 48,
        recyclingRate: 91.2,
        co2DivertedKg: 16.4,
        activeStreakDays: 8,
        wetWasteKg: 9.2,
        dryRecyclableKg: 6.1
      },
      sparkline: [14, 18, 16, 22, 28, 25, 34, 30, 39, 44, 42, 48],
      feed: [
        { id: '1', title: 'Banana Peel & Apple Core', category: 'Wet Waste', bin: 'Green Bin', time: '5m ago', icon: 'Apple', confidence: 0.98, ruleId: 'R5' },
        { id: '2', title: 'Aluminium Drink Can', category: 'Dry Recycling', bin: 'Blue Bin', time: '22m ago', icon: 'Can', confidence: 0.95, ruleId: 'R3' },
        { id: '3', title: 'Laptop & Old Battery', category: 'Hazardous / E-Waste', bin: 'Special Desk', time: '1h ago', icon: 'Laptop', confidence: 0.99, ruleId: 'R8' },
        { id: '4', title: 'Cardboard Delivery Box', category: 'Dry Recycling', bin: 'Blue Bin', time: '2h ago', icon: 'Package', confidence: 0.94, ruleId: 'R2' },
        { id: '5', title: 'Paper Cup & Plastic Lid', category: 'General Waste', bin: 'Black / Grey Bin', time: '3h ago', icon: 'Coffee', confidence: 0.92, ruleId: 'R6' }
      ]
    });
  }

  // Action submission endpoint for Bottom Sheet / Quick Action
  if((path==='/action'||path==='/api/action')&&request.method==='POST'){
    const body=await parseBody(request);
    const item=String(body?.item||body?.title||'Everyday waste').trim();
    const category=String(body?.category||'Dry Recycling');
    const bin=String(body?.bin||'Blue Bin');
    const newEntry={
      id: crypto.randomUUID().slice(0,8),
      title: item,
      category,
      bin,
      time: 'Just now',
      icon: category.includes('Wet') ? 'Apple' : category.includes('Hazard') ? 'Laptop' : category.includes('General') ? 'Trash2' : 'Recycle',
      confidence: 0.96,
      ruleId: body?.ruleId || 'R1'
    };
    return json({
      success: true,
      demo: true,
      persisted: false,
      message: 'Demo action accepted; no collection or rewards were issued',
      action: newEntry,
      updatedMetrics: {
        itemsSorted: 49,
        recyclingRate: 91.4,
        co2DivertedKg: 16.8
      }
    });
  }

  // 2. Health & API Routes Documentation for Teammates
  if((path==='/api'||path==='/api/'||path==='/api/health'||path==='/api/info'||path==='/api/docs')&&request.method==='GET'){
    return json({
      status:'online',
      name:'WasteWise Universal API',
      version:'1.0.0',
      campus:'Greenfield Campus',
      aiConfigured:!!config.key,
      provider:config.provider,
      endpoints:{
        config:{method:'GET',path:'/api/config',desc:'Check AI configuration status'},
        rules:{method:'GET',path:'/api/rules',desc:'Get all 8 campus disposal rules & bins'},
        catalog:{method:'GET',path:'/api/catalog',desc:'Browse or search 141 supported waste items (?q=...)'},
        classify:{method:'POST',path:'/api/classify',desc:'Instant <1ms rule & bin classifier (body: {text})'},
        analyze:{method:'POST',path:'/api/analyze',desc:'Full Gemini Multimodal AI: photo, live-frame, live-final, text'}
      }
    });
  }

  // 3. Rules Endpoint
  if(path==='/api/rules'&&request.method==='GET'){
    return json({
      campus:'Greenfield Campus',
      version:'1.0',
      rules
    });
  }

  // 4. Catalog Endpoint
  if(path==='/api/catalog'&&request.method==='GET'){
    const q=url.searchParams.get('q')?.toLowerCase()?.trim();
    const family=url.searchParams.get('family');
    let list=items;
    if(family)list=list.filter(i=>i.family===family);
    if(q)list=matchItems(q);
    return json({
      total:list.length,
      items:list.map(i=>({name:i.name,material:i.material,ruleId:i.rule,family:i.family,keywords:i.keywords}))
    });
  }

  // 5. Instant Classify Endpoint (Fast <1ms, zero token cost)
  if(path==='/api/classify'){
    if(request.method!=='POST')return json({error:'Use POST for classification.'},405);
    const body=await parseBody(request);
    if(!body)return json({error:'Provide a valid JSON body with text.'},400);
    const text=String(body?.text||body?.query||body?.item||'').trim();
    if(!text)return json({error:'Provide a text or item to classify.'},400);
    const ruleInfo=classifyWasteObject(text);
    const catalogMatches=matchItems(text);
    const catalogItem=catalogMatches[0]||items.find(i=>i.name.toLowerCase()===text.toLowerCase());
    const rule=catalogItem?.rule?rules.find(r=>r.id===catalogItem.rule):null;
    return json({
      query:text,
      recognized:ruleInfo.recognized||!!catalogItem,
      item:catalogItem?.name||ruleInfo.label,
      category:ruleInfo.category==='WET'?'Wet Waste (Biodegradable)':ruleInfo.category,
      bin:ruleInfo.bin,
      dustbin:ruleInfo.dustbin==='Biodegradable'?'Wet Waste · Green Bin':ruleInfo.dustbin,
      color:ruleInfo.color,
      icon:ruleInfo.icon,
      rule:rule?{id:rule.id,title:rule.title,category:rule.category,text:rule.text}:null,
      tip:ruleInfo.tip||null
    });
  }

  // 6. Deep Multimodal AI Analysis (/api/analyze)
  if(path!=='/api/analyze')return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'Use POST for analysis.'},405);

  const origin=request.headers.get('origin');
  let isOriginAllowed=!origin||origin===url.origin||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if(!isOriginAllowed&&origin){
    try{
      const h=new URL(origin).hostname;
      if(h.endsWith('.ngrok-free.dev')||h.endsWith('.ngrok.app')||/^192\.168\.\d+\.\d+$/.test(h))isOriginAllowed=true;
    }catch{}
  }
  const isAllowed=isOriginAllowed||request.headers.get('x-api-client')||request.headers.get('authorization');
  if(!isAllowed)return json({error:'Cross-site analysis requests are not allowed.'},403);

  if(!config.key)return json({error:'Photo AI is not configured yet. The site owner needs to add the server API key.'},503);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Send a JSON photo or description.'},415);

  const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();
  if(limits.size>2000){for(const [k,v]of limits)if(now-v.start>60000)limits.delete(k);if(limits.size>2000)limits.clear();}
  const counter=limits.get(ip);
  if(counter&&now-counter.start<60000&&counter.count>=12)return json({error:'Too many requests. Wait a minute and try again.'},429);
  limits.set(ip,counter&&now-counter.start<60000?{...counter,count:counter.count+1}:{start:now,count:1});

  if(Number(request.headers.get('content-length'))>3000000)return json({error:'Photo is too large.'},413);
  const body=await parseBody(request,3000000);
  if(body?.tooLarge)return json({error:'Photo is too large.'},413);
  if(!body)return json({error:'Add a photo or description.'},400);

  const description=typeof body?.description==='string'?body.description.trim().slice(0,3000):'';
  const mode=body?.mode||'photo';
  if(!['photo','live-frame','live-final'].includes(mode))return json({error:'Unsupported analysis mode.'},400);

  const images=Array.isArray(body?.photos)?body.photos:body?.photo?[body.photo]:[];
  if(images.length>8||(mode!=='live-final'&&images.length>1))return json({error:'Use one live frame or up to eight final views.'},400);

  for(const image of images){
    const data=image?.data,mime=image?.mime;
    if(typeof data!=='string'||!['image/jpeg','image/png','image/webp'].includes(mime)||!data.startsWith('data:'+mime+';base64,')||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(data))
      return json({error:'Upload a valid JPG, PNG or WEBP photo.'},400);
  }

  if(!description&&!images.length)return json({error:'Add a photo or description first.'},400);
  if(mode.startsWith('live-')&&!images.length)return json({error:'A live scan needs a camera snapshot.'},400);

  const observations=Array.isArray(body?.observations)?body.observations.slice(0,30).map(o=>({item:typeof o?.item==='string'?o.item.slice(0,100):null,label:typeof o?.label==='string'?o.label.slice(0,160):'',condition:['clean','greasy','mixed'].includes(o?.condition)?o.condition:'',quantity:Number.isInteger(o?.quantity)?Math.min(100,Math.max(1,o.quantity)):1,certain:o?.certain===true})):[];

  try{
    return json(await detectItem({...config,prompt:mode==='photo'?sortingPrompt(description,!!images.length):livePrompt(mode,observations),photos:images},fetcher));
  }catch(e){
    return json({error:String(e.message).split(config.key).join('[redacted]')},502);
  }
}
