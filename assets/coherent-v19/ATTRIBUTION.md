# Coherent sample V19 — sources and redistribution

This folder is a visual quality sample: one generic seated rower, three civilian characters and the accepted static ghe hull. It is not a reconstruction of an identifiable athlete or a completed Maspero map.

## Athlete and clothing

- Anatomical mesh, face, fingers and 53-bone skeleton: MakeHuman/MPFB, packaged as CC0 by [Innerscene](https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1). Original source and its hash are preserved in `../human/makehuman-athlete-base.glb` and `../human/ATTRIBUTION.md`.
- Generic skin diffuse: `young_asian_male/young_lightskinned_male_diffuse3.png` from the [official MakeHuman CC0 system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), Data Collection AB, Joel Palmius and Jonas Hauquier. Original image pixels are unchanged; glTF baseColorFactor applies one warm tint.
- Kit and paddle forms: [Duy Tân / Thanh Niên, 15 November 2024](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm), photos 8 and 11. Stroke sequence: [Báo Sóc Trăng 2024 race video](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/), 104–107 seconds. Press media are reference only, not republished as game textures or audio. Dimensions and animation are authored estimates, not motion capture.
- New authored welded green jersey, tailored anatomical shorts, fitted baseball cap, rounded wooden paddle and Khmer back print `កូនខ្មែរ`. Shirt/shorts have frame-specific contact morphs; body and eye openings are edited from the licensed source. These are intended to be editable game assets, not scans.

## Three civilians

- [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html), `Casual_2` and `Casual_Hoodie`.
- [Quaternius Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html), `Casual`.
- CC0 glTF files retrieved from the openly attributed [agentkaerf/FreeModels mirror](https://github.com/agentkaerf/FreeModels) after the official Drive download returned quota errors. Conversion provenance is distinct from direct official delivery.
- The three source actions `Idle`, `Idle_Neutral`, `Wave` are preserved. The mesh is welded and subdivided once before skinning; no isolated-tile subdivision was accepted. Faces remain simple stylized faces; the two men share one source head family. They are not three independent photoreal scans.

## Hull, environment and lighting

- `accepted-hull.glb` is extracted from the project's accepted authored hull. Hull/kbach shape is retained. Only the midship standing platform is omitted at runtime in this isolated seated study so it cannot intersect the rower's thighs.
- Daylight: [Poly Haven Syferfontein 0d Clear](https://polyhaven.com/a/syferfontein_0d_clear), CC0, original 1K HDR. Other bank material sources remain in the project's existing material attribution.
- The 50 m street, seven houses, sidewalk, trees and two cars are authored geometry informed by regional building forms. They are not Google 3D tiles or measured Maspero buildings. Cars and foliage remain simplified game geometry.

All acquired models/HDR in this folder use [CC0](https://creativecommons.org/publicdomain/zero/1.0/). No Renderpeople or Adobe/Mixamo model is included; no account signup or payment was performed. No ChatGPT-generated image is used as reference evidence.

See `docs/coherent-sample-v19.md`, the asset manifest, conversion helpers, saved Blender scene and visual QA in the source repository. File hashes describe delivery identity, not visual quality.
