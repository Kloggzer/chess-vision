"""`data/recordings/<name>/`: Video, `candidate.json`, `reference.pgn` und die Ledger der Aufnahme."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

import chess.pgn

from .. import config
from ..ioutil import read_jsonl, stamp_of


def game_dir(name: str) -> Path:
    """The one folder for a recording. `session_id` keeps the `rg-` prefix, the directory never had it."""
    return config.DATA.recordings / name


def load_candidate(name: str) -> dict:
    """The candidate exactly as the tracker left it — nothing here rewrites `moves[]`."""
    path = game_dir(name) / "candidate.json"
    if not path.exists():
        raise FileNotFoundError(f"no candidate: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def read_reference(name: str) -> tuple[list[str], str]:
    """SANs of `reference.pgn`'s mainline, replayed so the SAN spelling matches python-chess,
    plus the md5 of the SAME bytes — the one `write_confirmation` must stamp."""
    import hashlib
    import io

    path = game_dir(name) / "reference.pgn"
    if not path.exists():
        raise FileNotFoundError(f"no reference game: {path}")
    data = path.read_bytes()
    game = chess.pgn.read_game(io.StringIO(data.decode("utf-8"), newline=None))
    if game is None:
        raise ValueError(f"{path}: no game in PGN")
    board = game.board()
    sans = []
    for move in game.mainline_moves():
        sans.append(board.san(move))
        board.push(move)
    return sans, hashlib.md5(data).hexdigest()


def write_confirmation(name: str, candidate: dict, plies: list[int], *,
                       reference_md5: str | None = None) -> Path:
    """Stamp the confirmation keys, `confirmed_reference` in `lib/data.ts::writeConfirmation`'s form.

    Guarded: a file that no longer equals the caller's `candidate` was written by someone else
    (a `/confirm` during the prompt), and replacing it would drop that verdict.
    """
    import hashlib

    from ..ioutil import Contested, write_json_guarded

    path = game_dir(name) / "candidate.json"
    stamp = stamp_of(path)
    what = f"{name}: candidate.json wurde waehrend der Bestaetigung geschrieben — nichts ersetzt, neu bestaetigen"
    if load_candidate(name) != candidate:
        raise ValueError(what)
    ref = game_dir(name) / "reference.pgn"
    md5 = hashlib.md5(ref.read_bytes()).hexdigest() if ref.exists() else None
    # Das Urteil fiel gegen die Bytes, die `read_reference` las; eine waehrend der Rueckfrage
    # ersetzte Datei bekaeme sonst ihren md5 an ein Urteil ueber die alte.
    if reference_md5 is not None and md5 != reference_md5:
        raise ValueError(f"{name}: reference.pgn wurde waehrend der Bestaetigung ersetzt — "
                         "nichts geschrieben, neu bestaetigen")
    candidate["confirmed"] = True
    candidate["confirmed_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    candidate["reviewed_plies"] = plies
    candidate["confirmed_reference"] = {"md5": md5, "at": candidate["confirmed_at"]}
    try:
        write_json_guarded(path, candidate, stamp, what=what)
    except Contested as exc:
        raise ValueError(str(exc)) from exc
    return path


def is_archived(name: str) -> bool:
    """The UI's `ui-meta.json` archive flag — a human saying "not this one". Wirft, wenn er unlesbar ist.

    Python ignored it, so a re-export happily wrote three archived games back into the corpus
    (2026-08-19). Hiding a game from a list and keeping it out of the training data are the same
    intent, and two truths about one game are worth less than one.
    """
    meta = game_dir(name) / "ui-meta.json"
    if not meta.exists():
        return False
    try:
        return bool(json.loads(meta.read_text(encoding="utf-8-sig")).get("archived"))
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"{name}: ui-meta.json ist unlesbar ({exc}) — der Archiv-Status laesst "
                         "sich nicht feststellen, also wird nichts exportiert") from exc


def reference_is_the_phones_own(name: str) -> bool:
    """Is `reference.pgn` a copy of the phone's own PGN (the UI's `adopt-pgn`)?

    Then `confirm` compares the tracker's replay against the tracker's live run — same algorithm,
    same video. It catches a divergence between the two, never a move both got wrong.
    """
    import hashlib

    ref = game_dir(name) / "reference.pgn"
    games = game_dir(name) / "files" / "games"
    if not ref.exists() or not games.is_dir():
        return False
    digest = hashlib.md5(ref.read_bytes()).hexdigest()
    return any(hashlib.md5(p.read_bytes()).hexdigest() == digest for p in games.glob("*.pgn"))


def video_fps(candidate: dict) -> float:
    """Die Bildrate der Aufnahme. NICHT geraten: sie steuert `margin_frames`, das letzte
    Intervall und jedes `ts`, und die Aufnahmen laufen zwischen 14,8 und 30,0."""
    fps = (candidate.get("clock") or {}).get("fps")
    if not fps:
        raise ValueError("candidate.json nennt keine clock.fps — ohne sie waeren Marge und "
                         "Zeitstempel geraten (`capture_import.container_fps` bricht ebenso ab)")
    return float(fps)


def base_time(candidate: dict) -> datetime:
    """The recording's wall clock — row timestamps are video time counted off it, not export time."""
    try:
        return datetime.fromisoformat(str(candidate.get("created_at", "")).replace("Z", "+00:00"))
    except ValueError as exc:
        # JETZT ist die Exportzeit, die der Docstring ausschliesst — sie landet als `ts` jeder
        # Zeile und ist am Ergebnis nicht als abgeleitet zu erkennen. Zwei Exporte derselben
        # Aufnahme ergaeben zwei verschiedene Aufnahmeuhren.
        raise ValueError("candidate.json nennt kein lesbares `created_at` — die Zeitstempel "
                         "waeren die Exportzeit, nicht die der Aufnahme") from exc


def video_path(name: str) -> Path:
    """The recording's video HEAD — the file `Recording` expands into its segments.

    Two real shapes, not a fallback: an early recording keeps `video.mp4` at its root, a phone
    upload keeps the whole raw tree and its video sits in `files/sessions/<id>/`. It must be the
    file where it really lies — `recording_segments` finds `video-001.mp4` BESIDE the head, so a
    copy at the root would hide the other 8 parts of a 9-part game and truncate it silently.

    It used to try three paths, all of which missed after the 2026-08-20 rename to
    `data/recordings/`: 24 of 24 candidates failed at once, because a fallback hides a wrong path
    until every branch is wrong.
    """
    root = game_dir(name)
    for p in (root / "video.mp4", *sorted(root.glob("files/sessions/*/video.mp4"))):
        if p.is_file():
            return p
    raise FileNotFoundError(f"{name}: no video.mp4 under {root}")


def corrected_frames(name: str) -> set[int]:
    """Source indices this recording carries a hand correction for — a correction names a picture.

    Reads the recording's own ledger, so there is nothing to filter by session: every row in it
    is about this recording, and every label in it is an identity (`occluded` was dropped when the
    scheme went to 13 + coverage).
    """
    from ..labeling import load_corrections

    return {int(frame)
            for (_sid, frame, _square) in load_corrections(game_dir(name) / "corrections.jsonl")
            if str(frame).isdigit()}


def reported_dirty(session_id: str, verdict: str = "dirty-frame") -> set[int]:
    """Source indices a human called dirty in the labeling stream (`review-notes.jsonl`).

    `verdict="matte-wanted"` liest denselben Zettel der Frame-Lane: ein strittiges Frame, das ein
    Mensch zur Matte geschickt hat statt es wegzuwerfen. Es steht schon auf dem dirty-Stapel, nur
    nicht als `occluded` — es kommt deshalb NUR ueber `alpha_worker(frames=...)` an SAM vorbei.

    The scan measures grooves and a person, and it misses a hand that neither moved a piece nor
    reached over the markers. The human sees it, and the honest word for the frame is the same one
    the scan would have used: the board is unchanged, so the FEN still holds.
    """

    from ..config import DATA

    path = DATA.labels / "review-notes.jsonl"
    out = set()
    if not path.exists():
        return out
    for row in read_jsonl(path):
        if (row.get("session_id") == session_id and row.get("verdict") == verdict
                and str(row.get("frame", "")).isdigit()):
            out.add(int(row["frame"]))
    return out


# --- fit-stored: the PC re-fits the quad an Android "Stored" session logged -------------------

#: The sidecar `packLabeledSession` and the review viewer prefer over the logged marker quad —
#: contract in `docs/data-pipeline.md` §2.1.
QUAD_FIT_NAME = "quad-fit.json"


def stored_session_dirs(name: str) -> list[Path]:
    """Every `files/sessions/<id>/` of a bundle that carries a log — Android "Stored" recordings."""
    root = game_dir(name) / "files" / "sessions"
    if not root.is_dir():
        return []
    return sorted(d for d in root.iterdir() if (d / "log.jsonl").is_file())


def stored_rows(session_dir: Path) -> list[dict]:
    """The logged rows in frame order — every row, since the sidecar is keyed per frame."""
    log = session_dir / "log.jsonl"
    rows = read_jsonl(log)
    return sorted((r for r in rows if r.get("frame") and r.get("corners")),
                  key=lambda r: Path(r["frame"]).stem)


def write_quad_fit(session_dir: Path, payload: dict) -> Path:
    """Atomically — a half-written sidecar would silently move every crop of the session."""
    path = session_dir / QUAD_FIT_NAME
    tmp = path.with_suffix(".json.tmp")
    try:
        tmp.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path
