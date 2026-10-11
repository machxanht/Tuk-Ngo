# V12: bow caller inside hull and the 2025 men's final eight

The bow caller now sits at the inner edge of the raised foredeck facing the crew. Both feet are down in the open hull (approximately X=10.07m, Y=0.243m), rather than crouching with feet on the raised deck. The V12 editable Blender file retains the accepted V11 anatomy and the other 54 actors. The same corrected caller tracks are used for base and sprint. Existing hull construction, boat-water masking, spectators and gameplay rules remain.

## Eight selectable boats

Studio and the playable game use the same eight identities. Open **Chọn đội 2025 · Hai ghe** in the studio to select each lane. Game selection is available before starting and while paused. Two different teams race at once; selecting eight identities does not create an eight-lane course. Each team has a downloadable, embedded-texture GLB with 55 actors and both animation clips.

The ranked four are Tum Núp 2, Prêk On Đơk 2, Prếk Ta Cuôl / Trà Cuôn and Chrôi Tưm Chắs / Trà Tim cũ. The other quarter-finalists are Om Pou Year, Kos Thum 1, Pôthi Satharam 2 and Pôthi Khsach. They are shown as **Tứ kết** without invented individual places 5–8. See [results evidence](top-eight-2025-results.md) for primary reports, the official broadcaster and roster/commentary limitations.

Kit colors derive from the 2025 quarter-finals: green/white Tum Núp; yellow/yellow Prêk On Đơk; purple/yellow Trà Cuôn; red/white sleeves/red caps Trà Tim; orange-red/red caps Om Pou Year; yellow/yellow Kos Thum; mixed red/orange, dark sleeves and mostly orange with some green caps Satharam; green-to-yellow/white sleeves/red caps Pôthi Khsach. Shorts, exact sponsor marks and all role clothing are not fully established. The back print **កូនខ្មែរ** remains the owner's requested custom lettering. Modeled cap orientations remain mixed, rather than asserting an exact historic orientation count for each team.

## Kbach and limits

Eight authored vector textures use directly inspected real on-land vlog footage; they contain no generated-image reference and no copied video/photo pixels. Repeated visible motif families and palettes are reconstructed, not digitized brush-for-brush paint. [Appearance evidence](top-eight-2025-appearance.md) lists links, timestamps and ambiguous fleet assignments.

Strong named land detail exists for Trà Cuôn's green scales/blue base, Prêk On Đơk's orange/gold scroll with diagonal separators and Pôthi Khsach's pink/gold animal with red/orange scroll. Tum Núp uses the visible green scrolling hull from the 2025 training fleet. Trà Tim uses the flower/oval-band boat carried at 800s, not the blue lotus-pattern spare left in the shelter at 250s. Kos Thum's black/green/gold candidate comes from a multi-boat launch; an exact team-1 hull match remains unconfirmed. Om Pou Year's visible bow ornament is extended across an obscured middle. Satharam's final red paint and Khmer name band are retained without inventing a concealed lower frieze. Thus **eight playable/exportable variants are implemented; eight exact tournament-livery replicas are not verified**.

The boats share the accepted hull silhouette and dimensions. Exact individual 2025 hull measurements, carved end shapes and different equipment layouts have not been recovered. Scene lighting affects apparent color. These limits must not be replaced by an “exact top-eight reproduction” claim.

## Rebuild and verify

`node scripts/plan-crew-support.mjs` and Blender `scripts/repose-bow-caller.py` update the existing editable V11 source into V12; deduplicate the crew-only export and merge with `scripts/merge-role-crew.mjs`. The existing `build-role-crew.ps1` full-source path also targets V12.

`node scripts/build-team-liveries-2025.mjs` writes eight SVG liveries. With Vite running, open `/Tuk-Ngo/scripts/export-team-assets-2025.html` to regenerate embedded-texture team GLBs from the V12 template. Deduplicate each downloaded file into `public/assets/ghe-ngo/teams-2025/` with `gltf-transform dedup`; check them with `node scripts/check-team-assets-2025.mjs`. The game downloads these validated files directly, avoiding GLB baking in tablet memory.

Affected checks are `check-role-crew.mjs`, `check-role-runtime.mjs`, `check-team-assets-2025.mjs`, `check-gameplay.mjs`, TypeScript and the production build. Browser evidence in `docs/qa/crew-v12/` covers eight real selections/downloads, both tablet viewports, normal/sprint water, actual game start/input/pause/resume and a team change while paused. Caller diagnostics hide the toolbar to expose foot placement. Physical tablet performance and complete paint/garment fidelity remain unverified.

The stable links remain `?demo=studio`, `?demo=play` and `?demo=art` under the existing GitHub Pages site.
