// Each finger/key owns its contact, including non-primary touch pointers.
export function createRaceControls(game,onStroke=()=>game.stroke(),beforeInput=()=>{}){
 const rows=new Set(),rudders=new Map();
 function sync(){game.setRowingHeld(rows.size>0);const input=[...rudders.values()].at(-1)?.direction||0;if(game.state.steeringInput!==input)game.setSteering(input);}
 return {
  rowDown(id,timestamp){beforeInput();if(rows.has(id)||game.state.phase!=='racing')return;rows.add(id);onStroke(timestamp);sync();},
  steerDown(id,direction){beforeInput();if(game.state.phase!=='racing')return;rudders.delete(id);rudders.set(id,{direction,at:game.state.elapsed});sync();},
  release(id,{cancelled=false}={}){beforeInput();const rudder=rudders.get(id);rows.delete(id);rudders.delete(id);sync();if(rudder&&!cancelled&&!rudders.size&&game.state.elapsed-rudder.at<.20)game.nudgeSteering(rudder.direction);},
  releaseKeyboard(){for(const id of [...rows,...rudders.keys()])if(String(id).startsWith('key:')){rows.delete(id);rudders.delete(id);}sync();},
  clear(){rows.clear();rudders.clear();game.setRowingHeld(false);game.setSteering(0);},
 };
}
