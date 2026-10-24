# Online racing and rankings

The game stays at https://machxanht.github.io/Tuk-Ngo/. Its real-time backend is https://tuk-ngo-online.oliverkhang.workers.dev. GitHub Pages serves the existing 3D game; a Cloudflare Worker and SQLite-backed Durable Objects handle matchmaking, race authority and durable rankings.

## Player flow

Choose a course, then **Race online**. Set a guest display name and a boat. **Find opponent** matches two real players on the same course; an empty queue waits rather than adding an AI. **Play with a friend** creates an eight-character room code. Each participant loads the boats and presses Ready. Both receive the same flyover, countdown and server-driven race. Existing rowing and boost buttons, tilt steering, keyboard controls and canvas swipe fallback remain.

Each course has its own Elo leaderboard. Ratings start at 1,000, with K=32; equal-rated players exchange 16 points on a decisive result. A tie is within 0.03 seconds of the server's interpolated finish crossings. Friend rooms and pre-start cancellations do not change rank. The leaderboard shows only completed ranked participants, with wins, race count and fastest completed time. It does not use AI results, offline cup results or local practice records.

Identity is currently a signed **guest profile stored in this browser**, not an email account. It survives page reloads. Clearing browser storage loses access to that guest profile. Automatic cross-device account recovery is not implemented. Never expose or publish its bearer token.

## Authority and lifecycle

- Each race has an independent `RaceRoom` Durable Object. Per-course `RaceDirectory` objects coordinate queues and store rankings. There is no central simulation loop for all rooms.
- Both humans use `createRaceGame`'s existing 240 Hz fixed-tick player physics with equal controls, stamina and flow seed. Neither lane uses AI. Only row/boost state, steering and increasing input sequence numbers cross from client to server. Client distances, clocks and declared results are ignored.
- The active room ticks every 50 ms and broadcasts at 10 Hz. The client smooths at most 150 ms beyond an authoritative packet, then freezes presentation until fresh data arrives. It cannot invent finish crossings or results. WebSocket input is bounded to 2 KB and rate-limited; REST data is bounded to 2 KB. Origins are allowlisted.
- State, beat bookkeeping and inputs are checkpointed during an active race. Completed results persist before an idempotent SQLite transaction updates both players. Retrying settlement cannot award points twice. Transient settlement errors are retried with a Durable Object alarm.
- Reconnecting within 15 seconds retains the room. A page reload automatically reconnects before downloading the 3D scene, and can recover a result decided while the page was loading. The first touch re-enables motion/audio after a reload. Restored input sequence numbers prevent a reloaded client from being rejected indefinitely. Controls reset on disconnect and must be pressed again after reconnection. Missing input heartbeats release held controls.
- An online race continues while the local menu or another app is open. Leaving after GO is a forfeit; leaving before GO cancels without a rating change. Both players disconnecting cancels the match. A course time limit awards a result only if someone actually finished; otherwise the match is cancelled.
- Waiting rooms expire after ten minutes. Active room timers stop after the decision; sockets use the hibernation API while idle, and expired room data is reclaimed. Queue entries without a poll expire. Ranking rows and decided results remain durable.

## Implementation

| File | Responsibility |
| --- | --- |
| `server/online.mjs` | Worker routes, signed guest authentication, origin checks, session limiter, directories, rooms, settlement |
| `wrangler.jsonc` | Existing-account free Worker deployment and SQLite DO bindings |
| `src/race/online-rules.mjs` | Shared physics adapter, input sanitation and Elo rules |
| `src/race/online-client.mjs` | Network lifecycle, cancellation, session deduplication, game adapter |
| `src/components/OnlineLobby.tsx` / `.css` | Responsive lobby, friend rooms and live leaderboard |
| `src/race/online-language.ts` | Việt, Khmer and English online interface copy |
| `public/online-config.json` | Public backend URL; contains no credential |

Athlete meshes, shirt topology and master rig files are unchanged. The offline practice, AI races and 61/8-team local cups keep their original simulation and save keys.

## Local development and deployment

Run `npm ci`. For local-only development, set `VITE_ONLINE_URL=http://127.0.0.1:8790` in an ignored `.env.local`. Set a long random `SESSION_SECRET` in ignored `.dev.vars`, then run `npm run dev:online` and `npm run dev` in separate terminals. Add an explicit development origin to the allowlist if using a different port. Do not put development endpoints or secrets into the production config.

Deployment uses `npm run deploy:online` with the existing Cloudflare account. Provision `SESSION_SECRET` using `wrangler secret put SESSION_SECRET`; secrets are not in Git. `QA_SECRET` is an optional separate private secret for isolated live tests. Generate bindings with `wrangler types server/worker-configuration.d.ts`; this generated runtime declaration and local `.wrangler/` state are ignored. Do not upgrade billing automatically. The deployed account is Workers Free; reaching its free limits stops the relevant operation rather than silently enabling a paid plan. See [Cloudflare's Durable Objects pricing and limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).

The secret-enabled `/session` QA header mints a signed QA identity. It cannot be enabled with an ordinary client flag. QA profiles use separate queue and ranking objects and cannot join normal friend rooms. This allows real external WebSocket/SQLite checks without filling players' public leaderboards with test scores. The browser uses exactly the same game, controls and server physics.

## Verification

- `npm run lint`, `npm test`, `npm run build`: existing imports, protected assets, motion, audio, offline cups and new online rules.
- `node scripts/check-online-server.mjs BACKEND_URL OUTPUT_FOLDER`: real two-client race, authentication/origin rejection, forged-result rejection, reconnect, durable exactly-once Elo and unranked friend-room cancellation. Set `TUKNGO_QA_SECRET` privately for public testing.
- `python scripts/check-online-ui.py --url GAME_URL --secrets-file PRIVATE_JSON --out OUTPUT_FOLDER`: two independent browsers, actual input, three languages / twelve viewport combinations, friend-room flow, public matchmaking, no-pause menu, disconnect/reload, finish and visible ranking. The private JSON supplies `QA_SECRET`; no token is exported in the QA report.
- `python scripts/check-simple-race.py --url GAME_URL --out OUTPUT_FOLDER`: offline two-button/sensor/AI/cup regression.

Browser viewport and sensor emulation do not establish physical tablet performance or mobile-network reliability. There is no load/capacity benchmark yet. Guest authentication and server-owned scoring do not prevent a person from creating multiple accounts or deliberately losing ranked matches; stronger account identity and abuse controls are a separate future step.
