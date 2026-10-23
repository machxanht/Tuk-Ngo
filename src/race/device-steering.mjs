const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function screenTilt(beta,gamma,angle=0){
 const r=Math.PI/180,b=beta*r,g=gamma*r,a=angle*r;
 return Math.asin(clamp(Math.sin(g)*Math.cos(b)*Math.cos(a)+Math.sin(b)*Math.sin(a),-1,1))/r;
}

/** Screen-relative, calibrated steering; no dependency on compass heading. */
export function createDeviceSteering({host=globalThis.window,onInput=(_value=0)=>{},onState=(_value='idle')=>{}}={}){
 let status='idle',enabled=false,baseline=null,latestRoll=null,filtered=0,last=0,lastSample=0,timer;
 const angle=()=>host.screen?.orientation?.angle??host.orientation??0;
 const state=value=>{if(status!==value){status=value;onState(value);}};
 function calibrate(){baseline=latestRoll;filtered=0;last=0;onInput(0);if(enabled)state(baseline===null?'calibrating':'active');}
 function rotate(){latestRoll=null;calibrate();}
 function receive(e){
  if(!enabled||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
  const now=host.performance.now(),roll=screenTilt(e.beta,e.gamma,angle());lastSample=now;latestRoll=roll;
  if(baseline===null){baseline=roll;state('active');}
  if(status!=='active')state('active');
  const offset=clamp(roll-baseline,-45,45),target=Math.abs(offset)<2?0:Math.sign(offset)*clamp((Math.abs(offset)-2)/16,0,1),dt=last?(now-last)/1000:.02;
  filtered+=(target-filtered)*(1-Math.exp(-Math.min(dt,.2)/.07));last=now;onInput(filtered);
 }
 async function enable(){
  if(enabled){calibrate();return status;}
  const Sensor=host.DeviceOrientationEvent;
  if(!Sensor||host.isSecureContext===false){state('unsupported');return status;}
  // Listen before requesting permission: the first valid sample can arrive
  // before the permission promise settles, even on a stationary device.
  enabled=true;calibrate();lastSample=host.performance.now();host.addEventListener('deviceorientation',receive);host.screen?.orientation?.addEventListener('change',rotate);host.addEventListener('orientationchange',rotate);
  timer=host.setInterval(()=>{if(baseline===null&&host.performance.now()-lastSample>1500){onInput(0);filtered=0;state('unsupported');}},300);
  // Must run directly in the start-button gesture, before loading team assets.
  try{if(typeof Sensor.requestPermission==='function'&&await Sensor.requestPermission()!=='granted'){stop();state('denied');return status;}}
  catch{stop();state('denied');return status;}

  return status;
 }
 function stop(){enabled=false;host.removeEventListener('deviceorientation',receive);host.screen?.orientation?.removeEventListener('change',rotate);host.removeEventListener('orientationchange',rotate);if(timer)host.clearInterval(timer);onInput(0);}
 return{enable,calibrate,get status(){return status;},dispose:stop};
}
