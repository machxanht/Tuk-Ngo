"""Pack a licensed MakeHuman skin and fabric material into the crew GLB.

Only athlete UVs/materials are changed. Hull/livery and baked rig are retained.
The source texture is supplied locally; this script never signs into services.
"""
import argparse
import hashlib
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--skin", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--atlas-dir", required=True)
args = parser.parse_args()
atlas_dir = Path(args.atlas_dir)
atlas_dir.mkdir(parents=True, exist_ok=True)
skin_path = Path(args.skin)
skin = Image.open(skin_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
albedo = Image.new("RGB", (2048, 1024), "white")
albedo.paste(skin, (0, 0))

# Analytic fabric weave and small folds. These are authored material details,
# not generated photographic references or a replacement for garment geometry.
y, x = np.mgrid[0:1024, 0:1024].astype(np.float32)
weave = np.sin(x * np.pi / 2) * np.sin(y * np.pi / 2)
folds = .5 * np.sin(y * .041 + 2 * np.sin(x * .009)) + .3 * np.sin(x * .055 + y * .027)
fabric = np.clip(242 + 5 * weave + 5 * folds, 0, 255).astype(np.uint8)
albedo.paste(Image.fromarray(np.repeat(fabric[..., None], 3, axis=2)), (1024, 0))

gray = np.asarray(skin.convert("L"), dtype=np.float32) / 255
blur = np.asarray(skin.convert("L").filter(ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255
height_skin = (gray - blur) * .12
height_fabric = weave * .06 + folds * 1.4


def normal_from_height(height):
    dy, dx = np.gradient(height)
    normal = np.stack((-dx, dy, np.ones_like(dx)), axis=2)
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    return np.clip((normal * .5 + .5) * 255, 0, 255).astype(np.uint8)


normal = np.concatenate((normal_from_height(height_skin), normal_from_height(height_fabric)), axis=1)
# glTF roughness is the green channel; blue metalness stays zero.
orm = np.zeros((1024, 2048, 3), dtype=np.uint8)
orm[..., 0] = 255
orm[:, :1024, 1] = np.clip(151 + (gray - blur) * 80, 130, 175)
orm[:, 1024:, 1] = np.clip(235 + weave * 5, 225, 245)
# Constant UV used for garment binding. Keep the corner neutral for tinting.
albedo.paste((255, 255, 255), (2040, 1016, 2048, 1024))
normal[1016:, 2040:] = (128, 128, 255)
orm[1016:, 2040:, 1] = 235
paths = [atlas_dir / "athlete-albedo.webp", atlas_dir / "athlete-normal.png", atlas_dir / "athlete-roughness.png"]
albedo.save(paths[0], quality=90, method=6)
Image.fromarray(normal).save(paths[1], optimize=True)
Image.fromarray(orm).save(paths[2], optimize=True)

raw = Path(args.input).read_bytes()
json_length = struct.unpack_from("<I", raw, 12)[0]
doc = json.loads(raw[20:20 + json_length])
binary = bytearray(raw[28 + json_length:])


def append(data, target=None):
    binary.extend(b"\0" * (-len(binary) % 4))
    view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
    if target:
        view["target"] = target
    doc["bufferViews"].append(view)
    binary.extend(data)
    return len(doc["bufferViews"]) - 1


sampler = len(doc.setdefault("samplers", []))
doc["samplers"].append({"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071})
textures = []
for path in paths:
    image_index = len(doc.setdefault("images", []))
    webp = path.suffix == ".webp"
    doc["images"].append({"bufferView": append(path.read_bytes()), "mimeType": "image/webp" if webp else "image/png"})
    texture = {"sampler": sampler}
    if webp:
        texture["extensions"] = {"EXT_texture_webp": {"source": image_index}}
    else:
        texture["source"] = image_index
    textures.append(len(doc.setdefault("textures", [])))
    doc["textures"].append(texture)

mapped_uvs = {}
athlete_materials = {}
seen_meshes = set()
for node in doc["nodes"]:
    if "mesh" not in node or node["mesh"] in seen_meshes:
        continue
    name = node.get("name", "")
    if name.startswith("MakeHuman_Athlete_Body"):
        kind = "skin"
    elif name.startswith("Athlete_") and any(part in name for part in ("jersey", "shorts")):
        kind = "binding" if "binding" in name else "cloth"
    else:
        continue
    seen_meshes.add(node["mesh"])
    mesh = doc["meshes"][node["mesh"]]
    for primitive in mesh["primitives"]:
        attrs = primitive["attributes"]
        if "TEXCOORD_0" in attrs:
            accessor_index = attrs["TEXCOORD_0"]
            if accessor_index in mapped_uvs:
                assert mapped_uvs[accessor_index] == kind
            else:
                accessor = doc["accessors"][accessor_index]
                assert accessor["componentType"] == 5126 and accessor["type"] == "VEC2"
                view = doc["bufferViews"][accessor["bufferView"]]
                offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
                stride = view.get("byteStride", 8)
                for i in range(accessor["count"]):
                    u, v = struct.unpack_from("<2f", binary, offset + i * stride)
                    struct.pack_into("<2f", binary, offset + i * stride, u * .5 + (0 if kind == "skin" else .5), v)
                accessor.pop("min", None)
                accessor.pop("max", None)
                mapped_uvs[accessor_index] = kind
        else:
            count = doc["accessors"][attrs["POSITION"]]["count"]
            view_index = append(struct.pack("<2f", .998, .998) * count, 34962)
            attrs["TEXCOORD_0"] = len(doc["accessors"])
            doc["accessors"].append({"bufferView": view_index, "componentType": 5126, "count": count, "type": "VEC2"})
        athlete_materials[primitive["material"]] = kind

skin_tints = [(.62, .46, .33, 1), (.54, .38, .27, 1), (.74, .56, .40, 1), (.64, .48, .34, 1)]
skin_number = 0
for index, kind in athlete_materials.items():
    material = doc["materials"][index]
    pbr = material.setdefault("pbrMetallicRoughness", {})
    if kind == "skin":
        pbr["baseColorFactor"] = skin_tints[skin_number % len(skin_tints)]
        skin_number += 1
    pbr.update({"baseColorTexture": {"index": textures[0]}, "roughnessFactor": 1, "metallicFactor": 0, "metallicRoughnessTexture": {"index": textures[2]}})
    material["normalTexture"] = {"index": textures[1], "scale": .65}
    material["name"] = material.get("name", "Athlete") + "_PBR_Atlas"
    material.setdefault("extras", {})["athleteAtlas"] = "MAKEHUMAN_CC0_V9"

doc.setdefault("extras", {})["athleteMaterialSource"] = {
    "license": "CC0",
    "author": "MakeHuman Community / Data Collection AB, Joel Palmius, Jonas Hauquier",
    "source": "https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html",
    "skin": "young_asian_male/young_lightskinned_male_diffuse3.png",
    "sha256": hashlib.sha256(skin_path.read_bytes()).hexdigest(),
    "fabric": "authored analytic weave; normal/roughness derived for this game",
}
binary.extend(b"\0" * (-len(binary) % 4))
doc["buffers"][0]["byteLength"] = len(binary)
encoded = json.dumps(doc, separators=(",", ":")).encode()
encoded += b" " * (-len(encoded) % 4)
result = struct.pack("<5I", 0x46546C67, 2, 28 + len(encoded) + len(binary), len(encoded), 0x4E4F534A)
result += encoded + struct.pack("<2I", len(binary), 0x004E4942) + binary
Path(args.output).write_bytes(result)
report = {"output": args.output, "bytes": len(result), "materials": len(athlete_materials), "textureSize": [2048, 1024], "skinSourceSha256": doc["extras"]["athleteMaterialSource"]["sha256"], "maps": [{"file": str(p), "bytes": p.stat().st_size} for p in paths]}
(atlas_dir / "atlas-manifest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report))
