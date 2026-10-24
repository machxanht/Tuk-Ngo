# Venue roster isolation verification

24 October 2026. Runtime source: `1d0434b`. Public Pages commit:
`5a5b3f3fbde192d57b87ebac8d4c4d699ab9742b`. Worker version:
`2bb038f5-640a-4854-88f9-b4f59baa69ba`.

Stable URL: https://machxanht.github.io/Tuk-Ngo/

## Scope and results

- `npm run lint`, `npm test`, `npm run build` passed. The architecture gate
  measured the protected shirt at 533 vertices, 896 triangles and four boundary
  loops, and verified the preserved rig/source hashes. No athlete asset was
  changed for roster isolation.
- `local-flow.json`: real Edge UI, all three own-boat/opponent/online pickers,
  exact pagination, foreign searches, practice/AI results, cups and independent
  saved progress. A pre-split Siem Reap cup using Phnom Penh teams is backed up
  byte-for-byte before replacement. Local finishes advance the actual game
  simulation faster than wall time; they are not network-race evidence.
- `local-responsive.json`: both Cambodian scenes, 24 venue/language/viewport
  combinations, Khmer/Latin search, touch-target reachability, full three-round
  invitational cups, traffic and scenery assertions. These assert the existing
  interpretation, not survey-level accuracy or verified team uniforms.
- `local-api.json` and `public-api.json`: real HTTP requests to local/deployed
  Workers. Foreign teams rejected in queue/create/join on all three maps;
  a room code cannot override the selected venue. Different-map queues never
  pair. Private-room cancellation and rejected choices do not affect Elo.
- `public-race.json`: two scripted WebSocket clients, actual server clock,
  new Siem Reap teams. Both finish (73.887 s / 78.801 s), forged finishes are
  ignored, reconnect preserves the sequence, Elo settles exactly once. Uses
  the isolated QA namespace, not public player rankings.
- `deployment.json`: successful Pages workflow and SHA-256/byte equality of
  all 20 changed deployed files against the exact Pages Git commit.
- `public-flow.json` and the three selection screenshots: the same roster and
  saved-cup browser flow rerun on the stable public URL after deployment.

## Limits

No physical tablet FPS, thermal, memory or network-load benchmark was performed.
API/eligibility tests do not establish visual quality or Khmer pronunciation.
The automatic cancellation of legacy mixed online rooms is guarded in the
Worker; an old production Durable Object was not modified to manufacture that
case. Completed histories and ordinary rankings are not reset.

Roster sources, years and unresolved 300+ import are documented in
[catalogue review](../../cambodia-roster-review.md). The remaining work is
tracked in [game completion plan](../../game-completion-plan.md).
