"""Session-Verwaltung: aufgenommene Trainings-Sessions auflisten, archivieren, wiederherstellen,
löschen.

`collect` legt je Session ein Verzeichnis unter `data/sessions/<id>` an (Frames + log.jsonl +
session.yaml); `slice` erzeugt daraus Crops (`data/squares/<label>/<id>_*.png`) und Manifest-
Zeilen. Diese Funktionen halten diese drei Orte konsistent:

- **archivieren** entfernt die Crops + Manifest-Zeilen (Session zählt nicht mehr zum Datensatz)
  und verschiebt das Session-Verzeichnis nach `data/sessions_archive/<id>`. Reversibel:
  `restore` + neu slicen. Korrekturen bleiben erhalten.
- **löschen** entfernt Verzeichnis, Crops, Manifest- und Korrektur-Zeilen endgültig.

Headless und testbar: alle Funktionen akzeptieren ein `paths`-Objekt (Default `config.DATA`).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import config


def _safe_id(session_id: str) -> str:
    if not session_id or "/" in session_id or "\\" in session_id or ".." in session_id:
        raise ValueError(f"ungültige Session-ID: {session_id!r}")
    return session_id


def _read_meta(session_dir: Path) -> dict:
    import yaml

    p = session_dir / "session.yaml"
    if not p.exists():
        return {}
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _log_count(session_dir: Path) -> int:
    p = session_dir / "log.jsonl"
    if not p.exists():
        return 0
    return sum(1 for line in p.read_text(encoding="utf-8").splitlines() if line.strip())


def _manifest_path(paths: config.Paths) -> Path:
    return paths.manifests / "squares.jsonl"


def _crop_files(session_id: str, paths: config.Paths) -> list[Path]:
    root = paths.squares
    if not root.exists():
        return []
    # Crop-Dateiname = "{session_id}_{frame}_{square}.png" in data/squares/<label>/
    return list(root.glob(f"*/{session_id}_*.png"))


def _crop_count_from_manifest(session_id: str, paths: config.Paths, manifest=None) -> int:
    from .manifest_cache import session_crop_count

    return session_crop_count(manifest or _manifest_path(paths), session_id)


def _variant_tag(meta: dict, session_id: str) -> str | None:
    """Variant manifest tag for ingested sessions (= ingest tag = profile name)."""
    if meta.get("mode") != "ingested":
        return None
    return meta.get("profile") or session_id.split("__", 1)[0]


def _filter_jsonl(path: Path, session_id: str) -> None:
    """Alle Zeilen dieser Session aus einer JSONL-Datei entfernen (idempotent)."""
    if not path.exists():
        return
    kept = [line for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and json.loads(line).get("session_id") != session_id]
    path.write_text(("\n".join(kept) + "\n") if kept else "", encoding="utf-8")


def _purge_crops(session_id: str, paths: config.Paths) -> int:
    files = _crop_files(session_id, paths)
    for f in files:
        f.unlink()
    return len(files)


def list_sessions(paths: config.Paths = config.DATA) -> list[dict]:
    """Aktive + archivierte Sessions mit Eckdaten (Frames, Crops, Modus, Status)."""
    out: list[dict] = []
    for root, archived in ((paths.sessions, False), (paths.sessions_archive, True)):
        if not root.exists():
            continue
        for d in sorted(root.iterdir()):
            if not d.is_dir():
                continue
            meta = _read_meta(d)
            tag = _variant_tag(meta, d.name)
            if archived:
                n_crops = 0
            elif tag:
                # Ingested sessions are sliced into their variant manifest, not the default one.
                n_crops = _crop_count_from_manifest(
                    d.name, paths, manifest=paths.manifests / f"squares__{tag}.jsonl")
            else:
                n_crops = _crop_count_from_manifest(d.name, paths)
            out.append({
                "session_id": d.name,
                "archived": archived,
                "mode": meta.get("mode"),
                "profile": meta.get("profile"),
                "created_at": meta.get("created_at"),
                "variant": tag,
                "n_frames": _log_count(d),
                "n_crops": n_crops,
            })
    return out


def archive_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Crops + Manifest-Zeilen entfernen und das Verzeichnis ins Archiv verschieben (reversibel)."""
    sid = _safe_id(session_id)
    src = paths.sessions / sid
    if not src.exists():
        raise FileNotFoundError(f"Session '{sid}' nicht gefunden.")
    n_crops = _purge_crops(sid, paths)
    _filter_jsonl(_manifest_path(paths), sid)
    paths.sessions_archive.mkdir(parents=True, exist_ok=True)
    dst = paths.sessions_archive / sid
    if dst.exists():
        shutil.rmtree(dst)
    shutil.move(str(src), str(dst))
    return {"session_id": sid, "archived": True, "removed_crops": n_crops}


def restore_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Archivierte Session zurück in den aktiven Ordner verschieben (danach neu slicen)."""
    sid = _safe_id(session_id)
    src = paths.sessions_archive / sid
    if not src.exists():
        raise FileNotFoundError(f"Archivierte Session '{sid}' nicht gefunden.")
    dst = paths.sessions / sid
    if dst.exists():
        raise FileExistsError(f"Aktive Session '{sid}' existiert bereits.")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return {"session_id": sid, "archived": False}


def delete_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Session endgültig entfernen: Verzeichnis + Crops + Manifest- + Korrektur-Zeilen."""
    sid = _safe_id(session_id)
    active, archived = paths.sessions / sid, paths.sessions_archive / sid
    target = active if active.exists() else archived
    if not target.exists():
        raise FileNotFoundError(f"Session '{sid}' nicht gefunden.")
    n_crops = _purge_crops(sid, paths)
    _filter_jsonl(_manifest_path(paths), sid)
    _filter_jsonl(paths.corrections, sid)
    shutil.rmtree(target)
    return {"session_id": sid, "deleted": True, "removed_crops": n_crops}
