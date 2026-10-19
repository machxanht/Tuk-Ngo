// The supplied track is a separate menu bed; it never enters race commentary.
export function createMenuMusic({url,onState=()=>{},AudioClass=globalThis.Audio}){
 const media=new AudioClass();media.preload='none';media.loop=true;
 let active=false,unlocked=false,disposed=false,enabled=true,volume=.8,starts=0;
 const state=()=>({active,unlocked,playing:!media.paused,starts,time:media.currentTime,loop:media.loop,volume:media.volume,source:media.currentSrc||media.src});
 const emit=()=>onState(state());
 async function play(){
  if(disposed||!active||!unlocked||!enabled)return;
  if(!media.src)media.src=url;
  if(!media.paused)return;
  try{await media.play();if(!active||!enabled||disposed)media.pause();else starts++;}catch{/* The UI keeps an explicit tap-to-play action for browser autoplay policy. */}
  emit();
 }
 media.addEventListener('playing',emit);media.addEventListener('pause',emit);media.addEventListener('error',emit);
 return {
  unlock(){unlocked=true;return play();},
  setActive(value){active=value;if(!value){media.pause();media.currentTime=0;}else void play();emit();},
  setMix(mix){enabled=!!mix.enabled;volume=mix.volume;media.volume=Math.max(0,Math.min(1,volume*.38));if(!enabled)media.pause();else void play();emit();},
  stats:state,
  dispose(){disposed=true;active=false;media.pause();media.removeAttribute('src');media.load();},
 };
}
