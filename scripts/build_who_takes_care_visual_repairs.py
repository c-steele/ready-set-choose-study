#!/usr/bin/env python3
"""Candidate-only correction of native palette masks; source artwork is immutable.

The classroom's older wood-neutralization rectangles accidentally included floor.
Restore only that exposed floor from its original, geometrically identical master.
Entrance variants remap existing lavender pigment to each assigned palette. No
objects, illustrations, character assets, or shared study files are regenerated.
"""
from __future__ import annotations

import argparse
import colorsys
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "versions/chs-home-school-evelyn-v1"
VERSION = "who-takes-care-visual-repair-v1"
OUTPUT = CANDIDATE / "assets/visual-repair-v1"
MASTER = OUTPUT / "source-school-room.webp"
OLD_ROOM = "school_room_subtle_palette_wall_matched_pillows_v12.webp"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def floor_mask(master: Image.Image) -> Image.Image:
    """Fixed source-space floor selection excludes wood furniture and blue trim.

    Rectangles cover the two erroneous mask footprints, including their one-pixel
    blur fringes. The natural floor has a distinct brown hue/saturation from the
    orange furniture. Fixed furniture silhouette cutouts protect contact edges;
    source color selection excludes the baseboard and furniture antialiasing.
    This mask is derived once from the immutable master, never from a palette.
    """
    assert master.size == (1536, 1024)
    hsv = np.asarray(master.convert("HSV"))
    h, s, _ = hsv.transpose(2, 0, 1)
    region = Image.new("L", master.size)
    draw = ImageDraw.Draw(region)
    draw.rectangle((116, 594, 529, 633), fill=255)
    draw.rectangle((1121, 594, 1535, 637), fill=255)
    # Teacher desk: panel, front feet, and the two rear feet, traced in the
    # original 1536 x 1024 illustration. Shadows remain part of the floor.
    draw.polygon([(141, 594), (165, 594), (165, 622), (162, 628), (146, 629), (141, 625)], fill=0)
    draw.rectangle((163, 594, 426, 600), fill=0)
    draw.polygon([(187, 596), (214, 596), (214, 605), (209, 610), (190, 610), (187, 607)], fill=0)
    draw.polygon([(425, 594), (450, 594), (450, 622), (445, 629), (427, 629), (425, 625)], fill=0)
    draw.polygon([(454, 594), (476, 594), (476, 604), (470, 611), (455, 611)], fill=0)
    # The cubby body's lower and right edges are included in its protection.
    draw.polygon([(1156, 594), (1520, 594), (1520, 623), (1516, 628), (1163, 628), (1157, 623)], fill=0)
    mask = (np.asarray(region) > 0) & (h >= 14) & (h <= 21) & (s >= 35) & (s <= 145)
    return Image.fromarray(mask.astype(np.uint8) * 255)


def hallway_mask(source: Image.Image) -> Image.Image:
    """Only original lavender/purple pigment; wood, plants and glass are excluded."""
    h, s, _ = np.asarray(source.convert("HSV")).transpose(2, 0, 1)
    return Image.fromarray(((h >= 180) & (h <= 244) & (s >= 6)).astype(np.uint8) * 255)


def recolor_hallway(source: Image.Image, mask: Image.Image, accent: str) -> Image.Image:
    rgb = np.asarray(source, dtype=np.float64)
    hsv = np.asarray(source.convert("HSV")).copy()
    color = tuple(int(accent[i:i + 2], 16) / 255 for i in (1, 3, 5))
    target_hue, target_saturation, _ = colorsys.rgb_to_hsv(*color)
    hsv[:, :, 0] = round(target_hue * 255)
    # Preserve the source's gentle wall/stronger trim distinction. The gray
    # condition receives genuinely neutral walls and trim.
    hsv[:, :, 1] = np.rint(hsv[:, :, 1].astype(float) * min(1.0, target_saturation / 0.69)).astype(np.uint8)
    colored = np.asarray(Image.fromarray(hsv, "HSV").convert("RGB"), dtype=np.float64)
    weights = np.array([0.299, 0.587, 0.114])
    old_y = rgb @ weights
    # Correct luminance without moving any spatial pixel; clipping is corrected
    # iteratively so saturated trim remains equally light across hues.
    for _ in range(5):
        colored = np.clip(colored + (old_y - colored @ weights)[:, :, None], 0, 255)
    output = rgb.astype(np.uint8)
    selected = np.asarray(mask) > 0
    output[selected] = np.rint(colored[selected]).astype(np.uint8)
    return Image.fromarray(output)


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", lossless=True, method=6)


def build(floor_master: Path | None, update_manifests: bool) -> dict:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if not MASTER.exists():
        if not floor_master:
            raise SystemExit("First build requires --floor-master pointing to the original clean classroom master")
        shutil.copyfile(floor_master, MASTER)
    elif floor_master and sha(floor_master) != sha(MASTER):
        raise SystemExit("Provided master does not match the preserved candidate master")

    event_path = CANDIDATE / "data/ksize_manifest.json"
    event = json.loads(event_path.read_text())
    palette_hex = {trial["homeSchoolFurnished"]["paletteSlug"]: trial["homeSchoolFurnished"]["characterHex"] for trial in event["trials"] if trial.get("homeSchoolFurnished")}
    assert len(palette_hex) == 17
    master = Image.open(MASTER).convert("RGB")
    mask = floor_mask(master)
    mask.save(OUTPUT / "school-floor-mask.png")
    halls = {place: Image.open(CANDIDATE / f"assets/entrance/{place}-hall.webp").convert("RGB") for place in ("house", "school")}
    hall_masks = {place: hallway_mask(hall) for place, hall in halls.items()}
    for place, hall_mask in hall_masks.items():
        hall_mask.save(OUTPUT / f"{place}-hall-palette-mask.png")

    manifest = {
        "version": VERSION,
        "scope": "Who Takes Care candidate only; original and shared assets preserved",
        "sourceFloorMaster": relative(MASTER),
        "sourceFloorMasterSha256": sha(MASTER),
        "floorRepair": "Restore original exposed wooden floor and contact shadows within the two faulty furniture recoloring footprints; fixed source-derived mask excludes furniture and baseboard",
        "floorMask": relative(OUTPUT / "school-floor-mask.png"),
        "floorMaskSha256": sha(OUTPUT / "school-floor-mask.png"),
        "floorMaskPixelCount": int(np.count_nonzero(np.asarray(mask))),
        "hallwayTreatment": "Remap source lavender pigment to assigned character hue with original geometry and luminance; natural green, wood, blue glass and neutral pixels unchanged; gray palette receives zero saturation",
        "hallwaySources": {place: {"source": relative(CANDIDATE / f"assets/entrance/{place}-hall.webp"), "sourceSha256": sha(CANDIDATE / f"assets/entrance/{place}-hall.webp"), "mask": relative(OUTPUT / f"{place}-hall-palette-mask.png")} for place in halls},
        "palettes": {},
    }
    for slug, accent in sorted(palette_hex.items()):
        destination = OUTPUT / slug
        source_path = ROOT / f"assets/home_school/furnished_color_group_preview/{slug}/{OLD_ROOM}"
        source = Image.open(source_path).convert("RGB")
        assert source.size == master.size
        repaired = Image.composite(master, source, mask)
        room_path = destination / "school-room.webp"
        save_webp(repaired, room_path)
        record = {"characterHex": accent, "schoolRoomSource": relative(source_path), "schoolRoomSourceSha256": sha(source_path), "schoolBackground": relative(room_path), "schoolBackgroundSha256": sha(room_path)}
        for place, source_hall in halls.items():
            hall_path = destination / f"{place}-hall.webp"
            save_webp(recolor_hallway(source_hall, hall_masks[place], accent), hall_path)
            record[f"{place}Hall"] = relative(hall_path)
            record[f"{place}HallSha256"] = sha(hall_path)
        manifest["palettes"][slug] = record
        print(f"Built {slug}", flush=True)
    manifest_path = CANDIDATE / "data/visual_repair_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    if update_manifests:
        for trial in event["trials"]:
            visual = trial.get("homeSchoolFurnished")
            if visual:
                visual["schoolBackground"] = manifest["palettes"][visual["paletteSlug"]]["schoolBackground"]
                visual["backgroundRepairVersion"] = VERSION
        event_path.write_text(json.dumps(event, indent=2) + "\n")
        visual_path = CANDIDATE / "data/furnished_visual_manifest.json"
        visual = json.loads(visual_path.read_text())
        visual["selection"]["schoolBackgroundFilename"] = "school-room.webp"
        visual["selection"]["schoolBackgroundRepairVersion"] = VERSION
        visual["selection"]["schoolBackgroundRepairManifest"] = "data/visual_repair_manifest.json"
        visual_path.write_text(json.dumps(visual, indent=2) + "\n")
    return manifest


def review_sheet(manifest: dict) -> None:
    """Inspection-only montages; production scenes never use these resized images."""
    review = CANDIDATE / "review/visual-repair-v1"
    review.mkdir(parents=True, exist_ok=True)
    slugs = list(manifest["palettes"])
    sheet = Image.new("RGB", (1260, 17 * 270), "white")
    draw = ImageDraw.Draw(sheet)
    for row, slug in enumerate(slugs):
        record = manifest["palettes"][slug]
        draw.text((8, row * 270 + 5), slug, fill="black")
        for column, key in enumerate(("houseHall", "schoolHall", "schoolBackground")):
            source = Image.open(ROOT / record[key]).convert("RGB")
            source.thumbnail((412, 240))
            sheet.paste(source, (column * 420, row * 270 + 25))
    sheet.save(review / "all-palettes.jpg", quality=94)
    example = manifest["palettes"]["mkd-skb-pink-f19ac8"]
    before = Image.open(ROOT / example["schoolRoomSource"]).convert("RGB")
    after = Image.open(ROOT / example["schoolBackground"]).convert("RGB")
    crops = Image.new("RGB", (1536, 360), "white")
    crops.paste(before.crop((0, 540, 1536, 710)), (0, 20))
    crops.paste(after.crop((0, 540, 1536, 710)), (0, 190))
    d = ImageDraw.Draw(crops)
    d.text((6, 3), "Before", fill="black")
    d.text((6, 173), "After: original floor restored", fill="black")
    crops.save(review / "school-floor-before-after.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--floor-master", type=Path)
    parser.add_argument("--update-manifests", action="store_true")
    args = parser.parse_args()
    built = build(args.floor_master, args.update_manifests)
    review_sheet(built)
    print(f"Complete: {len(built['palettes'])} palettes; {built['floorMaskPixelCount']} protected-source floor pixels restored per classroom.")
