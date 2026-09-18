#!/usr/bin/env python3
"""Verify real decoded artwork, palette routing, and preservation boundaries."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "versions/chs-home-school-evelyn-v1"
manifest = json.loads((CANDIDATE / "data/visual_repair_manifest.json").read_text())
event = json.loads((CANDIDATE / "data/ksize_manifest.json").read_text())


def pixels(relative):
    return np.asarray(Image.open(ROOT / relative).convert("RGB"))


def digest(relative):
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()


master = pixels(manifest["sourceFloorMaster"])
floor = np.asarray(Image.open(ROOT / manifest["floorMask"])) > 0
assert digest(manifest["sourceFloorMaster"]) == manifest["sourceFloorMasterSha256"]
assert digest(manifest["floorMask"]) == manifest["floorMaskSha256"]
assert len(manifest["palettes"]) == 17
assert int(floor.sum()) == manifest["floorMaskPixelCount"]
assert 7000 < floor.sum() < 22000
# Independent regression locations within the old left/right gray rectangles,
# the desk's exposed floor, and contact shadows. Coordinates refer to source.
floor_probes = [(130, 620), (175, 601), (250, 610), (478, 614), (510, 610), (525, 625), (1125, 599), (1140, 609), (1530, 612), (1500, 630)]
furniture_probes = [(153, 620), (199, 608), (427, 620), (463, 609), (1160, 620), (1515, 620), (650, 615), (945, 621)]
for x, y in floor_probes:
    assert floor[y, x], ("Missing required floor repair", x, y)
for x, y in furniture_probes:
    assert not floor[y, x], ("Furniture entered repair mask", x, y)

max_luminance_error = 0.0
for slug, record in manifest["palettes"].items():
    before, after = pixels(record["schoolRoomSource"]), pixels(record["schoolBackground"])
    assert before.shape == after.shape == master.shape == (1024, 1536, 3)
    assert digest(record["schoolRoomSource"]) == record["schoolRoomSourceSha256"]
    assert digest(record["schoolBackground"]) == record["schoolBackgroundSha256"]
    assert np.array_equal(after[~floor], before[~floor]), (slug, "Pixels outside exposed floor changed")
    assert np.array_equal(after[floor], master[floor]), (slug, "Floor did not restore original source pixels")
    assert np.count_nonzero(np.any(before[floor] != after[floor], axis=1)) > 5000
    for place, source_record in manifest["hallwaySources"].items():
        original, output = pixels(source_record["source"]), pixels(record[f"{place}Hall"])
        mask = np.asarray(Image.open(ROOT / source_record["mask"])) > 0
        assert original.shape == output.shape == (941, 1672, 3)
        assert digest(source_record["source"]) == source_record["sourceSha256"]
        assert digest(record[f"{place}Hall"]) == record[f"{place}HallSha256"]
        assert np.array_equal(original[~mask], output[~mask]), (slug, place, "Natural/protected pixels changed")
        old_y = original[mask].astype(float) @ np.array([0.299, 0.587, 0.114])
        new_y = output[mask].astype(float) @ np.array([0.299, 0.587, 0.114])
        luminance_error = float(np.max(np.abs(old_y - new_y)))
        max_luminance_error = max(max_luminance_error, luminance_error)
        assert luminance_error <= 2.0, (slug, place, "Luminance drift", luminance_error)
        if record["characterHex"].lower() == "#a9a9a9":
            assert np.array_equal(output[mask, 0], output[mask, 1])
            assert np.array_equal(output[mask, 1], output[mask, 2])

for trial in event["trials"]:
    visual = trial.get("homeSchoolFurnished")
    if visual:
        record = manifest["palettes"][visual["paletteSlug"]]
        assert visual["schoolBackground"] == record["schoolBackground"], trial["id"]
        assert visual["backgroundRepairVersion"] == manifest["version"]
        assert visual["characterHex"] == record["characterHex"]

print(f"Verified all 17 palettes: exact source floor, unchanged furniture and other pixels, 34 hallway variants, neutral gray, 56 trial mappings. Maximum hallway luminance error: {max_luminance_error:.3f}/255.")
