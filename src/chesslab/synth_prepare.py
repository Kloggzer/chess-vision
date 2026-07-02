"""Batch-Vorbereitung gescannter Figuren: RealityScan-Exporte → renderfertige `synth_pieces/`.

Pure, headless testbare Logik hinter `chesslab synth prepare` (der bpy-Teil lebt in
`synth/isolate_piece.py` und läuft in Blender). Hier: Scan-Discovery, Blender-Kommandozeile
und die Bewertung der Qualitäts-Reports — damit man Blender nie öffnen muss.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

# Gültige Figurennamen für synth_pieces/: P/N/B/R/Q/K, optional mit Farbpräfix w/b.
_PIECE_NAME = re.compile(r"^[wb]?[PNBRQK]$")

# Bewertungs-Schwellen für die Reports aus isolate_piece.py.
_MAX_BOUNDARY_EDGES = 300      # offene Kanten ≈ Löcher im Scan
_MAX_NONMANIFOLD = 500
_MIN_VERTS = 1000              # weniger übrig ⇒ Isolierung hat zu viel weggeschnitten
_HEIGHT_RATIO_RANGE = (0.9, 4.0)   # Höhe/Basis — außerhalb: PCA-Aufrichtung prüfen (Springer!)


@dataclass(frozen=True)
class ScanItem:
    name: str          # Figurenname, z. B. "P" oder "wN" (= Ziel-Stem in synth_pieces/)
    obj: Path          # .glb/.gltf (Textur eingebettet) oder .obj
    tex: Path | None   # Textur-Datei (nur beim .obj nötig; .glb → None = auto-extrahieren)


def _pick_texture(d: Path) -> Path | None:
    """Textur im Scan-Ordner finden — RealityScan-Ordner enthalten auch die Turntable-FOTOS,
    deshalb NICHT einfach „größtes Bild": erst nach diffuse/albedo/tex im Namen suchen,
    dann größte Nicht-Nummern-Datei (Fotos heißen 000.jpg, 001.jpg, …)."""
    imgs = [*d.glob("*.png"), *d.glob("*.jpg"), *d.glob("*.jpeg")]
    named = [p for p in imgs if re.search(r"diffuse|albedo|tex", p.stem, re.IGNORECASE)]
    if named:
        return max(named, key=lambda p: p.stat().st_size)
    non_photos = [p for p in imgs if not p.stem.isdigit()]
    if non_photos:
        return max(non_photos, key=lambda p: p.stat().st_size)
    return None


def discover_scans(root: Path) -> tuple[list[ScanItem], list[str]]:
    """RealityScan-Exporte einsammeln: je Unterordner `<name>/` ein Mesh + Textur.
    Bevorzugt .glb (RealityScan-vereinfacht, Textur eingebettet); sonst .obj + Textur-Datei.
    Rückgabe (items, warnings)."""
    root = Path(root)
    items: list[ScanItem] = []
    warnings: list[str] = []
    if not root.is_dir():
        return items, [f"Scan-Verzeichnis fehlt: {root}"]
    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        glbs = sorted([*d.glob("*.glb"), *d.glob("*.gltf")])
        objs = sorted(d.glob("*.obj"))
        if not _PIECE_NAME.match(d.name) and (glbs or objs):
            warnings.append(f"{d.name}: kein Figurenname (P/N/B/R/Q/K, optional w/b-Präfix) — "
                            "der Renderer wird diese Vorlage nicht finden")
        if glbs:                                     # bevorzugt: RealityScan-vereinfachtes .glb
            if len(glbs) > 1:
                warnings.append(f"{d.name}: mehrere .glb — nehme {glbs[0].name}")
            # RealityScan-.glb referenziert die Textur oft EXTERN (…_diffuse.png daneben) —
            # als Fallback mitgeben; eingebettete Texturen gewinnen im Skript automatisch.
            items.append(ScanItem(name=d.name, obj=glbs[0], tex=_pick_texture(d)))
            continue
        tex = _pick_texture(d)
        if not objs or tex is None:
            warnings.append(f"{d.name}: übersprungen (braucht .glb ODER .obj + Textur, "
                            f"gefunden: {len(objs)} obj, Textur: {tex})")
            continue
        if len(objs) > 1:
            warnings.append(f"{d.name}: mehrere .obj — nehme {objs[0].name}")
        items.append(ScanItem(name=d.name, obj=objs[0], tex=tex))
    return items, warnings


def build_isolate_cmd(blender: str, script: Path, item: ScanItem, out_dir: Path,
                      target_tris: int, smooth_iters: int, keep_radius: float = 1.9,
                      keep_largest: bool = True, fill_holes: bool = True) -> list[str]:
    """Blender-Kommandozeile für EINE Figur. Alle Nachbearbeitungsschritte sind Toggles:
    target_tris=0 → kein Decimate, smooth_iters=0 → kein Glätten,
    keep_largest/fill_holes=False → Trümmer-Entfernung/Loch-Füllung aus."""
    out_obj = Path(out_dir) / f"{item.name}.obj"
    preview = Path(out_dir) / f"{item.name}_preview.png"
    # tex '-' = aus dem Mesh-Material extrahieren (.glb hat die Textur eingebettet).
    # --python-exit-code 1: Blender gibt sonst Exit 0 zurück, auch wenn das Skript crasht.
    cmd = [blender, "--background", "--python-exit-code", "1", "--python", str(script), "--",
           str(item.obj), str(item.tex) if item.tex else "-", str(out_obj), str(preview),
           "--target-tris", str(target_tris), "--smooth-iters", str(smooth_iters),
           "--keep-radius", str(keep_radius)]
    if not keep_largest:
        cmd.append("--no-keep-largest")
    if not fill_holes:
        cmd.append("--no-fill-holes")
    return cmd


def assess_report(report: dict) -> tuple[str, list[str]]:
    """Report aus isolate_piece.py bewerten → ('ok'|'warn', Hinweise).

    Bewusst konservativ: Warnungen sind Prüf-Hinweise (Preview ansehen!), keine harten Fehler —
    ob ein Mesh gut genug ist, entscheidet am Ende das Render-/Trainingsergebnis."""
    msgs: list[str] = []
    if report.get("verts", 0) < _MIN_VERTS:
        msgs.append(f"nur {report.get('verts')} Vertices übrig — Isolierung zu aggressiv? "
                    "(Scan/Preview prüfen)")
    if report.get("boundary_edges", 0) > _MAX_BOUNDARY_EDGES:
        msgs.append(f"{report['boundary_edges']} offene Kanten — Löcher im Scan "
                    "(mehr Turntable-Fotos / anderer Winkel)")
    if report.get("nonmanifold_edges", 0) > _MAX_NONMANIFOLD:
        msgs.append(f"{report['nonmanifold_edges']} Non-Manifold-Kanten — Scan-Artefakte")
    hr = report.get("height_ratio")
    if hr is not None and not (_HEIGHT_RATIO_RANGE[0] <= hr <= _HEIGHT_RATIO_RANGE[1]):
        msgs.append(f"height_ratio={hr} außerhalb {_HEIGHT_RATIO_RANGE} — Figur liegt/kippt? "
                    "PCA-Aufrichtung im Preview prüfen (typisch beim Springer)")
    tgt = report.get("target_tris") or 0
    if tgt and report.get("tris_after", 0) > 1.5 * tgt:
        msgs.append(f"tris_after={report.get('tris_after')} deutlich über Ziel {tgt} — "
                    "Decimate hat nicht gegriffen?")
    return ("warn" if msgs else "ok"), msgs


def load_report(out_dir: Path, name: str) -> dict | None:
    p = Path(out_dir) / f"{name}_report.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))
