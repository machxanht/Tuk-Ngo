// Bound inactivity, not total transfer time: a slow but progressing connection
// must still finish. Retry bypasses a stalled cached response for this asset.
export async function assetBytes(url,{attempts=3,stallMs=25000,onRetry=()=>{},fetcher=fetch}={}){
 let last;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();let timer;
  const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new Error('Asset transfer stopped progressing')),stallMs);};
  try{
   let target=url;if(attempt){const retry=new URL(url,globalThis.location?.href||'http://localhost/');retry.searchParams.set('asset-retry',String(attempt));target=retry.href;}
   arm();const response=await fetcher(target,{signal:controller.signal,cache:attempt?'reload':'default'});arm();
   if(!response.ok)throw Error('Asset HTTP '+response.status);
   if(!response.body?.getReader)return await response.arrayBuffer();
   const reader=response.body.getReader(),chunks=[];let length=0;
   for(;;){const {done,value}=await reader.read();if(done)break;arm();chunks.push(value);length+=value.byteLength;}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes.buffer;
  }catch(error){last=error;controller.abort();if(attempt+1<attempts)onRetry({url,attempt:attempt+1,error});}
  finally{clearTimeout(timer);}
 }
 throw Error('Unable to load '+url,{cause:last});
}
