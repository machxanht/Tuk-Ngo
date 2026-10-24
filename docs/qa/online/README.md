# Online verification

`server.json` records an actual race between two WebSocket clients against the public Cloudflare Worker, including authority, reconnection and exactly-once Elo checks. `disconnect.json` records staggered dual disconnection without a false winner and a single disconnection with a real grace timeout and rating settlement. All tests use secret-authorized isolated QA queues and rankings; they do not add entries to the public leaderboard.

`browser-local.json` records two independent Edge browser processes loading the local production build and connecting to the public Worker. It covers actual keyboard controls, boost drain, steering, private-room setup, online no-pause behavior, network loss, page reload, a full finish and the visible leaderboard. Its twelve layout cases cover Việt, Khmer and English on phone and tablet viewports. No race time or position is set by the test.

`offline.json` records the original two-button, trusted browser orientation emulation, stamina, practice, AI and six-race 61-team cup regression. Sensor emulation is not a physical tablet test.

Public Pages verification and release identifiers are added in the deployment record after publishing. This evidence does not claim a load test, physical tablet benchmark or native Khmer language review.
