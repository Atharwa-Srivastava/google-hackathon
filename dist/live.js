import {LiveSession,newScan} from './live-session.js';
import {scanStore} from './live-store.js';
import {captureVideo} from './live-capture.js';
import {detectItem} from './ai.js';
import {groupKey,elapsedLabel,mergeObservations} from './live-core.js';
import {validateDetection} from './batch.js';
import {items,rules} from './catalog.js';
import {LiveARDetector} from './live-detector.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initLiveScan({navigate,isReady,onCount}){
 const $=s=>document.querySelector(s),video=$('#liveVideo'),canvas=$('#liveOverlay');let engine=null,stream=null,opening=false,generation=0,records=[],urls=[];
 let arDetector=null,lastTagCount=-1,lastTopLabel='';
 if(canvas&&video){
  arDetector=new LiveARDetector({
   video,
   canvas,
   onDetect:(detected)=>{
    if(stream&&engine?.scan.status==='scanning'){
     $('#liveNow').textContent=detected.length?detected.map(d=>(d.uncertain?'Possible ':'')+d.label+' · '+d.dustbin).join(' | '):'No supported waste visible';
     const catalogMap={'clear plastic bottle':'Plastic bottle','other plastic bottle':'Plastic bottle','glass bottle':'Glass bottle','glass jar':'Glass jar','drink can':'Drink can','food can':'Food tin','paper cup':'Coffee cup','drink carton':'Drink carton','crisp packet':'Snack wrapper','plastic film':'Plastic bag','single-use carrier bag':'Plastic bag','plastic lid':'Plastic lid','battery':'Battery','orange peel':'Orange peel','plastic bottle cap':'Plastic bottle cap','banana peel':'Banana peel','vegetable scraps':'Vegetable scraps','eggshells':'Eggshells','tea leaves':'Tea leaves','corrugated carton':'Cardboard box','cardboard':'Cardboard box','pizza box':'Pizza box','normal paper':'Newspaper','tissues':'Used tissue'};
     if(detected.length){const grouped=new Map();for(const d of detected){const key=(d.catalog||catalogMap[d.rawClass])||d.label;const item=items.find(i=>i.name===(d.catalog||catalogMap[d.rawClass]));const old=grouped.get(key);grouped.set(key,{item:item?.name||null,label:d.label,ruleId:item?.rule||null,certain:!!item&&!d.uncertain,quantity:(old?.quantity||0)+1});}engine.scan.entries=mergeObservations(engine.scan.entries,{items:[...grouped.values()]},engine.scan.dismissed);engine.checkpoint();}
     if(detected.length>0){
      if(detected.length!==lastTagCount){
       $('#liveState').textContent=`AR: ${detected.length} item${detected.length>1?'s':''} tagged`;
       lastTagCount=detected.length;
      }
      const top=detected[0];
      if(top&&top.label!==lastTopLabel){
       $('#liveMessage').textContent=`Visible now: ${top.label} · ${top.dustbin}. ${top.note}`;
       lastTopLabel=top.label;
      }
     }else{
      if(lastTagCount!==0){
       $('#liveState').textContent='LIVE · full-frame scanner active';
       lastTagCount=0;
       lastTopLabel='';$('#liveMessage').textContent='No supported waste is visible. Show the waste closer; people and furniture are ignored.';
      }
     }
    }
   },
   onStatus:(status)=>{
    if(stream&&engine?.scan.status==='scanning'){
     $('#liveState').textContent=status;
     if(status.includes('unavailable')||status.includes('failed'))
      setMessage(status);
    }
   }
  });
 }
 const stopCamera=()=>{generation++;arDetector?.stop();if(canvas)canvas.hidden=true;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;};
 const setMessage=text=>$('#liveMessage').textContent=text;
 const revoke=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];};
 async function refresh(){try{records=(await scanStore.list()).sort((a,b)=>b.date.localeCompare(a.date));onCount(records.length);renderHistory();}catch{$('#scanHistory').innerHTML='<div class="notice">Live scan photo storage is unavailable on this browser. Photo and text sorting still work.</div>';}}
 function connect(scan){const references=new Map();engine=new LiveSession({scan,save:s=>scanStore.save(s),analyze:detectItem,cloudReady:isReady(),capture:async()=>{const reference=arDetector?.reference(),frame=await captureVideo(video);references.set(frame.id,reference);while(references.size>8)references.delete(references.keys().next().value);return frame;},onTags:(objects,id)=>arDetector?.addAssistedTags(objects,references.get(id)),refreshTags:()=>arDetector?.tracker.tracks.some(t=>t.source==='gemini'&&!t.lost&&performance.now()-(t.lastSemantic??t.lastSeen)>8000),stopCamera,onUpdate:render});}
 function render(){const s=engine?.scan,state=s?.status||'idle',working=state==='scanning'||state==='finalizing'||opening;
 if(state!=='scanning'){arDetector?.stop();if(canvas)canvas.hidden=true;}else if(stream&&canvas){canvas.hidden=false;}
 $('#liveStart').hidden=state==='scanning'||state==='finalizing';$('#liveStart').disabled=opening||!!engine?.inFlight;$('#liveStart').textContent=opening?'Opening camera…':s&&state!=='complete'?'Resume scan':'Start scan';
 $('#liveFinish').hidden=!s||state==='complete';$('#liveFinish').disabled=state==='finalizing'||opening;$('#liveFinish').textContent=state==='partial'?'Retry final analysis':state==='finalizing'?'Finishing…':'Finish scan';$('#liveNew').hidden=!s||working;$('#livePause').hidden=state!=='scanning';
 $('#liveState').textContent=state==='scanning'?'LIVE · provisional results':state==='finalizing'?'Combining views':state==='complete'?'Scan complete':state==='partial'?'Partial scan':state==='paused'?'Paused draft':'Ready to scan';$('#liveElapsed').textContent=elapsedLabel(engine?.duration()||0);
 $('#livePlaceholder').hidden=!!stream;video.hidden=!stream;
 setMessage(s?[s.error,s.note,s.saved?'Saved on this device.':'Not yet saved.'].filter(Boolean).join(' '):'Live tags appear after the local model loads. Show the waste closer; saved summaries are checked separately.');
 const target=$('#liveResults');target.innerHTML=s?'<p class="hint">'+s.entries.filter(e=>e.certain).length+' identified groups · quantities are estimates, using the largest count seen in one view.</p>'+(s.incomplete?'<div class="notice">Some objects may be hidden or unclear. This scan may be incomplete.</div>':'')+'<div class="batch-grid">'+s.entries.map((e,i)=>{const rule=e.certain?rules.find(r=>r.id===e.rule):null;return '<article class="batch-card"><span class="badge">'+esc(e.certain?e.category:'Needs a closer look')+'</span><h3>'+esc(e.certain?e.name:e.label)+'</h3><p>'+esc(e.material)+' · estimated '+e.quantity+' visible</p><p>'+esc(e.label)+'</p>'+(e.name==='Coffee cup'?'<p>Cup → General waste<br>Rigid plastic lid → Dry recycling</p>':e.condition==='mixed'?'<p>Clean cardboard → Dry recycling<br>Greasy sections → General waste</p>':'')+(rule?'<div class="rule"><strong>Sample guide · '+esc(rule.id)+'</strong>“'+esc(rule.text)+'”</div>':'<div class="notice">'+esc(e.question)+'</div>')+'<button class="secondary" data-scan-edit="'+i+'" '+(working?'disabled':'')+'>Correct this item</button><button class="text-button" data-scan-remove="'+i+'" '+(working?'disabled':'')+'>Not a waste item</button><div id="scanEditor'+i+'"></div></article>';}).join('')+'</div>':'';
 target.querySelectorAll('[data-scan-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.scanEdit)));target.querySelectorAll('[data-scan-remove]').forEach(b=>b.onclick=async()=>{const entry=s.entries[Number(b.dataset.scanRemove)];s.dismissed.push(groupKey(entry));s.entries=s.entries.filter(e=>e.id!==entry.id);await engine.checkpoint();render();await refresh();});
 revoke();$('#livePhotos').innerHTML=s?.frames.length?'<h3>Selected scan photos · '+s.frames.length+' / 8</h3><p class="hint">First view and seven latest views. Saved locally, not as a video.</p><div class="scan-gallery">'+s.frames.map((f,i)=>{const url=URL.createObjectURL(f.blob);urls.push(url);return '<a href="'+url+'" target="_blank" rel="noopener"><img src="'+url+'" alt="Saved scan view '+(i+1)+'" loading="lazy"></a>';}).join('')+'</div>':'';
 }
 async function start(){if(opening||engine?.inFlight||engine?.scan.status==='finalizing')return; if(!navigator.mediaDevices?.getUserMedia){setMessage('Live camera is not supported here. Use Upload a photo instead.');return;}
 if(!engine||engine.scan.status==='complete')connect(newScan());opening=true;render();const token=++generation;
 try{const camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:960,max:1280},height:{ideal:540,max:720},frameRate:{ideal:60,max:60}},audio:false});if(token!==generation||document.hidden){camera.getTracks().forEach(t=>t.stop());return;}stream=camera;video.srcObject=camera;video.hidden=false;if(canvas)canvas.hidden=false;$('#livePlaceholder').hidden=true;await video.play();if(token!==generation)return;camera.getVideoTracks()[0].onended=()=>engine?.pause('Camera disconnected. Tap Resume or use Upload a photo.');if(await engine.run()){arDetector?.start();engine.step();}}
 catch(e){stopCamera();setMessage(e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser or use Upload a photo.':e.name==='NotFoundError'?'No camera was found. Use Upload a photo instead.':'The camera could not start. Close other camera apps and try again, or upload a photo.');}
 finally{opening=false;renderControlsOnly();}}
 function renderControlsOnly(){$('#liveStart').disabled=!!engine?.inFlight;$('#liveStart').textContent=engine?.scan.status==='paused'?'Resume scan':'Start scan';$('#liveFinish').disabled=engine?.scan.status==='finalizing';}
 async function pause(){if(opening){stopCamera();opening=false;render();}arDetector?.stop();if(canvas)canvas.hidden=true;await engine?.pause();}
 async function finish(){if(!engine)return;arDetector?.stop();if(canvas)canvas.hidden=true;if(engine.scan.frames.length===0){try{const frame=await captureVideo(video);engine.scan.frames=[frame];}catch{}}await engine.finish();await refresh();}
 function edit(index){document.querySelectorAll('[id^=scanEditor]').forEach(el=>el.innerHTML='');const s=engine.scan,e=s.entries[index],editor=$('#scanEditor'+index);editor.innerHTML='<label class="field-label" for="scanItem">Correct item</label><select id="scanItem"><option value="">Choose a match</option>'+items.map(item=>'<option '+(item.name===e.item?'selected':'')+'>'+esc(item.name)+'</option>').join('')+'</select><label class="field-label" for="scanCondition">Pizza box condition, if applicable</label><select id="scanCondition"><option value="">Choose condition</option><option value="clean">Clean and dry</option><option value="greasy">Greasy</option><option value="mixed">Mixed clean and greasy</option></select><button class="primary" id="scanApply">Update result</button><p id="scanEditError" role="status"></p>';
 $('#scanCondition').value=e.condition;$('#scanApply').onclick=async()=>{const item=items.find(i=>i.name===$('#scanItem').value),condition=item?.name==='Pizza box'?$('#scanCondition').value:'';if(!item||(item.name==='Pizza box'&&!condition)){$('#scanEditError').textContent='Confirm the item and any required condition.';return;}const updated={...validateDetection({item:item.name,label:item.name+' · corrected by you',quantity:e.quantity,condition,certain:true,ruleId:condition==='greasy'?'R7':item.rule}),id:e.id,corrected:true,estimated:true};s.dismissed.push(groupKey(e));s.dismissed=s.dismissed.filter(key=>key!==groupKey(updated));const same=s.entries.find(x=>x.id!==e.id&&groupKey(x)===groupKey(updated));if(same)updated.quantity=Math.max(updated.quantity,same.quantity);s.entries=s.entries.filter(x=>x.id!==e.id&&x.id!==same?.id);s.entries.push(updated);await engine.checkpoint();render();await refresh();};}
 function renderHistory(){const host=$('#scanHistory');host.innerHTML=records.length?'<h2>Live scans</h2>'+records.map(s=>'<article class="history-card"><span class="badge">'+esc(['scanning','finalizing'].includes(s.status)?'Interrupted draft':s.status)+'</span><h3>Live scan · '+esc(new Date(s.date).toLocaleString())+'</h3><p>'+s.entries.length+' item groups · '+s.frames.length+' saved photos · '+elapsedLabel(s.elapsed)+'</p><button class="secondary" data-open-scan="'+esc(s.id)+'">'+(s.status==='complete'?'Review scan':'Resume / review scan')+'</button><button class="text-button" data-delete-scan="'+esc(s.id)+'">Delete scan and photos</button></article>').join(''):'';
 host.querySelectorAll('[data-open-scan]').forEach(b=>b.onclick=async()=>{if(engine?.inFlight||engine?.scan.status==='finalizing'){alert('Wait for the current analysis to finish before opening another scan.');return;}await pause();const scan=await scanStore.get(b.dataset.openScan);if(!scan)return;if(['scanning','finalizing'].includes(scan.status))scan.status='paused';connect(scan);navigate();render();});
 host.querySelectorAll('[data-delete-scan]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this scan, results and saved photos from this browser?'))return;if(engine?.scan.id===b.dataset.deleteScan){if(engine.inFlight||engine.scan.status==='finalizing'){alert('Wait for the current analysis to finish before deleting this scan.');return;}await pause();engine=null;render();}try{await scanStore.remove(b.dataset.deleteScan);await refresh();}catch{alert('Could not delete the saved scan. Please try again.');}});}
 $('#liveStart').onclick=start;$('#livePause').onclick=pause;$('#liveFinish').onclick=finish;$('#liveNew').onclick=()=>{if(engine?.inFlight)return;connect(newScan());render();};$('#liveFallback').onclick=()=>{pause();document.querySelector('[data-tab="photo"]').click();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',()=>{stopCamera();engine?.pause('Scan interrupted. Tap Resume to continue.');});
 setInterval(()=>{if(engine?.scan.status==='scanning'){ $('#liveElapsed').textContent=elapsedLabel(engine.duration());engine.step();}},1000);
 render();refresh();return {pause,refresh,get count(){return records.length;}};
}
