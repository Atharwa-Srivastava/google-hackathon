export function iou(a,b){const w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])),h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return w*h/(a[2]*a[3]+b[2]*b[3]-w*h||1);}
export function coverBox(box,sourceWidth,sourceHeight,width,height){const scale=Math.max(width/sourceWidth,height/sourceHeight);return [box[0]*scale+(width-sourceWidth*scale)/2,box[1]*scale+(height-sourceHeight*scale)/2,box[2]*scale,box[3]*scale];}
export class ObjectTracker{
 constructor(){this.tracks=[];this.nextId=1;}
 update(detections,now){const matched=new Set(),pairs=[];
 for(let d=0;d<detections.length;d++)for(const t of this.tracks){if(t.key!==detections[d].key)continue;const b=detections[d].bbox,overlap=iou(t.target,b),distance=Math.hypot(t.target[0]+t.target[2]/2-b[0]-b[2]/2,t.target[1]+t.target[3]/2-b[1]-b[3]/2);if(overlap>.12||distance<Math.min(t.target[2],t.target[3],b[2],b[3])*.55)pairs.push({d,t,cost:1-overlap+distance/Math.max(b[2],b[3],1)*.2});}
 const used=new Set();for(const p of pairs.sort((a,b)=>a.cost-b.cost)){if(used.has(p.d)||matched.has(p.t.id))continue;const d=detections[p.d];Object.assign(p.t,{target:[...d.bbox],info:d.info,score:d.score,lastSeen:now,visible:true,hits:p.t.hits+1});used.add(p.d);matched.add(p.t.id);}
 detections.forEach((d,index)=>{if(used.has(index))return;const t={id:this.nextId++,key:d.key,info:d.info,score:d.score,box:[...d.bbox],target:[...d.bbox],lastSeen:now,hits:1,visible:true};this.tracks.push(t);matched.add(t.id);});
 for(const t of this.tracks)if(!matched.has(t.id))t.visible=false;
 this.tracks=this.tracks.filter(t=>now-t.lastSeen<700);return this.visible(now);
 }
 visible(now){return this.tracks.filter(t=>t.visible&&t.hits>=2&&now-t.lastSeen<500);}
 smooth(dt=16.7){const alpha=1-Math.exp(-Math.min(dt,100)/40);for(const t of this.tracks)for(let i=0;i<4;i++)t.box[i]+=(t.target[i]-t.box[i])*alpha;}
 clear(){this.tracks=[];}
}
