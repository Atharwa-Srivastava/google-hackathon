export async function captureVideo(video){
 if(!video.videoWidth||!video.videoHeight)throw Error('Camera is still starting. Keep the page open and try again.');
 const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,canvas.width,canvas.height);
 const tiny=document.createElement('canvas');tiny.width=16;tiny.height=16;const tc=tiny.getContext('2d');tc.drawImage(canvas,0,0,16,16);const pixels=tc.getImageData(0,0,16,16).data,hash=[];for(let i=0;i<pixels.length;i+=4)hash.push(Math.round((pixels[i]+pixels[i+1]+pixels[i+2])/3));
 let blob;for(const quality of [.78,.62,.45,.3]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=180*1024)break;}if(!blob||blob.size>180*1024)throw Error('This camera view is too detailed to save. Move closer to a smaller area.');
 return {id:crypto.randomUUID(),date:new Date().toISOString(),blob,hash};
}
