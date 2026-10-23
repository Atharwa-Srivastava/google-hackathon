export async function detectItem(input){
 const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(70000)});
 const data=await response.json();
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Analysis is unavailable. Please try again.');
 return data;
}
