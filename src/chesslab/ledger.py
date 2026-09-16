"""Die Treuhand fuer JSON und JSONL: EINE Tuer fuer jeden Schreibvorgang.

Lesen hat seine Tuer schon (`ioutil.read_jsonl`). Schreiben hatte keine: `framescan` hielt den
atomaren Weg als private Funktion, 18 andere Stellen riefen `write_text` direkt.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable, Iterable
from pathlib import Path

#: Endung der Nebendatei. Bei JSON harmlos — anders als bei `cv2.imwrite`, das den Codec an der
#: ENDUNG waehlt und an einem `.webp.tmp` still scheitert.
TMP = ".tmp"


class Contested(RuntimeError):
    """Jemand anders hat die Datei geschrieben, waehrend wir sie geaendert haben."""


def stamp_of(path: Path) -> tuple[int, int] | None:
    """Mtime und Groesse — die Form, auf die `matte` und `lib/session.ts` schon cachen."""
    try:
        st = path.stat()
    except OSError:
        return None
    return (st.st_mtime_ns, st.st_size)


def write_text(path: Path, text: str) -> None:
    """Entweder ganz da oder gar nicht: Nebendatei schreiben, dann umhaengen.

    `write_text` direkt KUERZT die Datei, bevor es sie fuellt — ein Abbruch dazwischen laesst sie
    halb da, und der naechste Lauf haelt sie fuer fertig.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + TMP)
    tmp.write_text(text, encoding="utf-8", newline="\n")
    os.replace(tmp, path)


def rows_text(rows: Iterable[dict]) -> str:
    return "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)


def write_rows(path: Path, rows: Iterable[dict]) -> int:
    """Eine ganze JSONL-Datei ersetzen. Gibt die Zahl der Zeilen zurueck."""
    rows = list(rows)
    write_text(path, rows_text(rows))
    return len(rows)


def write_json(path: Path, obj: object, *, indent: int | None = 2) -> None:
    write_text(path, json.dumps(obj, indent=indent, ensure_ascii=False) + "\n")


def append_rows(path: Path, rows: Iterable[dict]) -> int:
    """Anhaengen — und vorher einen abgerissenen Schwanz abschneiden.

    Ohne Umbruch am Ende steht dort eine halbe Zeile. Wer blind anhaengt, klebt seine daran und
    macht aus dem tolerierten Rest echte Beschaedigung, auf die `read_jsonl` dann wirft.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    if path.exists():
        with path.open(encoding="utf-8", newline="") as fh:
            text = fh.read()
        if text and not text.endswith("\n"):
            keep = text.rsplit("\n", 1)[0]
            write_text(path, keep + "\n" if keep else "")
    with path.open("a", encoding="utf-8", newline="\n") as fh:
        fh.write(rows_text(rows))
    return len(rows)


def update_rows(path: Path, change: Callable[[list[dict]], list[dict]]) -> int:
    """Lesen, aendern, schreiben — und dazwischen pruefen, dass niemand sonst geschrieben hat.

    Der Riegel, den `matte.recut_coverage` schon von Hand fuehrt: ohne ihn macht ein zweiter
    Schreiber die Arbeit des ersten rueckgaengig, und beide melden Erfolg.
    """
    from .ioutil import read_jsonl

    path = Path(path)
    before = stamp_of(path)
    rows = change(read_jsonl(path))
    if stamp_of(path) != before:
        raise Contested(f"{path}: wurde waehrend der Aenderung geschrieben — nochmal versuchen")
    return write_rows(path, rows)
