// Authored game balance, independent of renderer FPS and opponent position.
// Distances are measured at the bow, including interpolated finish crossings.
export const RACE_LENGTH = 1200;
export const PACES = {
 recover: {label:'Giữ sức',cadence:72,drain:-1.4},
 steady: {label:'Đều nhịp',cadence:84,drain:.10},
 sprint: {label:'Nước rút',cadence:105,drain:1.45},
};
export const DIFFICULTIES = {
 easy:{label:'Làm quen',speed:5.05,window:.26},
 normal:{label:'Thi đấu',speed:5.5,window:.23},
 hard:{label:'Thử thách',speed:6.25,window:.20},
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function formatRaceTime(seconds){
 if(seconds==null)return '—';
 const centis=Math.round(Math.max(0,seconds)*100),minutes=Math.floor(centis/6000);
 return `${minutes}:${String(Math.floor(centis/100)%60).padStart(2,'0')}.${String(centis%100).padStart(2,'0')}`;
}
export function createRaceGame(){
 let consumed=new Set(),previousPhase='racing';
 const game={
  state:null,
  reset(difficulty='normal'){
   consumed=new Set();previousPhase='racing';
   this.state={phase:'ready',difficulty:DIFFICULTIES[difficulty]?difficulty:'normal',pace:'steady',countdown:3,elapsed:0,distances:[0,0],speeds:[0,0],finishTimes:[null,null],beatPhase:0,aiPhase:.17,stamina:100,power:0,cohesion:.72,combo:0,maxCombo:0,perfect:0,good:0,missed:0,lastResolved:0,feedback:'Chạm theo vùng sáng',feedbackAt:-10,result:null,pauseReason:'',runId:0};
   return this.snapshot();
  },
  start(difficulty=this.state.difficulty){
   const id=this.state.runId+1;this.reset(difficulty);this.state.runId=id;this.state.phase='countdown';
  },
  pause(reason=''){
   if(!['racing','countdown'].includes(this.state.phase))return;
   previousPhase=this.state.phase;this.state.phase='paused';this.state.pauseReason=reason;
  },
  resume(){if(this.state.phase==='paused'){this.state.phase=previousPhase;this.state.pauseReason='';}},
  setPace(pace){if(PACES[pace]&&this.state.phase!=='finished')this.state.pace=pace;},
  stroke(){
   const s=this.state;if(s.phase!=='racing'||s.finishTimes[0]!=null)return null;
   const beat=Math.round(s.beatPhase);if(beat<1||consumed.has(beat)||beat<=s.lastResolved)return null;
   consumed.add(beat);
   const error=(s.beatPhase-beat)*60/PACES[s.pace].cadence,delta=Math.abs(error);
   const quality=delta<=.10?'perfect':delta<=DIFFICULTIES[s.difficulty].window?'good':'missed';
   if(quality==='missed'){
    this.miss(error<0?'Sớm nhịp':'Muộn nhịp');
   }else{
    s[quality]++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);
    s.power=clamp(s.power+(quality==='perfect'?.64:.17),0,1);
    s.cohesion=clamp(s.cohesion+(quality==='perfect'?.065:.035),.15,1);
    s.stamina=clamp(s.stamina-(s.pace==='sprint'?.48:.04),0,100);
    s.feedback=quality==='perfect'?'Chuẩn!':'Đúng nhịp';s.feedbackAt=s.elapsed;
   }
   return {quality,error,beat};
  },
  miss(message='Lỡ nhịp'){
   const s=this.state;s.missed++;s.combo=0;s.power*=.64;s.cohesion=clamp(s.cohesion-.075,.15,1);s.feedback=message;s.feedbackAt=s.elapsed;
  },
  advance(seconds){
   if(!Number.isFinite(seconds)||seconds<=0)return;
   let remaining=seconds;
   // Small integration steps keep timing, endurance and results consistent
   // on slow tablets. The host pauses hidden tabs rather than skipping time.
   while(remaining>1e-8){const dt=Math.min(1/120,remaining);remaining-=dt;this.step(dt);}
  },
  step(dt){
   const s=this.state;
   if(s.phase==='countdown'){
    const used=Math.min(dt,s.countdown);s.countdown-=used;
    if(s.countdown<=1e-8){s.countdown=0;s.phase='racing';if(dt>used)this.step(dt-used);}
    return;
   }
   if(s.phase!=='racing')return;
   const oldTime=s.elapsed;s.elapsed+=dt;const pace=PACES[s.pace];
   if(s.finishTimes[0]==null){
    s.beatPhase+=dt*pace.cadence/60;
    // Resolve after the latest legal tap window, not at the visual beat itself.
    const resolved=Math.floor(s.beatPhase-DIFFICULTIES[s.difficulty].window*pace.cadence/60-1e-8);
    while(s.lastResolved<resolved){s.lastResolved++;if(s.lastResolved>0&&!consumed.has(s.lastResolved))this.miss();consumed.delete(s.lastResolved);}
    s.power*=Math.exp(-dt*.28);
    s.stamina=clamp(s.stamina-dt*(pace.drain*(.25+.75*s.power)),0,100);
   }
   const fatigue=.5+.5*clamp(s.stamina/24,0,1);
   const playerTarget=s.power<.025?0:(pace.cadence/84)*(1.6+5*s.power)*(.65+.35*s.cohesion)*fatigue;
   const aiBase=DIFFICULTIES[s.difficulty].speed;
   const aiTarget=aiBase*(s.distances[1]<90?.93:s.distances[1]>1000?1.09:1)+.06*Math.sin(s.elapsed*.17);
   s.aiPhase=(s.aiPhase+dt*(s.distances[1]>1000?96:82)/60)%1;
   [playerTarget,aiTarget].forEach((target,i)=>{
    if(s.finishTimes[i]!=null){s.speeds[i]=0;return;}
    s.speeds[i]+=(target-s.speeds[i])*(1-Math.exp(-dt*2.4));
    const before=s.distances[i],movement=s.speeds[i]*dt;
    s.distances[i]=Math.min(RACE_LENGTH,before+movement);
    if(before+movement>=RACE_LENGTH){s.finishTimes[i]=oldTime+(RACE_LENGTH-before)/Math.max(movement,1e-9)*dt;s.speeds[i]=0;}
   });
   if(s.finishTimes.every(t=>t!=null)||(s.finishTimes[0]!=null&&s.finishTimes[1]==null))this.finish();
   else if(s.elapsed>=360||(s.finishTimes[1]!=null&&s.elapsed-s.finishTimes[1]>=40))this.finish();
  },
  finish(){
   const s=this.state;if(s.phase==='finished')return;
   const [player,ai]=s.finishTimes;
   s.result=player==null?'dnf':ai==null||player<ai-.03?'win':Math.abs(player-ai)<=.03?'tie':'loss';
   s.phase='finished';s.speeds=[0,0];
  },
  snapshot(){
   const s=this.state,total=s.perfect+s.good+s.missed;
   return {...s,distances:[...s.distances],speeds:[...s.speeds],finishTimes:[...s.finishTimes],cadence:PACES[s.pace].cadence,rhythmProgress:(s.beatPhase+.5)%1,accuracy:total?Math.round((s.perfect+s.good)/total*100):0,gap:s.distances[0]-s.distances[1],strength:s.pace==='sprint'?clamp(s.power*s.stamina/24,0,1):0,feedback:s.elapsed-s.feedbackAt<1.1?s.feedback:'Chạm khi vạch vào vùng sáng'};
  },
 };
 game.reset();return game;
}
