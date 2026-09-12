#!/usr/bin/env python3
"""Build transparent dyad layers for Home/School follow-up screens.

The original dyad artwork, captions, labels, eyes, and character pixels stay
unchanged. Only the large or edge-connected pure-white slide background is
made transparent so the already-approved furnished Home or School room can be
shown behind the characters throughout the follow-up questions.
"""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path

import build_home_school_furnished_chs_candidate as furnished_builder


ROOT = Path(__file__).resolve().parents[1]
CANDIDATE_SLUG = "chs-home-school-evelyn-v1"
CANDIDATE_ROOT = ROOT / "versions" / CANDIDATE_SLUG
DYAD_MANIFEST = CANDIDATE_ROOT / "data" / "dyad_manifest.json"
AUDIT_MANIFEST = CANDIDATE_ROOT / "data" / "furnished_dyad_visual_manifest.json"
OUTPUT_ROOT = (
    CANDIDATE_ROOT / "assets" / "home_school" / "foregrounds" / "followups"
)
ORANGE_OUTLINE_REFERENCE = (
    "assets/dyads/sister-kid_01_mks-orange/sister-kid.006.png"
)
TEACHER_CLASSMATE_ROOT = "assets/teacher_classmate/generated/"
TEACHER_CLASSMATE_V78_ROOT = (
    "versions/chs-v78-teacher-classmate-evelyn-unique-roles/"
    "assets/teacher_classmate/generated/"
)
TEACHER_CLASSMATE_V78_DYAD_REVISION = re.compile(
    r"^dyads/classmate-kid_0(?:1_tkc-deep-purple-a|2_tkc-deep-purple-b)/"
    r"slide_(?:0[3-9]|1[0-3])\.svg$"
)


def actual_source(source: str) -> str:
    if not source.startswith(TEACHER_CLASSMATE_ROOT):
        return source
    relative = source[len(TEACHER_CLASSMATE_ROOT):]
    if TEACHER_CLASSMATE_V78_DYAD_REVISION.match(relative):
        return f"{TEACHER_CLASSMATE_V78_ROOT}{relative}"
    return source


def output_relative_path(chunk_id: str, source: str) -> str:
    basename = Path(source.split("?", 1)[0]).with_suffix(".png").name
    return (
        f"versions/{CANDIDATE_SLUG}/assets/home_school/foregrounds/"
        f"followups/{chunk_id}/{basename}"
    )


def prepare_operations(manifest: dict) -> list[furnished_builder.ImageOperation]:
    operations: list[furnished_builder.ImageOperation] = []
    for chunk in manifest.get("chunks", []):
        chunk_id = chunk["id"]
        for index, slide in enumerate(chunk.get("slides", []), start=1):
            source = slide.get("src", "")
            should_render = slide.get("kind") in {"intro", "response"}
            should_render = should_render or source == ORANGE_OUTLINE_REFERENCE
            if not should_render:
                continue
            output = output_relative_path(chunk_id, source)
            slide["homeSchoolForegroundSrc"] = output
            operations.append(
                furnished_builder.ImageOperation(
                    trial_id=chunk_id,
                    condition=chunk.get("scriptKey") or chunk.get("folder") or "DYAD",
                    suffix="DYAD",
                    index=index,
                    source=actual_source(source),
                    output_relative_to_root=output,
                )
            )
    return operations


def build(cache_root: Path) -> None:
    manifest = json.loads(DYAD_MANIFEST.read_text(encoding="utf-8"))
    operations = prepare_operations(manifest)
    if len(operations) != 449:
        raise RuntimeError(f"Expected 449 follow-up foregrounds; got {len(operations)}")

    furnished_builder.render_svg_sources(operations, cache_root)
    audits = []
    for index, operation in enumerate(operations, start=1):
        audit_row = furnished_builder.build_foreground(operation, cache_root)
        # Keep publication metadata portable and avoid recording a developer's
        # absolute local workspace path.
        audit_row["sourceId"] = operation.source
        audits.append(audit_row)
        if index % 40 == 0 or index == len(operations):
            print(f"Built {index}/{len(operations)} follow-up foregrounds")

    DYAD_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    audit = {
        "schemaVersion": 1,
        "status": "visual-assets-complete",
        "candidate": CANDIDATE_SLUG,
        "treatment": "assigned_furnished_home_or_school_room_behind_original_dyad_artwork",
        "sourceTreatment": "original_opaque_rgb_pixels_unchanged",
        "coverage": {
            "chunkCount": len(manifest.get("chunks", [])),
            "foregroundCount": len(audits),
            "contextsSupported": ["HOME", "SCHOOL"],
            "renderedKinds": ["intro", "response"],
            "orangeOutlineReferenceIncluded": True,
        },
        "integrity": {
            "opaqueRgbChangedPixelsAcrossAllFiles": sum(
                row["rgbChangedOpaquePixels"] for row in audits
            ),
            "filesWithPartialAlpha": sum(
                row["partialAlphaPixels"] > 0 for row in audits
            ),
            "allOutputHashesRecorded": True,
        },
        "assets": audits,
    }
    AUDIT_MANIFEST.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {DYAD_MANIFEST}")
    print(f"Wrote {AUDIT_MANIFEST}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path)
    args = parser.parse_args()
    if args.cache:
        args.cache.mkdir(parents=True, exist_ok=True)
        build(args.cache)
        return
    with tempfile.TemporaryDirectory(prefix="home-school-dyad-") as temporary:
        build(Path(temporary))


if __name__ == "__main__":
    main()
