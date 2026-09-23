"""Scan discovery and assessment, pure Python: find RealityScan exports, pick textures, assess
`meshprep.prepare_scan` reports.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# P/N/B/R/Q/K with optional w/b prefix and variant suffix:
#   wP -> (wP, v1)   wP2 -> (wP, v2)   wP_glass -> (wP, glass)   WQ -> (wQ, v1)
_PIECE_NAME = re.compile(r"^([wb]?)([pnbrqk])([0-9]*|[-_].*)?$", re.IGNORECASE)


def parse_piece_name(raw: str) -> tuple[str, str] | None:
    """Parse a scan-folder name into `(canonical_piece, variant)` or None."""
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

_MAX_BOUNDARY_EDGES = 300       # open edges ≈ holes in the scan
_MAX_NONMANIFOLD = 500
_MIN_VERTS = 1000               # suspiciously few vertices
_HEIGHT_RATIO_RANGE = (0.9, 4.0)  # Height/Base — outside: upright check (knight!)
_MIN_CENTER_COMPONENT_FRAC = 0.5  # below ⇒ figure fragmented across multiple components


def is_bare_piece(raw: str) -> bool:
    """True if `raw` is a plain piece name with NO variant suffix: the caller picks the next free
    slot instead of clobbering `v1`.
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
    """Pick the best mesh: `.glb`/`.gltf`, else `mesh_<dir>.obj` or `<dir>.obj`, else the newest
    `.obj`.

    Not `sorted()[0]`: that picks `mesh_Model_*.obj` before `mesh_bauer2.obj` on stale folders.
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
    """Find the texture image: RealityScan folders also hold turntable PHOTOS (`000.jpg`, …), so
    names with diffuse/albedo/tex first, then the largest non-numeric name.
    """
    imgs = [*d.glob("*.png"), *d.glob("*.jpg"), *d.glob("*.jpeg")]
    # UV-Debug-Muster nie als Textur nehmen.
    imgs = [p for p in imgs if "unwrap" not in p.stem.lower()]
    named = [p for p in imgs if re.search(r"diffuse|albedo|tex", p.stem, re.IGNORECASE)]
    if named:
        return max(named, key=lambda p: p.stat().st_size)
    non_photos = [p for p in imgs if not p.stem.isdigit()]
    if non_photos:
        return max(non_photos, key=lambda p: p.stat().st_size)
    return None


def discover_scans(root: Path) -> tuple[list[ScanItem], list[str]]:
    """Collect RealityScan exports, one mesh + texture per subfolder; `WQ`/`wq` normalise to `wQ`.
    Returns `(items, warnings)`.
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
            # RealityScan .glb often references the texture EXTERNALLY; embedded textures still win.
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


#: Die Zahlen, ueber die `assess_report` urteilt. Welche ein Scan-Bericht tragen SOLL, ist eine
#: offene Entscheidung (`docs/offene-entscheidungen.md`) — hier steht nur, was heute geprueft wird.
_JUDGED = ("verts", "boundary_edges", "nonmanifold_edges", "height_ratio",
           "target_tris", "tris_after", "center_component_frac")


def assess_report(report: dict) -> tuple[str, list[str]]:
    """Assess a `prepare_scan()` report -> `('ok'|'warn', hints)`: inspection hints, not hard
    errors.
    """
    # TODO: `prepare_scan` schreibt KEINE der Zahlen in `_JUDGED`, diese Wache liefert also nur
    # `ok`. Welche Zahlen ein Bericht tragen soll: `docs/offene-entscheidungen.md`.
    msgs: list[str] = []

    # Ein fehlender Schluessel als 0 gelesen meldete hinter jeder Figur "only None vertices".
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
