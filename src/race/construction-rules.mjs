// Cambodia uses the existing carved dugout art by default. Historical timber
// construction is a separate, sourced property of each boat in the registry.
export const constructionForLane=(index,venueId='maspero')=>venueId==='maspero'?(index%2?'dugout':'plywood'):'dugout';
export const opponentConstruction=(construction,venueId)=>venueId==='maspero'?(construction==='plywood'?'dugout':'plywood'):'dugout';
