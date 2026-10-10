// Real CC0 audience recording, benfree / Freesound 130568.
// Playback starts only after the user's sound-button gesture.
export function createCrowdAudio(url){
 const audio=new Audio(url);audio.loop=true;audio.preload='none';audio.volume=.25;let enabled=false,starting=false;
 return {async enable(value){enabled=value;if(!value){audio.pause();return;}starting=true;try{await audio.play();}catch(error){enabled=false;throw error;}finally{starting=false;}},update(playing,cadence,distance){audio.volume=Math.min(.55,.18+Math.max(0,cadence-80)*.008+(distance>1050?.08:0));if(!enabled||starting)return;if(playing&&audio.paused)audio.play().catch(()=>{});if(!playing&&!audio.paused)audio.pause();},state(){return {enabled,playing:!audio.paused,time:audio.currentTime,volume:audio.volume,error:audio.error?.message||null};},dispose(){enabled=false;audio.pause();audio.removeAttribute('src');audio.load();}};
}
