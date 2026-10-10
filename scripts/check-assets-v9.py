"""Verify that the material/garment upgrade preserves the accepted hull."""
import hashlib
import json
import struct
from pathlib import Path


def read(path):
    raw = Path(path).read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    return raw, json.loads(raw[20:20 + size]), raw[28 + size:]


def accessor(doc, binary, index):
    item = doc["accessors"][index]
    view = doc["bufferViews"][item["bufferView"]]
    formats = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[item["type"]]
    fmt = "<" + formats[item["componentType"]] * components
    stride = view.get("byteStride", struct.calcsize(fmt))
    start = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    return [struct.unpack_from(fmt, binary, start + i * stride) for i in range(item["count"])]


def hull(doc):
    node = next(n for n in doc["nodes"] if n.get("name") == "Hull_Watertight_30_20x1_12")
    return doc["meshes"][node["mesh"]]["primitives"][0]


def livery(doc, binary, primitive):
    material = doc["materials"][primitive["material"]]
    texture = doc["textures"][material["pbrMetallicRoughness"]["baseColorTexture"]["index"]]
    image = doc["images"][texture["extensions"]["EXT_texture_webp"]["source"]]
    view = doc["bufferViews"][image["bufferView"]]
    return binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]


old_raw, old, old_bin = read("public/assets/ghe-ngo/ghe-ngo-crew-v8.glb")
new_raw, new, new_bin = read("public/assets/ghe-ngo/ghe-ngo-crew-v9.glb")
a, b = hull(old), hull(new)
checks = {name: accessor(old, old_bin, index) == accessor(new, new_bin, b["attributes"][name]) for name, index in a["attributes"].items()}
checks["indices"] = accessor(old, old_bin, a["indices"]) == accessor(new, new_bin, b["indices"])
old_image, new_image = livery(old, old_bin, a), livery(new, new_bin, b)
checks["ownerLiveryBytes"] = old_image == new_image
checks["hullMaterial"] = old["materials"][a["material"]] == new["materials"][b["material"]]
report = {"asset": "ghe-ngo-crew-v9.glb", "bytes": len(new_raw), "sha256": hashlib.sha256(new_raw).hexdigest(), "baselineSha256": hashlib.sha256(old_raw).hexdigest(), "hullPreservation": checks, "ownerLiverySha256": hashlib.sha256(new_image).hexdigest(), "skinSource": new["extras"]["athleteMaterialSource"], "pass": all(checks.values()), "limits": ["Hull data and original livery preservation; athlete appearance checked visually separately"]}
Path("docs/qa/assets-v9.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
if not report["pass"]:
    raise SystemExit(1)
