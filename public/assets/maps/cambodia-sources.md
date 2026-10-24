# Cambodian riverfront layout and visual references

The game uses mapped landmark positions and original stylised geometry. It is
not a Google Maps 3D reproduction. Local browser access was unavailable; the
user chose maps and field photographs as the reference method.

## Map data

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
The derived database is available as [cambodia-layout.json](cambodia-layout.json)
under ODbL. It includes source way IDs, latitude/longitude, projected hero
footprints, river-bank samples and the supplementary mapped building placements.

Official OSM API extracts, inspected 24 October 2026:

- [Phnom Penh extract](https://api.openstreetmap.org/api/0.6/map?bbox=104.927,11.558,104.944,11.582)
- [Siem Reap extract](https://api.openstreetmap.org/api/0.6/map?bbox=103.854,13.354,103.865,13.366)

Coordinates use a local tangent plane. The river is straightened for the existing
two-lane game, and longitudinal positions are normalised to its 1,700 m / 500 m
distances. The game boundaries are not surveyed official 2026 race boundaries.
Siem Reap has a minimum 38 m playable water corridor, wider than parts of the
mapped river. Bridge positions frame the crossing lines with 30 m source-space
buffers. Buildings retain metre-based dimensions; facades, heights, tree sizes,
traffic distribution and temporary festival structures are estimated art.

## Landmark and event references

- [Royal Palace, Cambodia Ministry of Tourism](https://tourismcambodia.org/provinces/search/detail/127/royal-palace-1548301051): palace complex and 59 m Throne Hall spire.
- [Chan Chhaya Pavilion – Royal Palace](https://commons.wikimedia.org/wiki/File:Chan_Chhaya_Pavilion_-_Royal_Palace.JPG), Kiensvay, 2012, CC BY-SA 3.0: open colonnade, gold tiled roofs with green borders and central spire.
- [National Museum of Cambodia](https://commons.wikimedia.org/wiki/File:National_Museum_of_Cambodia.jpg), Adam Carr, 2002, public domain: red Khmer courtyard building, carved gable and veranda.
- [Royal Residence, Siem Reap](https://commons.wikimedia.org/wiki/File:Cambodia._Siem_Reap._The_Royal_Residence.jpg), Anne and David, 2018, public-domain mark: low white residence, red roof, veranda and projecting central entrance.
- [Siem Reap Water Festival field notes](https://grantourismotravels.com/siem-reap-water-festival/): NR6/Old Stone Bridge start area near the Royal Gardens; road closures during festivities.
- [Preah Ang Chek / Preah Ang Chom](https://helloangkor.com/attractions/preah-ang-chek-preah-ang-chom-temple/): shrine and Royal Gardens context.

Photos were inspected as references, not shipped as building textures. The
lower-detail secondary buildings use 24 mapped Phnom Penh footprints and 13
Siem Reap footprints around the landmark compounds; some overlapping hero
footprints are intentionally represented by their detailed models instead.
The red courtyard model extends the mapped museum wing; the other wings are an
estimated architectural reconstruction, not a complete footprint survey.

## National flag

[Flag of Cambodia (3:2)](https://commons.wikimedia.org/wiki/File:Flag_of_Cambodia_(3-2).svg),
Wikimedia Commons public-domain national flag artwork. The included SVG is the
900 × 600 version, with blue/red/blue bands and the white Angkor Wat emblem.
The game uses one shared texture, fixed hoists and animated free edges. These
flags appear only at the Cambodian venues.

## Remaining limits

Google Maps 3D was not inspected. No numerical visual-similarity percentage has
been established. Street frontage details and the distant city are stylised,
not current building-by-building reconstructions. Main landmark positions and
their ordering are map-derived; precise roof carvings, current construction and
2026 festival installations still need closer field documentation.
