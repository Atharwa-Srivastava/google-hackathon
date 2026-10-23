export const providers={apinex:{name:'Apinex',base:'https://api.apinex.bond/v1/',model:'gemini/3.8-flash'},google:{name:'Google Gemini',model:'gemini-3.8-flash'}};
export function requestFor({provider,key,model,prompt,photo}){
 if(!providers[provider]||!key||!model)throw Error('Choose a provider, model and API key in AI settings.');
 if(provider==='apinex'){
  const content=[{type:'text',text:prompt}];if(photo)content.push({type:'image_url',image_url:{url:photo.data}});
  return {url:providers.apinex.base+'chat/completions',options:{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}]})}};
 }
 const parts=[{text:prompt}];if(photo)parts.push({inline_data:{mime_type:photo.mime,data:photo.data.split(',')[1]}});
 return {url:'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',options:{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:'application/json'}})}};
}
export async function detectItem(config,fetcher=fetch){
 const {url,options}=requestFor(config);let response;
 try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(60000)});}catch(e){if(e.name==='TimeoutError')throw Error('Analysis timed out. Please try again.');throw Error('Could not reach '+providers[config.provider].name+'. Check your connection and whether the provider allows browser requests.');}
 if(!response.ok)throw Error(response.status===401||response.status===403?'API key rejected. Check the selected provider and key.':response.status===404?'Model not found. Enter the exact model ID from your provider.':response.status===429?'Provider quota or rate limit reached. Please try again later.':'The AI provider returned an error ('+response.status+'). Please try again.');
 const data=await response.json();const text=config.provider==='apinex'?data.choices?.[0]?.message?.content:data.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join('');
 if(typeof text!=='string'||!text.trim())throw Error('No identification returned. Try a clearer photo or description.');
 try{return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw Error('The AI response was unreadable. Please try again.');}
}
