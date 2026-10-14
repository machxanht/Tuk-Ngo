// Reuse the tested race rules; every visual direction shares this model.
import {createRaceGame,PACES,DIFFICULTIES,RACE_LENGTH,formatRaceTime} from './gameplay.mjs';
import {createTournament} from './tournament.mjs';
window.TukNgoGameRules={createRaceGame,PACES,DIFFICULTIES,RACE_LENGTH,formatRaceTime};
window.TukNgoTournament={createTournament};
