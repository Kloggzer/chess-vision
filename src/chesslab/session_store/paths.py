"""Session-ID -> Ordner, `session.yaml`, Frame-Pfade — wo eine Session liegt, weiss nur dieses Modul."""

from __future__ import annotations

from pathlib import Path

import yaml

from .. import config
from .names import LOG_FILE, meta_path


def _safe_id(session_id: str) -> str:
    if not session_id or "/" in session_id or "\\" in session_id or ".." in session_id:
        raise ValueError(f"invalid session ID: {session_id!r}")
    return session_id


def read_session_meta(session_dir: Path, *, missing_ok: bool = False) -> dict | None:
    p = meta_path(session_dir)
    if not p.exists():
        if missing_ok:
            return {}
        raise FileNotFoundError(f"session.yaml missing in {session_dir}")
    with p.open("r", encoding="utf-8") as fh:
        meta = yaml.safe_load(fh)
    return meta or {} if missing_ok else meta



def all_sessions(paths: config.Paths | None = None) -> list[tuple[str, Path]]:
    """`(session_id, directory)` for everything with a `log.jsonl`, recordings first. BOTH roots:
    `recordings/<ts>` answers to `rg-<ts>`, others live under `sessions/`.
    """
    paths = paths or config.DATA
    out = [(f"rg-{d.name}", d) for d in sorted(paths.recordings.iterdir())
           if d.is_dir() and (d / LOG_FILE).exists()] if paths.recordings.exists() else []
    if paths.sessions.exists():
        out += [(d.name, d) for d in sorted(paths.sessions.iterdir())
                if d.is_dir() and (d / LOG_FILE).exists()]
    return out


def active_session_dir(session_id: str, paths: config.Paths) -> Path:
    """Wo eine Session aktiv liegt (ob sie existiert, sagt das nicht): `rg-` unter `recordings/`
    ohne Praefix, alles andere unter `sessions/`.
    """
    sid = _safe_id(session_id)
    return paths.recordings / sid[3:] if sid.startswith("rg-") else paths.sessions / sid


def session_dir(session_id: str, paths: config.Paths | None = None) -> tuple[Path, bool]:
    """`(directory, archived)` for an active or archived session; the id keeps the `rg-` prefix the
    directory dropped.
    """
    # Resolved at CALL time: tests monkeypatch `config.DATA`, a default argument freezes it at
    # import.
    paths = paths or config.DATA
    safe_sid = _safe_id(session_id)
    active = active_session_dir(safe_sid, paths)
    if active.exists():
        return active, False
    archived = paths.sessions_archive / safe_sid
    if archived.exists():
        return archived, True
    raise FileNotFoundError(f"Session '{safe_sid}' not found.")


def frame_path(sdir: Path, entry: dict) -> Path:
    """The image a log row points at, refusing anything outside the session directory."""
    rel = str(entry.get("frame") or "")
    if not rel:
        raise FileNotFoundError("Log entry has no frame path.")
    path = (sdir / rel).resolve()
    root = sdir.resolve()
    if root not in path.parents and path != root:
        raise ValueError("Invalid frame path in session log.")
    if not path.exists():
        raise FileNotFoundError(f"Frame '{rel}' not found.")
    return path


def session_profile(sdir: Path, *, allow_standin: bool = True, override: str | None = None):
    """The calibration profile a session was captured against (or `override`), or a neutral
    stand-in so it stays reviewable. `allow_standin=False` for callers that MEASURE or MUTATE
    geometry; they refuse a session without session.yaml even under an override.
    """
    from .. import calibration

    meta_file = meta_path(sdir)
    if not allow_standin and not meta_file.exists():
        raise FileNotFoundError(f"{sdir.name}: session.yaml fehlt — Geometrie laesst sich hier "
                                "nicht messen")
    meta = yaml.safe_load(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {}
    profile_name = override or (meta or {}).get("profile")
    if profile_name:
        try:
            return calibration.load_profile(profile_name)
        except FileNotFoundError:
            if not allow_standin:
                raise
    elif not allow_standin:
        raise FileNotFoundError(f"{sdir.name}: session.yaml nennt kein Profil — Geometrie laesst "
                                "sich hier nicht messen")
    side = float(config.DEFAULT_BOARD_SIZE)
    corners = [[0.0, 0.0], [side, 0.0], [side, side], [0.0, side]]
    return calibration.CalibrationProfile(
        profile=profile_name or "review",
        camera_index=-1,
        frame_size=(0, 0),
        board_size=config.DEFAULT_BOARD_SIZE,
        image_corners=corners,
        homography=calibration.compute_homography(corners, config.DEFAULT_BOARD_SIZE),
        white_pov=True,
        crop=calibration.CropParams.default(config.DEFAULT_BOARD_SIZE),
    )
