export const providers={apinex:{name:'Apinex',base:'https://api.apinex.bond/v1/',model:'free/gemini-3.8-flash'},google:{name:'Google Gemini',model:'gemini-3.8-flash'}};
export function requestFor({provider,key,model,prompt,photo,photos}){
 if(!providers[provider]||!key||!model)throw Error('Choose a provider, model and API key in AI settings.');
 const images=photos|| (photo?[photo]:[]);
 if(provider==='apinex'){
  const content=[{type:'text',text:prompt}];for(const image of images)content.push({type:'image_url',image_url:{url:image.data}});
  return {url:providers.apinex.base+'chat/completions',options:{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}]})}};
 }
 const parts=[{text:prompt}];for(const image of images)parts.push({inline_data:{mime_type:image.mime,data:image.data.split(',')[1]}});
 return {url:'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',options:{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:'application/json'}})}};
}
export async function detectItem(config,fetcher=fetch){
 const {url,options}=requestFor(config);let response;
 try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(60000)});}catch(e){if(e.name==='TimeoutError')throw Error('Analysis timed out. Please try again.');throw Error('Could not reach '+providers[config.provider].name+'. Check your connection and the provider’s availability.');}
 if(!response.ok){
 let detail='';try{const raw=await response.text();try{const body=JSON.parse(raw);detail=body.error?.message||body.message||body.detail||body.error?.code||'';}catch{detail=/^\s*</.test(raw)?'':raw;}}catch{}
 if(typeof detail!=='string')detail='';detail=detail.split(config.key).join('[redacted]').replace(/data:image\/[^\s"']+/gi,'[image]').replace(/(?:sk-|AIza)[a-zA-Z0-9_-]+/g,'[redacted]').replace(/<[^>]*>/g,'').slice(0,400);
 const reason=response.status===401||response.status===403?'API key rejected. Check the selected provider and key.':response.status===404?'Model not found. Enter the exact model ID from your provider.':response.status===429?'Provider quota or rate limit reached. Please try again later.':response.status===413?'Photo request is too large. Try a smaller image.':response.status===400?'The provider rejected this request. Check the model ID and its image support.':'The AI provider returned an error.';
 throw Error(providers[config.provider].name+' ('+response.status+'): '+reason+(detail?' Provider says: '+detail:''));
 }
 const data=await response.json();const text=config.provider==='apinex'?data.choices?.[0]?.message?.content:data.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join('');
 if(typeof text!=='string'||!text.trim())throw Error('No identification returned. Try a clearer photo or description.');
 try{return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw Error('The AI response was unreadable. Please try again.');}
}
