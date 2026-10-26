// User-facing client only. Never put bin station/admin credentials in this client.
export function createRewardsClient(baseUrl:string,getToken:()=>string){
 const base=baseUrl.replace(/\/$/,'');
 async function request(path:string,body?:unknown){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true','x-api-client':'wastewise',Authorization:'Bearer '+getToken()},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000)});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Rewards request failed'),{status:response.status});return data;}
 return {balance:()=>request('/api/rewards/me'),transactions:(before?:number)=>request('/api/rewards/transactions'+(before?'?before='+before:'')),bins:()=>request('/api/dlc/bins'),startSession:(binId:string)=>request('/api/dlc/sessions',{binId}),session:(id:string)=>request('/api/dlc/sessions/'+encodeURIComponent(id)),cancelSession:(id:string)=>request('/api/dlc/sessions/'+encodeURIComponent(id)+'/cancel',{})};
}
