"""Scan discovery + assessment — pure Python (no Blender/GPU).

Part of the v2 mesh-prep pipeline (Open3D + PyMeshLab). Discover RealityScan
exports in a scan directory, pick textures, and assess quality reports from
`prepare_scan()` in `meshprep.py`.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

# Valid piece names: P/N/B/R/Q/K, optional w/b color prefix (case-insensitive),
# optional variant suffix (a number ``2`` or a ``_label`` / ``-label``).
# Normalized to canonical piece ``w/b + UPPER type`` plus a variant slot:
#   wP → (wP, v1)   wP2 → (wP, v2)   wP_glass → (wP, glass)   WQ → (wQ, v1)
_PIECE_NAME = re.compile(r"^([wb]?)([pnbrqk])([0-9]*|[-_].*)?$", re.IGNORECASE)


def parse_piece_name(raw: str) -> tuple[str, str] | None:
    """Parse a scan-folder name into ``(canonical_piece, variant)`` or *None*.

    Canonical piece = lowercase color prefix (default ``w``) + UPPER type letter.
    Variant = ``v<n>`` for a numeric suffix, the bare label for a ``_``/``-`` suffix,
    else ``v1``.  Lets several scans of the same piece coexist as ``v1``, ``v2``, ….
    """
    m = _PIECE_NAME.match(raw)
    if not m:
        return None
    prefix, letter, suffix = m.group(1), m.group(2), (m.group(3) or "").strip()
    canonical = (prefix.lower() or "w") + letter.upper()
    if not suffix:
        variant = "v1"
    elif suffix.isdigit():
        variant = f"v{suffix}"
    else:
        variant = suffix.lstrip("-_") or "v1"
    return canonical, variant

# --- Assessment thresholds for quality reports -----------------------------------
_MAX_BOUNDARY_EDGES = 300       # open edges ≈ holes in the scan
_MAX_NONMANIFOLD = 500
_MIN_VERTS = 1000               # suspiciously few vertices
_HEIGHT_RATIO_RANGE = (0.9, 4.0)  # Height/Base — outside: upright check (knight!)
_MIN_CENTER_COMPONENT_FRAC = 0.5  # below ⇒ figure fragmented across multiple components


def normalize_name(raw: str) -> str:
    """Normalize piece name to canonical form: lowercase prefix + UPPER type letter.

    ``WQ`` / ``wq`` → ``wQ``, ``BK`` / ``bk`` → ``bK``, ``P`` → ``wP`` (no-prefix = white).
    """
    parsed = parse_piece_name(raw)
    return parsed[0] if parsed else raw


def is_bare_piece(raw: str) -> bool:
    """True if ``raw`` is a plain piece name with NO variant suffix (``wP``, ``P``).

    A bare name means "add a new version" — the caller should pick the next free
    variant slot instead of clobbering ``v1``.  ``wP2`` / ``wP_glass`` are explicit.
    """
    return bool(re.fullmatch(r"[wb]?[pnbrqk]", raw, re.IGNORECASE))


def next_variant(piece_dir: Path) -> str:
    """Next free ``v<n>`` slot in a piece folder (``v1`` if empty, else ``v2``, …)."""
    n = 1
    while (Path(piece_dir) / f"v{n}.obj").exists():
        n += 1
    return f"v{n}"


@dataclass(frozen=True)
class ScanItem:
    """One discovered scan ready for preparation."""

    name: str              # canonical piece name, e.g. "wQ" or "wP"
    obj: Path              # .glb/.gltf (texture embedded) or .obj
    tex: Path | None       # texture file (.obj only; .glb → None = auto-extract from material)
    variant: str = "v1"    # variant slot inside the piece folder (v1, v2, glass, …)


def pick_mesh(d: Path) -> Path | None:
    """Pick the best mesh from a scan directory.

    Prefers ``.glb`` / ``.gltf``; else an ``.obj`` named ``mesh_<dir>.obj`` or
    ``<dir>.obj``; else the newest ``.obj`` by modification time.

    Callers must NOT use ``sorted()[0]`` — that picks ``mesh_Model_*.obj``
    (capital M) before ``mesh_bauer2.obj`` on stale RealityScan folders.

    The old ``cropped.obj`` rule is gone: it was written by the deleted FastAPI layer, nothing
    writes it any more, and `collect_scans` went past it anyway — two rules for one question.
    """
    glbs = sorted([*d.glob("*.glb"), *d.glob("*.gltf")])
    if glbs:
        return glbs[0]

    objs = sorted(d.glob("*.obj"))
    if not objs:
        return None

    dir_name = d.name
    for pattern in (f"mesh_{dir_name}.obj", f"{dir_name}.obj"):
        for o in objs:
            if o.name == pattern:
                return o

    return max(objs, key=lambda p: p.stat().st_mtime)


def _pick_texture(d: Path) -> Path | None:
    """Find texture image in a scan directory.

    RealityScan folders also contain turntable *photos* — so DON'T just take the
    largest image.  First look for ``diffuse`` / ``albedo`` / ``tex`` in the name;
    then fall back to the largest non-numeric filename (photos are ``000.jpg``, …).
    """
    imgs = [*d.glob("*.png"), *d.glob("*.jpg"), *d.glob("*.jpeg")]
    # UV-Debug-Muster nie als Textur nehmen (RealityScan exportiert *_unwrap.png daneben).
    imgs = [p for p in imgs if "unwrap" not in p.stem.lower()]
    named = [p for p in imgs if re.search(r"diffuse|albedo|tex", p.stem, re.IGNORECASE)]
    if named:
        return max(named, key=lambda p: p.stat().st_size)
    non_photos = [p for p in imgs if not p.stem.isdigit()]
    if non_photos:
        return max(non_photos, key=lambda p: p.stat().st_size)
    return None


def discover_scans(root: Path) -> tuple[list[ScanItem], list[str]]:
    """Collect RealityScan exports: each subfolder ``<name>/`` → one mesh + texture.

    Prefers ``.glb`` (simplified mesh with embedded texture); falls back to
    ``.obj`` + texture file.  Fixes the ``scans/WQ`` bug: accepts ``WQ`` / ``wq``
    and normalises to ``wQ``.

    Returns ``(items, warnings)``.
    """
    root = Path(root)
    items: list[ScanItem] = []
    warnings: list[str] = []
    if not root.is_dir():
        return items, [f"Scan directory missing: {root}"]
    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        glbs = sorted([*d.glob("*.glb"), *d.glob("*.gltf")])
        objs = sorted(d.glob("*.obj"))
        parsed = parse_piece_name(d.name)
        if parsed is None and (glbs or objs):
            warnings.append(
                f"{d.name}: not a piece name (P/N/B/R/Q/K, optional w/b prefix, "
                "optional variant suffix) — the renderer won't find this template")
        canonical, variant = parsed if parsed else (d.name, "v1")
        if glbs:                                     # preferred: RealityScan-simplified .glb
            if len(glbs) > 1:
                warnings.append(f"{d.name}: multiple .glb — taking {glbs[0].name}")
            # RealityScan .glb often references the texture EXTERNALLY
            # (_diffuse.png next to it) — pass the fallback; embedded textures win
            # automatically in prepare_scan().
            items.append(ScanItem(name=canonical, obj=pick_mesh(d), tex=_pick_texture(d),
                                  variant=variant))
            continue
        tex = _pick_texture(d)
        if not objs or tex is None:
            warnings.append(
                f"{d.name}: skipped (need .glb OR .obj + texture, "
                f"found: {len(objs)} obj, texture: {tex})")
            continue
        chosen = pick_mesh(d)
        if chosen is None:
            warnings.append(f"{d.name}: no mesh found")
            continue
        if len(objs) > 1:
            warnings.append(f"{d.name}: multiple .obj — taking {chosen.name}")
        items.append(ScanItem(name=canonical, obj=chosen, tex=tex, variant=variant))
    return items, warnings


def assess_report(report: dict) -> tuple[str, list[str]]:
    """Assess a quality report from ``prepare_scan()`` → ``('ok'|'warn', hints)``.

    Conservative: warnings are inspection hints (check the preview!), not hard
    errors.  Whether a mesh is good enough is ultimately decided by rendering /
    training results.
    """
    msgs: list[str] = []

    # Nur ueber Zahlen urteilen, die der Bericht WIRKLICH traegt. Seit dem Verbatim-Umbau nennt
    # `prepare_scan` weder `verts` noch die Kantenzaehlungen, und ein fehlender Schluessel als 0
    # gelesen meldete hinter jeder einwandfreien Figur "only None vertices".
    if "verts" in report and report.get("verts", 0) < _MIN_VERTS:
        msgs.append(
            f"only {report.get('verts')} vertices — suspiciously few "
            "(check scan/preview)")
    if report.get("boundary_edges", 0) > _MAX_BOUNDARY_EDGES:
        msgs.append(
            f"{report['boundary_edges']} open edges — holes in scan")
    if report.get("nonmanifold_edges", 0) > _MAX_NONMANIFOLD:
        msgs.append(f"{report['nonmanifold_edges']} non-manifold edges — scan artifacts")

    hr = report.get("height_ratio")
    if hr is not None and not (_HEIGHT_RATIO_RANGE[0] <= hr <= _HEIGHT_RATIO_RANGE[1]):
        msgs.append(
            f"height_ratio={hr} outside {_HEIGHT_RATIO_RANGE} — figure lying/tilting? "
            "check upright alignment in preview (typical with knight)")

    tgt = report.get("target_tris") or 0
    if tgt and report.get("tris_after", 0) > 1.5 * tgt:
        msgs.append(
            f"tris_after={report.get('tris_after')} well above target {tgt} — "
            "decimate didn't take effect?")

    ccf = report.get("center_component_frac")
    if ccf is not None and ccf < _MIN_CENTER_COMPONENT_FRAC:
        msgs.append(
            f"center_component_frac={ccf} < {_MIN_CENTER_COMPONENT_FRAC} — "
            "figure fragmented across multiple components")

    return ("warn" if msgs else "ok"), msgs


def load_report(out_dir: Path, name: str) -> dict | None:
    """Load a previously written ``<name>_report.json``, or *None*."""
    p = Path(out_dir) / f"{name}_report.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))
