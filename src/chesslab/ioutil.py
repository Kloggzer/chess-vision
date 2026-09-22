"""Die Treuhand fuer JSON und JSONL — jeder Lese- und Schreibvorgang laeuft hier durch.

Wer selbst schneidet oder schreibt, beantwortet die Leerzeile, den abgerissenen Schwanz und den
gleichzeitigen zweiten Schreiber neu und lag dabei schon mehrfach daneben. Die Antwort steht hier
einmal; `tests/test_json_doors.py` haelt die Liste der Stellen, die noch daran vorbei schreiben.
"""

from __future__ import annotations

import itertools
import json
import os
from collections.abc import Callable, Iterable, Iterator
from pathlib import Path

# Der Pool haelt wiederholte Strings zusammen, der Deckel haelt EINMALIGE draussen: `path` ist
# je Zeile verschieden und wuerde den Pool sonst mit 600k Eintraegen fuellen, die nie ein zweites
# Mal getroffen werden. 200 000 reichen fuer jedes kategorische Feld eines Manifests.
_STR_POOL_CAP = 200_000


def iter_jsonl(path: Path) -> Iterator[dict]:
    """Dieselbe Politik wie `read_jsonl`, aber ohne die Liste — je Zeile ein Objekt.

    Zehn Stellen schnitten selbst, weil sie ueber 465k-Zeilen-Manifeste ZAEHLEN oder nur die
    erste Zeile brauchen und eine Liste nicht bezahlen wollen. Sie erfanden damit die Politik
    neu und starben alle an derselben halben letzten Zeile.

    Der Preis: solange der Generator LEBT, haelt er die Datei offen, und auf Windows scheitert
    ein `write_rows` darauf mit `WinError 5`. In einer Schleife verbraucht oder mit `return`
    verlassen ist er sofort zu; festgehalten nicht (`tests/test_ioutil.py`).
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

    # TextIO already yields Unicode. Calling the decoder directly avoids repeating the public
    # json.loads type/encoding dispatch for every line of large manifests.
    decode = json.JSONDecoder(object_pairs_hook=pooled).decode
    broken: ValueError | None = None
    # Ein mitten im Anhaengen erschlagener Schreiber laesst eine halbe LETZTE Zeile zurueck; die
    # faellt weg. Eine kaputte Zeile MITTENDRIN ist Korruption und bleibt laut — deshalb wird der
    # Fehler erst geworfen, wenn doch noch eine Zeile folgt.
    # `newline=""` zeigt die ECHTEN Bytes: sonst uebersetzt der Universal-Modus ein abgerissenes
    # CR in LF, und die halbe Schwanzzeile saehe ganz aus (1127 der 1329 Dateien tragen CRLF).
    # `utf-8-sig`: PowerShells `Out-File`/`Set-Content` stempeln hier per Vorgabe ein BOM, und
    # ein einziges liess 2026-08-16 jeden Datensatz-Bau am Vorflug sterben. Ohne BOM aendert es nichts.
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
            # Nur Objekte, wie `lib/jsonl.ts` und `Jsonl.kt`: eine Zahl oder Liste ist gueltiges
            # JSON, aber keine Zeile dieses Formats, und als `dict` deklariert wandert sie sonst
            # bis zum ersten `row["x"]` mit und stirbt dort.
            if not isinstance(row, dict):
                continue
            yield row


def read_jsonl(path: Path) -> list[dict]:
    """Read JSONL file, missing file → [], skip empty lines.

    Streams line by line on purpose: reading the whole file into one string and then splitting it
    held ~3 extra copies of a multi-GB manifest in memory at once (whole text + list of lines +
    parsed dicts) and hit MemoryError on the million-crop synthetic manifests.

    Wiederholte Schluessel und Werte zeigen auf EIN Objekt: ein Manifest ist fast nur
    Wiederholung, und `real13-mix-v4` kostet so 0,51 statt 1,12 GB (gemessen 2026-08-29) —
    je LAUF, denn Prozesse teilen keine Python-Objekte, nur die Memmap des Packs.
    """
    return list(iter_jsonl(path))


def _side_file(path: Path) -> Path:
    """Eine EIGENE Nebendatei je Schreiber: ein gemeinsamer Name liess den Abbrecher die

    halb geschriebene Datei des laufenden wegraeumen, der sein Umhaengen dann verlor.
    """
    return path.with_suffix(f"{path.suffix}.{os.getpid()}.{next(_SIDE)}.tmp")


_SIDE = itertools.count()


def write_atomic(path: Path, text: str) -> None:
    """Schreiben heisst hier: entweder ganz da oder gar nicht — Nebendatei, dann umhaengen."""
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


def stamp_of(path: Path) -> tuple[int, int] | None:
    """Mtime und Groesse — die Form, auf die `matte` und `lib/session.ts` schon cachen."""
    try:
        st = Path(path).stat()
    except OSError:
        return None
    return (st.st_mtime_ns, st.st_size)


def rows_text(rows: Iterable[dict], *, default: Callable[[object], object] | None = None) -> str:
    """Streng per Vorgabe: was `json` nicht kennt, ist ein Fehler und keine Zeichenkette."""
    return "".join(json.dumps(r, ensure_ascii=False, default=default) + chr(10) for r in rows)


def write_rows(path: Path, rows: Iterable[dict], *,
               default: Callable[[object], object] | None = None) -> int:
    """Eine ganze JSONL-Datei ersetzen. Gibt die Zahl der Zeilen zurueck."""
    rows = list(rows)
    write_atomic(path, rows_text(rows, default=default))
    return len(rows)


def write_rows_guarded(path: Path, rows: Iterable[dict], stamp: tuple[int, int] | None,
                       *, what: str) -> int:
    """Nur schreiben, solange die Datei die ist, an der die Arbeit begann.

    Zweimal geprueft, davor und unmittelbar vor dem Umhaengen: das Neuschneiden dauert Minuten
    und das Serialisieren noch Sekunden, und in beiden Fenstern haengt der Alpha-Worker an.
    """
    path = Path(path)
    text = rows_text(list(rows))
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


def append_rows(path: Path, rows: Iterable[dict]) -> int:
    """Anhaengen — und vorher einen abgerissenen Schwanz abschneiden.

    Ohne Umbruch am Ende steht dort eine halbe Zeile. Wer blind anhaengt, klebt seine daran und
    macht aus dem tolerierten Rest echte Beschaedigung, auf die `read_jsonl` dann wirft.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    if path.exists():
        # `newline=""`: die ECHTEN Bytes sehen. Im Universal-Modus wuerde ein abgerissenes `\r`
        # als Umbruch gelten, und der halbe Schwanz saehe ganz aus (1127 der 1329 Dateien sind CRLF).
        with path.open(encoding="utf-8", newline="") as fh:
            text = fh.read()
        if text and not text.endswith("\n"):
            # Ein blankes `\r` am Ende ist ein zwischen CR und LF erschlagener Schreiber: die
            # ZEILE ist ganz und bekommt nur ihren Umbruch. Dahinter anzuhaengen ergaebe eine,
            # die `lib/jsonl.ts` und `Jsonl.kt` (Trenner `\r?\n`) als EINE und kaputt lesen.
            kept = [line.rstrip("\r\n") for line in text.splitlines(keepends=True)]
            if not text.endswith("\r"):
                kept = kept[:-1]
            write_atomic(path, "".join(line + "\n" for line in kept))
    with path.open("a", encoding="utf-8") as fh:
        fh.write(rows_text(rows))
    return len(rows)


def update_rows(path: Path, change: Callable[[list[dict]], list[dict]]) -> int:
    """Lesen, aendern, schreiben — und dazwischen pruefen, dass niemand sonst geschrieben hat.

    Der Riegel, den `matte.recut_coverage` schon von Hand fuehrt: ohne ihn macht ein zweiter
    Schreiber die Arbeit des ersten rueckgaengig, und beide melden Erfolg.
    """
    path = Path(path)
    before = stamp_of(path)
    rows = change(read_jsonl(path))
    # Bis zum Umhaengen weiterpruefen: ein Riegel VOR einem unbewachten `write_rows` laesst genau
    # das Fenster offen, in dem das Serialisieren noch Sekunden dauert.
    return write_rows_guarded(
        path, rows, before,
        what=f"{path}: wurde waehrend der Aenderung geschrieben — nochmal versuchen")
