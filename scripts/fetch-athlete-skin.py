"""Fetch only the CC0 young Asian male skin from the official asset pack."""
import hashlib
import json
import struct
import sys
import urllib.request
import zlib
from pathlib import Path

URL = "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
EXPECTED = "f50016a5507fc687dc8df06599c8ea48de950cd185de33a71cafc1319ddab4d5"
target = Path(sys.argv[1])
target.mkdir(parents=True, exist_ok=True)
skin = target / "young_lightskinned_male_diffuse3.png"
if skin.exists() and hashlib.sha256(skin.read_bytes()).hexdigest() == EXPECTED:
    print("Verified cached CC0 skin: " + str(skin))
    sys.exit(0)


def fetch_range(value):
    with urllib.request.urlopen(urllib.request.Request(URL, headers={"Range": value}), timeout=60) as response:
        if response.status != 206:
            raise RuntimeError("Official mirror did not honor byte range; no full archive fetched")
        return response.read()


tail = fetch_range("bytes=-65536")
reports = []
position = 0
while True:
    position = tail.find(b"PK\x01\x02", position)
    if position < 0:
        break
    header = struct.unpack_from("<4s6H3I5H2I", tail, position)
    name_size, extra_size, comment_size = header[10:13]
    name = tail[position + 46:position + 46 + name_size].decode("utf-8")
    position += 46 + name_size + extra_size + comment_size
    if not name.startswith("skins/young_asian_male/") or name.endswith("/"):
        continue
    start, size = header[-1], header[8]
    data = fetch_range(f"bytes={start}-{start + 30 + name_size + size + 256}")
    local = struct.unpack_from("<4s5H3I2H", data)
    assert local[0] == b"PK\x03\x04"
    offset = 30 + local[-2] + local[-1]
    compressed = data[offset:offset + size]
    raw = zlib.decompress(compressed, -15) if header[4] == 8 else compressed
    if len(raw) != header[9] or zlib.crc32(raw) != header[7]:
        raise RuntimeError("Asset ZIP integrity check failed: " + name)
    destination = target / Path(name).name
    if destination == skin and hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise RuntimeError("Skin changed upstream; inspect its provenance before use")
    destination.write_bytes(raw)
    reports.append({"entry": name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
if not skin.exists():
    raise RuntimeError("Skin not found in official asset pack")
(target / "source.json").write_text(json.dumps({"source": URL, "license": "CC0", "files": reports}, indent=2), encoding="utf-8")
print("Fetched and verified CC0 skin: " + str(skin))
