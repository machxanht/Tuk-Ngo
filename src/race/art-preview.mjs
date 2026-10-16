export function saveCanvas(canvas,name){canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
export function recordCanvas(canvas,name){
 if(!canvas.captureStream||!globalThis.MediaRecorder)throw Error('Trình duyệt này chưa hỗ trợ xuất clip.');
 const stream=canvas.captureStream(30),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
 const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
 if(!mimeType){stream.getTracks().forEach(track=>track.stop());throw Error('Trình duyệt này chưa hỗ trợ xuất WebM.');}
 return new Promise((resolve,reject)=>{
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:3000000}),chunks=[];
  const timer=setTimeout(()=>recorder.stop(),10000);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=e=>{clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());reject(Error(e.error?.message||'Không ghi được clip.'));};
  recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());const url=URL.createObjectURL(new Blob(chunks,{type:mimeType})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);resolve();};
  recorder.start();
 });
}
