# Tuk-Ngo — river and tablet preview

React/Vite/Three.js app. The original technical-reference panels remain available. The active river preview uses the Quaternius CC0 humanoid instead of generated primitive-body athletes.

## Run and build

```sh
npm ci
npm run dev
npm run lint
npm run build
```

Vite base: `/Tuk-Ngo/` for GitHub Pages. Fullscreen tablet preview: `?demo=race`. Drag to orbit, pinch to zoom, choose overview/follow/athlete/bow cameras, pause/reset, change cadence, toggle splashes or battery-saving resolution.

## Assets and effects

- `public/assets/human/quaternius-athlete.glb`: Quaternius Universal Base Characters, CC0. Attribution and preserved license are beside it.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, uniform colors/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water, banks/trees/buoys, droplet/ripple pool triggered by paddle contact.
- **Tải GLB** downloads the prebuilt boat with 55 rigged athletes and a rowing loop (8.74 MB, duplicate buffers removed without reducing the body geometry). Water particles are realtime app effects.
- Direct asset: `public/assets/ghe-ngo/ghe-ngo-crew.glb`. Original body source: `public/assets/human/quaternius-athlete.glb`.

Source is on `main`; the static production build is on `gh-pages`. The scene is not motion capture or a hydrodynamics measurement. Tablet-size browser QA does not replace testing on a physical tablet.
