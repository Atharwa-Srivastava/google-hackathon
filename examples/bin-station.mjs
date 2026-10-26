// Run only on the trusted bin computer/server. Connect these methods to real
// calibrated tracker callbacks; never call deposited() merely on object removal.
export function createBinStation({baseUrl,stationKey}){
 async function event(sessionId,payload){const response=await fetch(baseUrl.replace(/\/$/,'')+'/api/dlc/sessions/'+encodeURIComponent(sessionId)+'/events',{method:'POST',headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true','x-api-client':'wastewise',Authorization:'Bearer '+stationKey},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error),{status:response.status});return data;}
 return {
  observed:(sessionId,{item,category,confidence,eventId=crypto.randomUUID()})=>event(sessionId,{eventId,kind:'item_seen',item,category,confidence,accepted:true}),
  deposited:(sessionId,{eventId=crypto.randomUUID(),crossedDepositLine,clearAfterDeposit})=>event(sessionId,{eventId,kind:'deposit_confirmed',crossedDepositLine,clearAfterDeposit})
 };
}
