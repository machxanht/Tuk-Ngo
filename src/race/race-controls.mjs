// Each finger/key owns its contact, including non-primary touch pointers.
export function createRaceControls(game,onStroke=()=>game.stroke()){
 const rows=new Set(),rudders=new Map();
 function sync(){game.setRowingHeld(rows.size>0);game.setSteering([...rudders.values()].at(-1)||0);}
 return {
  rowDown(id){if(rows.has(id)||game.state.phase!=='racing')return;rows.add(id);onStroke();sync();},
  steerDown(id,direction){if(game.state.phase!=='racing')return;rudders.delete(id);rudders.set(id,direction);sync();},
  release(id){rows.delete(id);rudders.delete(id);sync();},
  releaseKeyboard(){for(const id of [...rows,...rudders.keys()])if(String(id).startsWith('key:')){rows.delete(id);rudders.delete(id);}sync();},
  clear(){rows.clear();rudders.clear();game.setRowingHeld(false);game.setSteering(0);},
 };
}
