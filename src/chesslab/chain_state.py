"""Was die Kette je Aufnahme von der Platte liest — Export, Matten, Herkunft der Laeufe.

Die Web-App fragt es gebuendelt (`web_ops.chain_status`); jede Datei wird je (mtime, Groesse)
EINMAL geparst, weil die Startseite alle Aufnahmen bei jedem Aufruf fragt."""

from __future__ import annotations

import contextlib
from collections.abc import Callable
from pathlib import Path
from typing import Any

from . import config, provenance
from .ioutil import iter_jsonl, read_jsonl
from .session_store.log import EXPORT_MARKER
from .session_store.matte import effective_rows
from .session_store.names import log_path, matte_path, reads_path

_CACHE: dict[tuple[str, str], tuple[tuple, Any]] = {}


def parsed(path: Path, tag: str, parse: Callable[[Path], Any]) -> Any:
    """`parse(path)` je (mtime, Groesse) einmal. Nur FEHLEND ist leer; jeder andere Lesefehler wirft."""
    return provenance.memo(_CACHE, (str(path), tag), (path,), lambda: parse(path))


def _stem(value: object) -> str:
    """`Path(...).stem` ohne Path: kalt 22 000 Aufrufe, ein Sechstel der Kette."""
    text = str(value).replace("\\", "/")
    name = text.rsplit("/", 1)[-1]
    if name in ("", ".", ".."):
        return Path(text).stem
    dot = name.rfind(".")
    return name[:dot] if 0 < dot < len(name) - 1 else name


def _log_facts(path: Path) -> dict:
    from .matte import ALPHA_REASON, dirty_pile
    from .realgames.position import SETTLE_MIN_FRAMES  # zieht cv2: erst beim ersten Log

    rows = read_jsonl(path)
    per_ply: dict[object, int] = {}
    for row in rows:
        if row.get("board"):
            per_ply[row.get("ply")] = per_ply.get(row.get("ply"), 0) + 1
    # Ein Intervall unter `SETTLE_MIN_FRAMES` kann der Scan nicht bewerten: die Sprosse darauf offen
    # zu halten setzte winzige Aufnahmen fuer immer auf einen Knopf.
    measurable = max(per_ply.values(), default=0) >= SETTLE_MIN_FRAMES
    # Das Handy spiegelt SEIN Commit-Log unter demselben Namen: `frame`-Zeilen ohne `board`.
    exported = bool(rows) and "board" in rows[0]
    return {
        "exported": exported,
        "settled": exported and (not measurable or any("settle_dev" in r for r in rows)),
        "boards": {_stem(r["board"]) for r in rows if r.get("board")},
        "pile": dirty_pile(rows, ALPHA_REASON),
    }


def export_state(session_dir: Path) -> dict:
    """`exported`/`settled`/`interrupted`. Der Export schreibt `log.jsonl` ZULETZT."""
    if (session_dir / EXPORT_MARKER).exists():
        return {"exported": False, "settled": False, "interrupted": True}
    facts = parsed(log_path(session_dir), "log", _log_facts) if log_path(session_dir).exists() else None
    if facts is None or not facts["exported"]:
        return {"exported": False, "settled": False, "interrupted": False}
    return {"exported": True, "settled": facts["settled"], "interrupted": False}


def _matte_facts(path: Path) -> dict:
    rows = effective_rows(read_jsonl(path))
    # Dieselbe Menge, gegen die `alpha_worker` sein `--limit` zaehlt: eine Absage ist kein Erfolg,
    # auch wenn sie eine `coverage` mitschleppt.
    measured = {_stem(f): r for f, r in rows.items() if r.get("coverage") is not None and not r.get("skipped")}
    return {
        "usable": set(measured),
        "refused": {_stem(f) for f, r in rows.items() if r.get("skipped")},
        "sources": {stem: s for stem, r in measured.items() if (s := (r.get("_source") or {}).get("log"))},
    }


def _review_facts(path: Path) -> dict[tuple[str, str], set[str]]:
    """`(session_id, verdict) -> Stems`, im Format von `matte.flagged_frames` — was `--reported` holt."""
    out: dict[tuple[str, str], set[str]] = {}
    for row in read_jsonl(path):
        frame = str(row.get("frame", ""))
        if row.get("verdict") in ("dirty-frame", "matte-wanted") and frame.isdigit():
            out.setdefault((row.get("session_id"), row["verdict"]), set()).add(f"{int(frame):06d}")
    return out


def review_frames() -> dict[tuple[str, str], set[str]]:
    return parsed(config.DATA.labels / "review-notes.jsonl", "notes", _review_facts)


def matte_census(session_dir: Path, session_id: str, target: int,
                 notes: dict[tuple[str, str], set[str]] | None = None) -> dict:
    """`done` gegen den `occluded`-Stapel DIESES Exports; `target` ist die Absicht EINES Laufs.

    Gemeldete Frames zaehlen nur OFFEN, solange SAM nicht geantwortet hat, und nur, wenn dieser
    Export sie noch fuehrt — sonst hielte ein unerreichbares Frame die Sprosse fuer immer.
    """
    notes = review_frames() if notes is None else notes
    log = parsed(log_path(session_dir), "log", _log_facts) if log_path(session_dir).exists() else None
    boards, pile = (log["boards"], log["pile"]) if log else (set(), set())
    matte = parsed(matte_path(session_dir), "matte", _matte_facts)
    usable = matte["usable"]
    open_ = notes.get((session_id, "dirty-frame"), set()) - usable
    wanted = (notes.get((session_id, "matte-wanted"), set()) - usable) & boards
    return {
        "done": len(usable & pile),
        "total": len(pile),
        "target": min(target, len(pile)),
        "reported": len(open_),
        "reportedOpen": len((open_ - matte["refused"]) & boards),
        "reportedOrphan": len(open_ - boards),
        "wanted": len(wanted),
    }


def stale_matte(session_dir: Path, log_stamp: str | None) -> bool:
    """Ein gemessenes Alpha, das dieser Export noch fuehrt, traegt den Stempel eines anderen Logs."""
    log = parsed(log_path(session_dir), "log", _log_facts) if log_path(session_dir).exists() else None
    boards = log["boards"] if log else set()
    sources = parsed(matte_path(session_dir), "matte", _matte_facts)["sources"]
    return any(not provenance.same_log(s, log_stamp) for stem, s in sources.items() if stem in boards)


def _head(path: Path) -> dict | None:
    """`_source` der ersten Zeile; `None` = unlesbar oder leer — das schliesst keine Sprosse."""
    try:
        with contextlib.closing(iter_jsonl(path)) as rows:
            first = next(rows, None)
    except ValueError:
        return None
    if first is None:
        return None
    source = first.get("_source")
    return source if isinstance(source, dict) else {}


def reads_state(session_dir: Path, log_stamp: str | None, model: str | None) -> dict:
    """`absent`/`fresh`/`stale`/`other_model`; `model` ist der Lauf, gegen den gelesen wird."""
    path = reads_path(session_dir)
    if not path.exists():
        return {"state": "absent", "model": None}
    source = parsed(path, "head", _head)
    if source is None:
        return {"state": "absent", "model": None}
    # Ohne Log-Stempel gilt der Lauf weiter, auch unter einem anderen Modell — Altbestand.
    if source.get("log") is None:
        return {"state": "fresh", "model": None}
    stamped = source.get("model")
    if model and stamped and Path(str(stamped)).name != Path(model).name:
        return {"state": "other_model", "model": Path(str(stamped)).name}
    if not provenance.same_log(source["log"], log_stamp):
        return {"state": "stale", "model": None}
    return {"state": "fresh", "model": None}


def pass_path(name: str) -> Path:
    return config.DATA.reports / "temporal-mattes" / name / "pass.json"


def _pass_head(path: Path) -> dict | None:
    import json

    try:
        head = json.loads(path.read_text(encoding="utf-8-sig"))
    except ValueError:
        return None  # halb geschrieben: nichts zu holen, kein Urteil
    return head if isinstance(head, dict) else None


def pass_state(session_dir: Path, name: str, log_stamp: str | None) -> dict:
    """`absent`/`fresh`/`stale`/`matte_moved`/`input_moved`; `inputs_known` fehlt bei Altbestand."""
    path = pass_path(name)
    if not path.exists():
        return {"state": "absent", "inputs_known": False}
    head = _pass_head(path)
    if head is None:
        return {"state": "absent", "inputs_known": False}
    source = head.get("_source") if isinstance(head.get("_source"), dict) else {}
    inputs = head.get("_inputs") if isinstance(head.get("_inputs"), dict) else None
    known = inputs is not None
    if source.get("log") is not None and not provenance.same_log(source["log"], log_stamp):
        return {"state": "stale", "inputs_known": known}
    if inputs is None:
        return {"state": "fresh", "inputs_known": False}
    moved = provenance.inputs_moved(session_dir, inputs)
    return {"state": {"matte": "matte_moved", "scan": "input_moved"}.get(moved, "fresh"), "inputs_known": True}


def confirmed_against(name: str) -> str | None:
    """`same`/`moved`/`unknown` fuer eine bestaetigte Zugfolge; `None` ohne (lesbare) Bestaetigung."""
    import hashlib
    import json

    from .session_store.recording import candidate_path, confirmation_against, read_reference_bytes

    try:
        doc = json.loads(candidate_path(name).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except ValueError:
        return None  # halb geschrieben heisst "noch nicht bestaetigt"
    if not isinstance(doc, dict) or doc.get("confirmed") is not True:
        return None
    data = read_reference_bytes(name)
    return confirmation_against(doc, None if data is None else hashlib.md5(data).hexdigest())


def chain_status(name: str, *, target: int, model: str | None,
                 notes: dict[tuple[str, str], set[str]] | None = None) -> dict:
    """Alles, was `chainState` von der Platte braucht und Python schon rechnet, fuer EINE Aufnahme."""
    from .session_store.recording import game_dir

    sdir = game_dir(name)
    log_stamp = provenance.file_stamp(log_path(sdir))
    return {
        "session": export_state(sdir),
        "mattes": matte_census(sdir, f"rg-{name}", target, notes),
        "staleMatte": stale_matte(sdir, log_stamp),
        "pass": pass_state(sdir, name, log_stamp),
        "reads": reads_state(sdir, log_stamp, model),
        "against": confirmed_against(name),
    }
