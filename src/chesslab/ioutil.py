"""Die Treuhand fuer JSON und JSONL: Leerzeile, abgerissener Schwanz und zweiter Schreiber werden
hier einmal beantwortet (`tests/test_json_doors.py`).
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from collections.abc import Callable, Iterable, Iterator
from pathlib import Path

# Der Deckel haelt EINMALIGE Strings draussen: `path` wuerde den Pool sonst mit 600k Eintraegen
# fuellen.
_STR_POOL_CAP = 200_000


def iter_jsonl(path: Path) -> Iterator[dict]:
    """Dieselbe Politik wie `read_jsonl`, aber als Generator.

    Solange er LEBT, haelt er die Datei offen, und auf Windows scheitert ein `write_rows` darauf
    mit `WinError 5`. Verbraucht oder verlassen ist er zu.
    """
    p = Path(path)
    if not p.exists():
        return
    pool: dict[str, str] = {}

    def pooled(pairs: list[tuple[str, object]]) -> dict:
        row = {}
        for key, value in pairs:
            key = pool.setdefault(key, key)
            if type(value) is str:
                seen = pool.get(value)
                if seen is not None:
                    value = seen
                elif len(pool) < _STR_POOL_CAP:
                    pool[value] = value
            row[key] = value
        return row

    # Calling the decoder directly skips `json.loads`' type dispatch per line.
    decode = json.JSONDecoder(object_pairs_hook=pooled).decode
    broken: ValueError | None = None
    # Eine halbe LETZTE Zeile (erschlagener Schreiber) faellt weg, eine kaputte MITTENDRIN wirft.
    # `newline=""`: sonst macht der Universal-Modus ein abgerissenes CR zu LF. `utf-8-sig`:
    # PowerShells `Out-File`/`Set-Content` stempeln ein BOM.
    with p.open(encoding="utf-8-sig", newline="") as fh:
        for line in fh:
            if not line.strip():
                continue
            if broken is not None:
                raise broken
            try:
                row = decode(line)
            except ValueError as exc:
                if line.endswith("\n"):
                    raise
                broken = exc
                continue
            # Nur Objekte, wie `lib/jsonl.ts` und `Jsonl.kt`: eine Zahl ist gueltiges JSON, aber
            # keine Zeile.
            if not isinstance(row, dict):
                continue
            yield row


def read_jsonl(path: Path) -> list[dict]:
    """Read JSONL file, missing file -> [], skip empty lines.

    Streamed: whole-text-then-split hit MemoryError on million-row manifests. Repeated
    keys/values share ONE object (`real13-mix-v4`: 0,51 statt 1,12 GB je Prozess).
    """
    return list(iter_jsonl(path))


def _side_file(path: Path) -> Path:
    """Eine EIGENE Nebendatei je Schreiber: ein gemeinsamer Name liess den Abbrecher die halbe Datei
    des laufenden wegraeumen.
    """
    return path.with_suffix(f"{path.suffix}.{os.getpid()}.{next(_SIDE)}.tmp")


_SIDE = itertools.count()


def write_atomic(path: Path, text: str) -> None:
    """Entweder ganz da oder gar nicht — Nebendatei, dann umhaengen."""
    path = Path(path)
    tmp = _side_file(path)
    try:
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


class Contested(RuntimeError):
    """Jemand anders hat die Datei geschrieben, waehrend wir sie geaendert haben."""


def stamp_of(path: Path) -> tuple[int, str] | None:
    """Groesse und Inhalts-Hash; `None` nur, wenn die Datei FEHLT. Mtime taugt nicht: zwei gleich
    lange Schreiber im selben Takt tragen dieselbe, auch in ns.
    """
    try:
        data = Path(path).read_bytes()
    except FileNotFoundError:
        return None
    return (len(data), hashlib.sha256(data).hexdigest())


def rows_text(rows: Iterable[dict], *, default: Callable[[object], object] | None = None) -> str:
    """Streng: was `json` nicht kennt, ist ein Fehler und keine Zeichenkette."""
    return "".join(json.dumps(r, ensure_ascii=False, default=default) + chr(10) for r in rows)


def write_rows(path: Path, rows: Iterable[dict], *,
               default: Callable[[object], object] | None = None) -> int:
    rows = list(rows)
    write_atomic(path, rows_text(rows, default=default))
    return len(rows)


def write_rows_guarded(path: Path, rows: Iterable[dict], stamp: tuple[int, str] | None,
                       *, what: str, default: Callable[[object], object] | None = None) -> int:
    """Nur schreiben, solange die Datei die ist, an der die Arbeit begann — geprueft davor und
    unmittelbar vor dem Umhaengen, weil in beiden Fenstern ein anderer Schreiber anhaengen kann.
    """
    path = Path(path)
    text = rows_text(list(rows), default=default)
    tmp = _side_file(path)
    try:
        if stamp_of(path) != stamp:
            raise Contested(what)
        tmp.write_text(text, encoding="utf-8")
        if stamp_of(path) != stamp:
            raise Contested(what)
        tmp.replace(path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
    return text.count(chr(10))


def write_json(path: Path, obj: object, *, indent: int | None = 2) -> None:
    write_atomic(path, json.dumps(obj, indent=indent, ensure_ascii=False) + "\n")


def write_json_guarded(path: Path, obj: object, stamp: tuple[int, str] | None, *, what: str,
                       indent: int | None = 2) -> None:
    """`write_json` mit dem Riegel von `write_rows_guarded`: `Contested`, statt ein Urteil zu ersetzen."""
    path = Path(path)
    text = json.dumps(obj, indent=indent, ensure_ascii=False) + "\n"
    tmp = _side_file(path)
    try:
        if stamp_of(path) != stamp:
            raise Contested(what)
        tmp.write_text(text, encoding="utf-8")
        if stamp_of(path) != stamp:
            raise Contested(what)
        tmp.replace(path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def append_rows(path: Path, rows: Iterable[dict]) -> int:
    """Anhaengen, und vorher einen abgerissenen Schwanz abschneiden: blind daran geklebt wird aus
    dem tolerierten Rest Korruption mittendrin.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    if path.exists():
        # `newline=""`: im Universal-Modus gaelte ein abgerissenes `\r` als Umbruch.
        with path.open(encoding="utf-8", newline="") as fh:
            text = fh.read()
        if text and not text.endswith("\n"):
            # Ein blankes `\r` am Ende: die ZEILE ist ganz und bekommt nur ihr `\n`; dahinter
            # angehaengt laesen `lib/jsonl.ts` und `Jsonl.kt` (`\r?\n`) beide als EINE kaputte.
            kept = [line.rstrip("\r\n") for line in text.splitlines(keepends=True)]
            if not text.endswith("\r"):
                kept = kept[:-1]
            write_atomic(path, "".join(line + "\n" for line in kept))
    with path.open("a", encoding="utf-8") as fh:
        fh.write(rows_text(rows))
    return len(rows)


def update_rows(path: Path, change: Callable[[list[dict]], list[dict]]) -> int:
    """Lesen, aendern, schreiben — und dazwischen pruefen, dass niemand sonst geschrieben hat; sonst
    macht ein zweiter Schreiber die Arbeit des ersten rueckgaengig, und beide melden Erfolg.
    """
    path = Path(path)
    before = stamp_of(path)
    rows = change(read_jsonl(path))
    # Bis zum Umhaengen pruefen: das Serialisieren dauert Sekunden.
    return write_rows_guarded(
        path, rows, before,
        what=f"{path}: wurde waehrend der Aenderung geschrieben — nochmal versuchen")
