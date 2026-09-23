"""`log.jsonl` einer Session: lesen, bewacht schreiben, sichern, und der Export-Marker.

Jeder Schreiber geht ueber `_write_log`/`write_session` und damit ueber den Stempel-Riegel.
"""

from __future__ import annotations

import shutil
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

import yaml

from ..ioutil import read_jsonl, stamp_of, write_rows, write_rows_guarded
from .names import INTERVAL_FILE, META_FILE, log_path
from .paths import session_dir
from .recording import base_time


class LogRows(list):
    """Die Zeilen von `log.jsonl` samt dem Stempel, unter dem sie gelesen wurden."""

    stamp: tuple[int, int] | None = None


#: Liegt waehrend des Brett-Schreibens da. Ein Export ueberschreibt `boards/` an Ort und Stelle,
#: schreibt `log.jsonl` aber erst zum Schluss — stirbt er dazwischen, beschreiben die Ecken im
#: alten Log nicht mehr die Pixel auf der Platte, und niemand kann das spaeter noch sehen.
EXPORT_MARKER = ".export-running"


class ExportInterrupted(ValueError):
    """Log und Bretter stammen aus zwei Generationen; kein Folgeschritt darf darauf arbeiten."""


def export_interrupted(session_dir: Path) -> bool:
    """Steht ein abgebrochener Export im Weg? Dann sind Log und Bretter nicht dasselbe Alter."""
    return (session_dir / EXPORT_MARKER).is_file()


def refuse_interrupted_export(sdir: Path) -> None:
    """Der eine Pruefpunkt: beide `read_log` rufen ihn, nur die Marker-Setzer lesen daran vorbei."""
    sdir = Path(sdir)
    if export_interrupted(sdir):
        raise ExportInterrupted(
            f"{sdir.name}: an export was interrupted ({EXPORT_MARKER}) — boards and log are from "
            "two generations. Re-run `realgames export-session` or `session rewarp` first.")


def read_log(
    sdir: Path,
    *,
    under_export: bool = False,
    allow_empty: bool = False,
    with_stamp: bool = True,
    missing_message: str | None = None,
) -> list[dict]:
    """Every row of `log.jsonl`, in order — carrying the stamp `_write_log` presents back.

    `under_export=True` only for the steps that set and clear `EXPORT_MARKER` themselves, and for
    a human verdict (`flag_frame`), which the running export carries over (`HUMAN_KEYS`)."""
    if not under_export:
        refuse_interrupted_export(sdir)
    log_file = log_path(sdir)
    if not log_file.exists():
        message = missing_message or "Session '{name}' has no log.jsonl."
        raise FileNotFoundError(message.format(name=sdir.name, session_dir=sdir))
    stamp = stamp_of(log_file) if with_stamp else None
    rows = read_jsonl(log_file)
    if not rows and not allow_empty:
        raise FileNotFoundError(f"Session '{sdir.name}' has no captured frames.")
    if not with_stamp:
        return rows
    stamped = LogRows(rows)
    stamped.stamp = stamp
    return stamped


def write_interval_checks(sdir: Path, checks: list[dict]) -> None:
    # war ungestagt. `position_flags.interval_flags` liest jede Zeile mit blankem
    # `json.loads` und nahm bei einer halben Datei den Report ALLER Aufnahmen mit, nicht nur diese.

    write_rows(sdir / INTERVAL_FILE, checks)


def backup_log(log_path: Path) -> str:
    """Copy `log.jsonl` aside before rewriting it.

    `data/` is gitignored and unrecoverable; the project rule is park, never delete — so a
    backup is never overwritten either.
    """
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = log_path.with_name(f"{log_path.name}.bak.{stamp}")
    n = 1
    while dest.exists():
        dest = log_path.with_name(f"{log_path.name}.bak.{stamp}-{n}")
        n += 1
    shutil.copy2(log_path, dest)
    return dest.name


_FROM_ROWS = object()


def _write_log(sdir: Path, rows: list[dict], *, stamp=_FROM_ROWS) -> None:
    """Atomic replace, and only over the log the rows were read from (`read_log`'s stamp).

    A long run wrote its minutes-old snapshot back over a human `unusable` set meanwhile; now that
    is `Contested`. A checkpointing caller keeps writing: the rows take the stamp they left behind.
    """
    log_file = log_path(sdir)
    if stamp is _FROM_ROWS:
        if not isinstance(rows, LogRows):
            raise TypeError("_write_log needs the stamp of the read: pass read_log rows or stamp=")
        stamp = rows.stamp
    write_rows_guarded(log_file, rows, stamp, default=str,
                       what=f"{log_file}: waehrend des Laufs geschrieben (ein Urteil?) — "
                            "Lauf wiederholen, nichts ueberschrieben")
    if isinstance(rows, LogRows):
        rows.stamp = stamp_of(log_file)


def flag_frame(session_id: str, idx: int, unusable: bool) -> dict:
    """Set or clear the `unusable` flag on one frame; `slice` skips flagged frames.

    A REVIEW action: this is a read-modify-write of the whole log, so doing it while the same
    session is actively being recorded could drop a concurrently appended line.
    """
    sdir, _archived = session_dir(session_id)
    # Ein Urteil, keine Ableitung aus den Brettern: der laufende Export traegt es hinueber.
    rows = read_log(sdir, under_export=True)
    if idx < 0 or idx >= len(rows):
        raise ValueError(f"Index {idx} out of range (0-{len(rows) - 1}).")
    rows[idx]["unusable"] = bool(unusable)
    # Gesichert wie jede andere Schreibfunktion dieses Abschnitts: es ist ein
    # Lesen-Aendern-Schreiben des GANZEN Logs, und eine dabei verlorene Zeile ist sonst weg.
    backup = backup_log(log_path(sdir))
    _write_log(sdir, rows)
    return {"session_id": session_id, "index": idx, "unusable": bool(unusable), "backup": backup}


# --- export-session: a confirmed video becomes a session `slice` can eat ---------------------

EXPORT_PROFILE = "desktop"



#: Was ein MENSCH an eine Log-Zeile schreibt (`session_store.log.flag_frame`, `lib/frame-flag.ts`). Kein
#: Ledger haelt es, also traegt der Export es selbst auf die neue Zeile desselben Frames.
HUMAN_KEYS = ("unusable",)


class VerdictsWouldDrop(ValueError):
    """Der Export waehlt einen Frame nicht mehr, auf dem ein Mensch geurteilt hat."""


def refuse_orphaned_verdicts(orphans: list[str], drop_verdicts: bool) -> None:
    """`false` zaehlt mit: es ist eine Ruecknahme, also ebenfalls ein menschliches Urteil."""
    if not orphans:
        return
    names = ", ".join(orphans[:20]) + (" ..." if len(orphans) > 20 else "")
    if not drop_verdicts:
        raise VerdictsWouldDrop(
            f"{len(orphans)} menschliche `unusable`-Urteile stehen auf Frames, die dieser Export "
            f"nicht mehr waehlt ({names}) — Export verweigert, nichts geschrieben. Ausdruecklich "
            f"verwerfen mit `--drop-verdicts` (sie bleiben dann nur in der `.bak`).")
    print(f"  [WARN] --drop-verdicts: {len(orphans)} human `unusable` verdicts dropped ({names}) "
          f"— they stay only in the backup")


def carry_human_verdicts(old: list[dict], rows: list[dict]) -> list[str]:
    """Copy `HUMAN_KEYS` per frame stem; returns the stems whose verdict found no new row."""
    fresh = {Path(r["frame"]).stem: r for r in rows if r.get("frame")}
    orphans = []
    for prev in old:
        verdict = {k: prev[k] for k in HUMAN_KEYS if k in prev}
        if not verdict or not prev.get("frame"):
            continue
        stem = Path(prev["frame"]).stem
        if stem in fresh:
            fresh[stem].update(verdict)
        else:
            orphans.append(stem)
    return orphans


@contextmanager
def mark_export(session_dir: Path):
    """Markiert die Strecke, in der Bretter schon neu und das Log noch alt ist."""
    session_dir.mkdir(parents=True, exist_ok=True)
    marker = session_dir / EXPORT_MARKER
    marker.write_text(f"export started {datetime.now(UTC).isoformat()}\n", encoding="utf-8")
    yield_ok = False
    try:
        yield marker
        yield_ok = True
    finally:
        # NUR nach einem sauberen Durchlauf weg: der Marker IST die Spur.
        if yield_ok:
            marker.unlink(missing_ok=True)


def write_session(session_dir: Path, name: str, candidate: dict, rows: list[dict], *,
                  drop_verdicts: bool = False) -> Path:
    """`session.yaml` + `log.jsonl` in the §2 shape of `docs/data-pipeline.md`, nothing else."""

    log_file = log_path(session_dir)
    stamp = stamp_of(log_file)
    # Frisch gelesen, nicht vom Planungsbeginn: ein Urteil aus der Minute davor muss mit.
    old = read_jsonl(log_file) if stamp is not None else []
    refuse_orphaned_verdicts(carry_human_verdicts(old, [dict(r) for r in rows]), drop_verdicts)
    carry_human_verdicts(old, rows)
    # A re-export REPLACES a log that may hold hand-set quads or a review's verdicts. Same
    # `log.jsonl.bak.<stamp>` convention `session scan|autofix|adopt` use, for the same reason.
    if stamp is not None:
        print(f"  previous log backed up as {backup_log(log_file)}")
    meta = {
        # The id keeps the `rg-` prefix the DIRECTORY dropped: it is the join key in every
        # manifest and in `session_store.paths.session_dir`, so it must not follow the folder rename.
        "session_id": f"rg-{session_dir.name}",
        "profile": EXPORT_PROFILE,
        "mode": "track",
        "created_at": base_time(candidate).isoformat(),
        "frame_size": [int(v) for v in candidate["geometry"]["frame_size"]],
        "notes": f"exported from data/recordings/{name} (specs/53-01)",
        "reviewed": True,
    }
    session_dir.mkdir(parents=True, exist_ok=True)
    with (session_dir / META_FILE).open("w", encoding="utf-8") as fh:
        yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)
    write_rows_guarded(log_file, rows, stamp,
                       what=f"{log_file}: waehrend des Exports geschrieben — Export wiederholen, "
                            "das Log ist unveraendert")
    return session_dir
