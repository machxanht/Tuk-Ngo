// Each finger/key owns its contact, including non-primary touch pointers.
export function createRaceControls(game,onStroke=()=>game.stroke(),beforeInput=()=>{}){
 const rows=new Set(),boosts=new Set(),rudders=new Map();let deviceInput=0;
 const canHold=()=>game.state.finishTimes[0]==null&&(game.state.phase==='racing'||game.state.simpleControls&&game.state.phase==='countdown'&&game.state.countdown<=1);
 function sync(){const boosting=boosts.size>0,rowing=rows.size>0||boosting;if(game.state.boostHeld!==boosting)game.setBoostHeld(boosting);if(game.state.rowingHeld!==rowing)game.setRowingHeld(rowing);const input=[...rudders.values()].at(-1)?.direction??deviceInput;if(game.state.steeringInput!==input)game.setSteering(input);}
 return {
  rowDown(id,timestamp){beforeInput();if(rows.has(id)||!canHold())return;rows.add(id);if(game.state.phase==='racing')onStroke(timestamp);sync();},
  boostDown(id){beforeInput();if(!canHold()||boosts.has(id))return;boosts.add(id);sync();},
  update(){if(game.state.phase==='racing')sync();},
  get held(){return {row:rows.size>0||boosts.size>0,boost:boosts.size>0};},
  setDeviceSteering(value){deviceInput=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;sync();},
  steerDown(id,direction){beforeInput();if(game.state.phase!=='racing')return;rudders.delete(id);rudders.set(id,{direction,at:game.state.elapsed});sync();},
  release(id,{cancelled=false}={}){beforeInput();const rudder=rudders.get(id);rows.delete(id);boosts.delete(id);rudders.delete(id);sync();if(rudder&&!cancelled&&!rudders.size&&game.state.elapsed-rudder.at<.20)game.nudgeSteering(rudder.direction);},
  releaseKeyboard(){for(const id of [...rows,...boosts,...rudders.keys()])if(String(id).startsWith('key:')){rows.delete(id);boosts.delete(id);rudders.delete(id);}sync();},
  clear(){rows.clear();boosts.clear();rudders.clear();deviceInput=0;game.setBoostHeld(false);game.setRowingHeld(false);game.setSteering(0);},
 };
}
