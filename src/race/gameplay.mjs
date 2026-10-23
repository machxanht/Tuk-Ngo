import {advanceSteering,STEERING} from './race-steering.mjs';
import {riverFlow} from './race-flow.mjs';
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
export const RACE_STAGES = {start:{label:'Xuất phát bùng nổ',cadence:96,drain:.65},cruise:{label:'Giữ nhịp đường trường',cadence:84,drain:.16},final:{label:'Nước rút về đích',cadence:102,drain:.95}};
const stageAt=distance=>distance<200?'start':distance<950?'cruise':'final';
const cadenceFor=s=>RACE_STAGES[stageAt(s.distances[0])].cadence+(s.pace==='recover'?-12:s.pace==='sprint'?18:0);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// One timing source for scoring and the visible cue. Beat zero is the GO stroke.
function timingFor(s,consumed){
 const beat=Math.round(s.beatPhase),seconds=(s.beatPhase-beat)*60/cadenceFor(s),window=DIFFICULTIES[s.difficulty].window;
 const available=s.phase==='racing'&&s.finishTimes[0]==null&&!consumed.has(beat)&&(beat===0||beat>s.lastResolved);
 return {beat,seconds,window,perfectWindow:.1,available,inWindow:available&&Math.abs(seconds)<=window,quality:!available?'wait':Math.abs(seconds)<=.1?'perfect':Math.abs(seconds)<=window?'good':'wait',progress:(s.beatPhase+.5)%1};
}
export function formatRaceTime(seconds){
 if(seconds==null)return '—';
 const centis=Math.round(Math.max(0,seconds)*100),minutes=Math.floor(centis/6000);
 return `${minutes}:${String(Math.floor(centis/100)%60).padStart(2,'0')}.${String(centis%100).padStart(2,'0')}`;
}
export function createRaceGame(){
 let consumed=new Set(),rejected=new Set(),previousPhase='racing',accumulator=0,tapBeat=-1,taps=0;
 const game={
  state:null,
  reset(difficulty='normal'){
   consumed=new Set();rejected=new Set();previousPhase='racing';accumulator=0;tapBeat=-1;taps=0;
   this.state={phase:'ready',difficulty:DIFFICULTIES[difficulty]?difficulty:'normal',pace:'steady',countdown:3,elapsed:0,distances:[0,0],speeds:[0,0],finishTimes:[null,null],beatPhase:0,aiPhase:.17,stamina:100,power:0,cohesion:.72,combo:0,maxCombo:0,perfect:0,good:0,missed:0,lastResolved:0,feedback:'Chạm theo vùng sáng',feedbackAt:-10,result:null,pauseReason:'',runId:0};
    Object.assign(this.state,{mode:'ai',rowingAssist:difficulty==='easy',steeringAssist:true,steeringEnabled:false,steeringInput:0,steeringPulse:0,steeringPulseRemaining:0,lateralPositions:[0,0],headings:[0,0],rudder:0,atLaneEdge:false,steeringSeconds:0,steeringError:0,manualSteeringDistance:0,paceSwitches:0,rowingHeld:false,surgeCharge:0,surgeRemaining:0,desync:0,lastSpamAt:-10,slipstream:false,lastJudgement:null,lastTiming:'wait',lastStrokeBeat:-1,aiStamina:100,aiSurgeCharge:0,aiSurgeRemaining:0});
   Object.assign(this.state,{flowSeed:17,flowSeconds:0,flowActiveSeconds:0});return this.snapshot();
  },
  start(difficulty=this.state.difficulty,{intro=false,mode='ai',rowingAssist=difficulty==='easy',steeringAssist=true,steeringEnabled=false,flowSeed=17}={}){
   const id=this.state.runId+1;this.reset(difficulty);this.state.runId=id;this.state.phase=intro?'intro':'countdown';Object.assign(this.state,{mode:['practice','ai','cup'].includes(mode)?mode:'ai',rowingAssist:!!rowingAssist,steeringAssist:!!steeringAssist,steeringEnabled:!!steeringEnabled});
   this.state.flowSeed=flowSeed>>>0;this.state.flowSeconds=0;this.state.flowActiveSeconds=0;this.state.introRemaining=intro?10:0;this.state.introElapsed=0;
  },
  pause(reason=''){
   if(!['intro','racing','countdown'].includes(this.state.phase))return;
   this.setRowingHeld(false);this.setSteering(0);previousPhase=this.state.phase;this.state.phase='paused';this.state.pauseReason=reason;
  },
  resume(){if(this.state.phase==='paused'){this.state.phase=previousPhase;this.state.pauseReason='';}},
  setPace(pace){if(PACES[pace]&&this.state.phase!=='finished'){if(this.state.phase==='racing'&&pace!==this.state.pace)this.state.paceSwitches++;this.state.pace=pace;}},
  setSteering(value){const s=this.state;s.steeringInput=s.phase==='racing'&&s.finishTimes[0]==null&&Number.isFinite(value)?clamp(value,-1,1):0;s.steeringPulseRemaining=0;},
  nudgeSteering(direction){if(this.state.phase!=='racing'||this.state.finishTimes[0]!=null)return;this.state.steeringPulse=clamp(direction,-1,1);this.state.steeringPulseRemaining=.8;},
  setRowingHeld(held){
   const s=this.state;s.rowingHeld=!!held&&s.rowingAssist&&s.phase==='racing'&&s.finishTimes[0]==null;
   if(!s.rowingHeld)return;
   // Start immediately, then let the fixed simulation tick schedule each beat.
   if(!consumed.has(Math.round(s.beatPhase)))this.stroke();
  },
  stroke(){
   const s=this.state;if(s.phase!=='racing'||s.finishTimes[0]!=null)return null;
   const timing=timingFor(s,consumed),beat=timing.beat;
   if(tapBeat!==beat){tapBeat=beat;taps=0;}taps++;
   // One harmless double tap; repeated mashing has a bounded penalty.
   if(!s.rowingAssist&&taps>2&&s.elapsed-s.lastSpamAt>=.5){s.lastSpamAt=s.elapsed;s.stamina=clamp(s.stamina-.8,0,100);s.desync=clamp(s.desync+.22,0,1);s.cohesion=clamp(s.cohesion-.025,.15,1);s.lastJudgement='BAD';s.lastTiming='spam';s.feedback='BAD · Dồn nhịp';s.feedbackAt=s.elapsed;}
   if(!timing.available)return null;
   const error=timing.seconds,delta=Math.abs(error);
   const quality=s.rowingAssist?'perfect':delta<=.10?'perfect':delta<=DIFFICULTIES[s.difficulty].window?'good':'missed';
   s.lastJudgement=quality==='missed'?'BAD':quality.toUpperCase();
   if(quality==='missed'){
    // An early press must not lock the upcoming stroke. Allow a correction
    // inside its legal window, and count a rejected attempt at most once.
    if(!rejected.has(beat)){rejected.add(beat);this.miss(error<0?'Sớm nhịp':'Muộn nhịp');}
   }else{
    consumed.add(beat);s.lastStrokeBeat=beat;
    s.lastTiming=quality;s[quality]++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);
    s.power=clamp(s.power+(quality==='perfect'?.64:.17),0,1);
    s.cohesion=clamp(s.cohesion+(quality==='perfect'?.065:0),.15,1);
    s.stamina=clamp(s.stamina-(quality==='perfect'?.015:s.pace==='sprint'?.32:.08),0,100);
    if(quality==='perfect'){s.surgeCharge=clamp(s.surgeCharge+.032,0,1);s.desync=Math.max(0,s.desync-.12);}
    s.feedback=quality==='perfect'?'PERFECT · Chuẩn!':'GOOD · Đúng nhịp';s.feedbackAt=s.elapsed;
   }
   return {quality,judgement:quality==='missed'?'BAD':quality.toUpperCase(),error,beat};
  },
  miss(message='Lỡ nhịp'){
   const s=this.state;s.missed++;s.combo=0;s.lastJudgement='BAD';s.lastTiming=message==='Sớm nhịp'?'early':message==='Muộn nhịp'?'late':'missed';s.desync=clamp(s.desync+.3,0,1);s.stamina=clamp(s.stamina-.65,0,100);s.surgeCharge=Math.max(0,s.surgeCharge-.018);s.power*=.64;s.cohesion=clamp(s.cohesion-.075,.15,1);s.feedback='BAD · '+message;s.feedbackAt=s.elapsed;
  },
  surge(){
   const s=this.state;if(!this.snapshot().canSurge)return false;
   s.surgeCharge-=.6;s.stamina-=12;s.surgeRemaining=4;s.feedback='ĐẠP!';s.feedbackAt=s.elapsed;return true;
  },
  advance(seconds){
   if(!Number.isFinite(seconds)||seconds<=0)return;
   if(!['intro','countdown','racing'].includes(this.state.phase))return;
   // Fixed simulation ticks make renderer frame grouping irrelevant.
   accumulator+=seconds;
   while(accumulator+1e-10>=1/240){accumulator-=1/240;this.step(1/240);if(this.state.phase==='finished'){accumulator=0;break;}}
  },
  step(dt){
   const s=this.state;
   if(s.phase==='intro'){
    const used=Math.min(dt,s.introRemaining);s.introRemaining-=used;s.introElapsed+=used;
    if(s.introRemaining<=1e-8){s.introRemaining=0;s.phase='countdown';if(dt>used)this.step(dt-used);}
    return;
   }
   if(s.phase==='countdown'){
    const used=Math.min(dt,s.countdown);s.countdown-=used;
    if(s.countdown<=1e-8){s.countdown=0;s.phase='racing';if(dt>used)this.step(dt-used);}
    return;
   }
   if(s.phase!=='racing')return;
   const oldTime=s.elapsed;s.elapsed+=dt;
   const stage=stageAt(s.distances[0]),cadence=cadenceFor(s);
   s.slipstream=s.mode!=='practice'&&stage==='cruise'&&s.distances[1]-s.distances[0]>2&&s.distances[1]-s.distances[0]<28;
   s.desync=Math.max(0,s.desync-dt*.42);s.surgeRemaining=Math.max(0,s.surgeRemaining-dt);
   if(s.finishTimes[0]==null){
    s.beatPhase+=dt*cadence/60;
    if(s.rowingHeld&&s.rowingAssist&&timingFor(s,consumed).seconds>=0&&timingFor(s,consumed).seconds<dt*1.1)this.stroke();
    // Resolve after the latest legal tap window, not at the visual beat itself.
    const resolved=Math.floor(s.beatPhase-DIFFICULTIES[s.difficulty].window*cadence/60-1e-8);
    while(s.lastResolved<resolved){s.lastResolved++;if(s.lastResolved>0&&!consumed.has(s.lastResolved)&&!rejected.has(s.lastResolved)&&!s.rowingAssist)this.miss();consumed.delete(s.lastResolved);rejected.delete(s.lastResolved);}
    s.power*=Math.exp(-dt*.28);
    const drain=s.rowingAssist&&!s.rowingHeld?-1.8:s.pace==='recover'?-1.4:RACE_STAGES[stage].drain+(s.pace==='sprint'?1.35:0);
    s.stamina=clamp(s.stamina-dt*drain*(.25+.75*s.power)*(s.slipstream&&drain>0?.65:1)*(s.lastJudgement==='PERFECT'&&drain>0?.72:1),0,100);
   }
   advanceSteering(s,dt);
   const flow=s.steeringEnabled?riverFlow(s.distances[0],s.lateralPositions[0],s.flowSeed):{boost:0};
   if(s.finishTimes[0]==null&&s.distances[0]>100&&s.distances[0]<1140&&s.speeds[0]>1){s.flowActiveSeconds+=dt;if(flow.boost>.025)s.flowSeconds+=dt;}
   const fatigue=.5+.5*clamp(s.stamina/24,0,1);
   const steeringDrag=Math.cos(s.headings[0])*(s.atLaneEdge?.90:1);
   const playerTarget=s.power<.025?0:(1+flow.boost)*steeringDrag*(cadence/84)*(1.6+5*s.power)*(.65+.35*s.cohesion)*fatigue*(1-s.desync*.22)*(s.surgeRemaining>0?1.3:1);
   const aiBase=DIFFICULTIES[s.difficulty].speed;
   const aiStage=stageAt(s.distances[1]);
   // The opponent conserves energy in cruise and spends its own charge at
   // the final marker. No player gap, team name or historical rank enters it.
   if(s.mode!=='practice'&&s.finishTimes[1]==null){
    s.aiSurgeRemaining=Math.max(0,s.aiSurgeRemaining-dt);
    s.aiStamina=clamp(s.aiStamina-dt*(aiStage==='start'?.48:aiStage==='cruise'?.12:.7),0,100);
    if(aiStage==='final'&&s.aiSurgeRemaining===0&&s.aiSurgeCharge>=.6&&s.aiStamina>=24){s.aiSurgeCharge-=.6;s.aiStamina-=12;s.aiSurgeRemaining=4;}
    const nextAiPhase=s.aiPhase+dt*RACE_STAGES[aiStage].cadence/60;
    if(nextAiPhase>=1)s.aiSurgeCharge=clamp(s.aiSurgeCharge+.018,0,1);
    s.aiPhase=nextAiPhase%1;
   }
   const aiFatigue=.5+.5*clamp(s.aiStamina/24,0,1);
   const aiBoost=s.steeringEnabled?riverFlow(s.distances[1],s.lateralPositions[1],s.flowSeed).boost:0;
   const aiTarget=(1+aiBoost)*aiBase*(aiStage==='start'?1.09:aiStage==='final'?1.15:1)*aiFatigue*(s.aiSurgeRemaining>0?1.13:1)+.06*Math.sin(s.elapsed*.17);
   [playerTarget,aiTarget].forEach((target,i)=>{
    if(i===1&&s.mode==='practice'){s.speeds[1]=0;return;}
    if(s.finishTimes[i]!=null){s.speeds[i]=0;return;}
    s.speeds[i]+=(target-s.speeds[i])*(1-Math.exp(-dt*2.4));
    const before=s.distances[i],movement=s.speeds[i]*dt;
    s.distances[i]=Math.min(RACE_LENGTH,before+movement);
    if(before+movement>=RACE_LENGTH){s.finishTimes[i]=oldTime+(RACE_LENGTH-before)/Math.max(movement,1e-9)*dt;s.speeds[i]=0;if(i===0){s.rowingHeld=false;this.setSteering(0);}}
   });
   if(s.mode==='practice'?s.finishTimes[0]!=null:s.finishTimes.every(t=>t!=null))this.finish();
   else if(s.mode!=='practice'&&(s.elapsed>=360||(s.finishTimes[1]!=null&&s.elapsed-s.finishTimes[1]>=40)))this.finish();
  },
  completeRace(){if(this.state.phase!=='racing'||this.state.finishTimes[0]==null)return false;for(let n=0;n<240*360&&this.state.phase==='racing';n++)this.step(1/240);return this.state.phase==='finished';},
  finish(){
   const s=this.state;if(s.phase==='finished')return;
   const [player,ai]=s.finishTimes;
   s.result=s.mode==='practice'?(player==null?'dnf':'complete'):player==null?'dnf':ai==null||player<ai-.03?'win':Math.abs(player-ai)<=.03?'tie':'loss';
   s.rowingHeld=false;this.setSteering(0);s.phase='finished';s.speeds=[0,0];
  },
  skipIntro(){if(this.state.phase==='intro'){this.state.introRemaining=0;this.state.introElapsed=10;this.state.phase='countdown';}},
  snapshot(){
   const s=this.state,total=s.perfect+s.good+s.missed,timing=timingFor(s,consumed);
   const flow=riverFlow(s.distances[0],s.lateralPositions[0],s.flowSeed);
   return {...s,flow,flowBonus:s.steeringEnabled?Math.round(flow.boost*1000)/10:0,flowMastery:s.flowActiveSeconds?Math.round(s.flowSeconds/s.flowActiveSeconds*100):0,waitingForOpponent:s.phase==='racing'&&s.finishTimes[0]!=null&&s.finishTimes[1]==null&&s.mode!=='practice',lateralPositions:[...s.lateralPositions],headings:[...s.headings],steeringLimit:STEERING.limit,steeringAccuracy:Math.round(clamp(1-s.steeringError/Math.max(.001,s.steeringSeconds)/STEERING.limit,0,1)*100),practiceTasks:[s.perfect+s.good>=8,s.manualSteeringDistance>=.8,s.paceSwitches>0,s.finishTimes[0]!=null],timing,strokeAvailable:timing.available,distances:[...s.distances],speeds:[...s.speeds],finishTimes:[...s.finishTimes],raceStage:stageAt(s.distances[0]),stageLabel:RACE_STAGES[stageAt(s.distances[0])].label,cadence:cadenceFor(s),aiRaceStage:stageAt(s.distances[1]),aiStageLabel:RACE_STAGES[stageAt(s.distances[1])].label,aiCadence:RACE_STAGES[stageAt(s.distances[1])].cadence,aiSurgeActive:s.aiSurgeRemaining>0,judgement:s.elapsed-s.feedbackAt<1.1?s.lastJudgement:null,surgeActive:s.surgeRemaining>0,canSurge:s.phase==='racing'&&s.finishTimes[0]==null&&stageAt(s.distances[0])==='final'&&s.surgeRemaining<=0&&s.surgeCharge>=.6&&s.stamina>=24,desyncIntensity:s.desync,rhythmProgress:timing.progress,accuracy:total?Math.round((s.perfect+s.good)/total*100):0,gap:s.distances[0]-s.distances[1],strength:s.surgeRemaining>0?1:s.pace==='sprint'?clamp(s.power*s.stamina/24,0,1):0,feedback:s.elapsed-s.feedbackAt<1.1?s.feedback:'Chạm khi vạch vào vùng sáng'};
  },
 };
 game.reset();return game;
}
