// Public, pinned model bytes only. Storage denial never prevents inference.
{
 const originalFetch=self.fetch.bind(self),cacheName='eco-dlc-assets-ort1.20.1-tacoa11de7c-v1';
 self.fetch=async(input,options)=>{
  const url=new URL(typeof input==='string'?input:input.url,self.location.href),method=options?.method||input.method||'GET';
  const allowed=url.origin===self.location.origin&&method==='GET'&&(/^\/dlc-(backbone|face|palm)\.onnx$/.test(url.pathname)||url.pathname.startsWith('/vision/dlc/')||url.pathname.startsWith('/vision/model/'));
  if(!allowed||!self.caches)return originalFetch(input,options);
  let cache;try{cache=await caches.open(cacheName);const hit=await cache.match(url.href);if(hit)return hit;}catch{}
  const response=await originalFetch(input,options);if(response.ok&&cache)void cache.put(url.href,response.clone()).catch(()=>{});return response;
 };
}
