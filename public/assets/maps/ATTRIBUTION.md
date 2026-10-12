# Maspéro derived layout

© OpenStreetMap contributors. The coordinate data in `maspero-osm-layout.json` is derived from OpenStreetMap and is available under the [Open Database License1.0](https://opendatacommons.org/licenses/odbl/1-0/). [Copyright and attribution](https://www.openstreetmap.org/copyright). Retrieved2026-10-12 through Overpass. No Google Maps tiles, screenshots or extracted mesh are redistributed.

Source features:

- River water polygon: https://www.openstreetmap.org/way/1428433854
- Cầu Quay/C247 centreline: https://www.openstreetmap.org/way/130065828
- Cầu Ba Mươi Tháng Tư centreline: https://www.openstreetmap.org/way/668449647

The derived vector dataset is included publicly under the same ODbL license. Coordinates are projected to the game's existing X940–1340 reach; the bridge-centre span in this source is about346m and is scaled to400game units. This is not a survey or a claim of exact metric accuracy. The resulting central water width is about58–61game units. Outside the sampled focus reach, bank edges are held at their nearest endpoint and scenery is authored/simplified.

Building heights, house style, trees, road widths, grandstand details and bridge elevations are authored from the previously inspected real photographs/videos or are approximate. They are not extracted Google3D geometry. Only the river outline and bridge directions are taken from this licensed coordinate data. See repository `docs/course-hull-v15.md` for assumptions and verification.


## Building footprints added in V16

The bounded Maspéro building extract is © OpenStreetMap contributors, Overture Maps Foundation, Microsoft ML Buildings and Google Open Buildings, under ODbL1.0. Source GeoJSON and individual original-source records: [maspero-buildings.geojson](maspero-buildings.geojson). [Provenance and license](maspero-buildings-provenance.md). Release2026-09-23.1 contains557 selected polygons;318 are rendered after clipping the game focus extent and avoiding authored road/stand/bridge areas. All source heights are unknown. Game heights, facades and roof designs are authored; the data does not establish unchanged2025 appearance. Derived projected data is distributed under ODbL in src/race/data/maspero-buildings.json and reproducible with scripts/project-maspero-buildings.py.
