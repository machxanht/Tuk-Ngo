# Race modes and steering

The stable entry is https://machxanht.github.io/Tuk-Ngo/. All three modes use the same current athlete, hull, Maspéro course, water and festival assets.

## Play

| Mode | Rules and completion |
| --- | --- |
| Luyện tập / ហ្វឹកហាត់ | One visible boat, no opponent, no DNF timer. Complete eight good strokes, steer while moving, change pace, and finish 1,200 m. Save the best completed time in this browser. |
| Đua với AI | Select any other registered team, easy/normal/hard AI, and the hull construction. Both boats receive actual interpolated crossing times. Replay or return to the menu after results. |
| Cúp lễ hội | 61 teams, three first-round byes, up to six races for the player. Tie replay, elimination, full bracket, champion and local restore are retained. Other heats are simulated by the existing tournament engine. |

Default controls are deliberately forgiving: hold **CHÈO** or **Space** to keep the crew rowing. Release to rest. Hold **← / →** or **A / D** to steer while moving. Tablet players can row with one finger and steer with another; each contact releases independently. Paces and the final-stage **ĐẠP** ability remain available.

The race now renders across the complete viewport, with translucent input targets floating over it. Short steering taps create a 0.8-second rudder stroke; held input remains continuous. Assistance only protects the lane edge, and the camera does not follow away the player's lateral travel. The camera button cycles duel, near-boat and full-course views. Follow the bright water chevrons for an authored flow advantage of up to 4.5% speed; the result screen reports time spent following the flow. This is a game mechanic, not measured river hydrology. See [gameplay research and Cambodia expansion](gameplay-direction.md).

The preparation screen separates AI level from two assistance toggles. Turning off rowing assistance restores manual beat scoring. Turning off lane assistance leaves the player responsible for small river-current drift. Steering changes heading up to eight degrees and lateral position up to 4.2 m within the boat's corridor. Steering near the edge reduces speed and warns the player. This is an authored lane-racing mechanic, not unrestricted free navigation or a collision simulator.

Pause, leaving the browser window and returning to the menu release all held inputs. Cups and practice best times are stored on this browser/device, not synchronized between devices. Practice does not play two-team/winner speech. Competitive races retain the existing bilingual audio system and its documented pronunciation/source limitations.

## Implementation

- `src/race/race-steering.mjs`: deterministic heading/current/lateral dynamics, limits and lane statistics.
- `src/race/race-controls.mjs`: independent row/rudder contact ownership.
- `src/race/gameplay.mjs`: mode rules, real finish timing and practice milestones.
- `src/race/boat-preview.mjs`, `hybrid-boats.mjs`, `rowing-pose.mjs`: shared visible boat placement, lane buoys and palm-constrained helm response.
- `src/components/RaceGame.tsx`, `RaceGame.css`, `src/race/game-language.ts`: three mode flows, tablet/keyboard controls, VI/KM labels and saved results.

The shirt geometry/equations and original eight source rig/motion files remain unchanged. Existing architecture tests check the 533 vertices / 896 triangles / four boundary loops and twelve protected source hashes.

## Verification

Run `npm run lint`, `npm test`, and `npm run build`. Start preview on port 8779, then:

```sh
python scripts/check-race-modes.py
python scripts/check-game-flow.py --url http://127.0.0.1:8779/Tuk-Ngo/ --out docs/qa/race-modes/flow
python scripts/check-gameplay-input.py --out docs/qa/race-modes/input
python scripts/check-immersive-race.py --url http://127.0.0.1:8779/Tuk-Ngo/
```

Browser checks use Edge headless with a touch-capable viewport and Chromium's actual touch dispatch. They verify simultaneous two-finger input, key release, pause/reset, visible boat heading, both stern hand grips, solo audio suppression, real engine finishes, opponent selection, six cup races to champion, saved draw restore, tie replay and DNF elimination. Full-match waits are accelerated through the actual fixed-step engine; they are not human playthroughs or performance benchmarks.

The VI/KM race controls are inspected at 1024×768, 768×1024, 1180×430 and 390×844. Menu/setup/help also pass the existing bilingual flow regression. Both helmsmen retain their grips through 96 sampled phases in each steering direction (384 actor samples). Local evidence: [mode checks](qa/race-modes/local/checks.json), [flow checks](qa/race-modes/flow/checks.json), [input checks](qa/race-modes/input/input-regression.json). Physical tablet frame rate, thermal behavior and native Khmer proofreading are not verified by this desktop gate.

The same three-mode browser gate passed on the public URL with no JavaScript/console errors: [public results](qa/race-modes/public/checks.json), [published practice view](qa/race-modes/public/practice-steering.png). [Deployment verification](qa/race-modes/public/deployment.json) records 37 served files matching the built SHA-256 hashes, source `9a75f69` and Pages `b091f23`.
