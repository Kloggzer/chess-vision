"""Der EINE Weg, auf dem ein Alpha erscheint: Pixel neben das Ziel stagen, unter
`locks.matte_ledger` den Ledger schreiben, dann umhaengen; scheitert das, geht die Zeile zurueck.
"""

from __future__ import annotations

from collections.abc import Callable, Collection, Iterator
from contextlib import contextmanager
from pathlib import Path

import cv2

from . import locks
from .ioutil import read_jsonl, stamp_of, write_rows_guarded
from .session_store.names import matte_path


@contextmanager
def staging() -> Iterator[dict]:
    """`key -> (tmp, final)`; was beim Verlassen noch gestapelt liegt, wird geloescht."""
    staged: dict = {}
    try:
        yield staged
    finally:
        for tmp, _ in staged.values():
            tmp.unlink(missing_ok=True)


def stage(staged: dict, key, image, final: Path, tmp: Path | None = None) -> None:
    # `.tmp.webp`, nicht `.webp.tmp`: `imwrite` waehlt den Codec ueber die ENDUNG.
    tmp = tmp or final.with_name(f"{final.stem}.tmp{final.suffix}")
    staged[key] = (tmp, final)
    if not cv2.imwrite(str(tmp), image):
        raise OSError(f"could not write {tmp}")


def _replace(_key, tmp: Path, final: Path) -> None:
    tmp.replace(final)


def publish(session_dir: Path, job: str, write: Callable[[], object], staged: dict,
            retract: Callable[[list[dict], set], list[dict]], *,
            place: Callable[[object, Path, Path], object] = _replace,
            skip: Callable[[list[dict]], Collection] = lambda _rows: ()) -> None:
    """Under the ledger lock: `write` the rows, rename what the ledger now carries (`skip`: frames
    another writer owns), and hand the rows of a failed rename to `retract`, stamp-guarded."""
    path, name = matte_path(session_dir), Path(session_dir).name
    with locks.matte_ledger(session_dir, job):
        write()
        while True:
            mine = stamp_of(path)
            rows = read_jsonl(path)
            taken = skip(rows)
            if stamp_of(path) == mine:
                break
        failed = {}
        for key, (tmp, final) in staged.items():
            if key in taken:
                continue
            try:
                place(key, tmp, final)
            except OSError as error:   # Windows: a web cut still reads the alpha
                failed[key] = error
        if failed:
            write_rows_guarded(path, retract(rows, set(failed)), mine,
                               what=f"{name}: matte.jsonl changed while retracting")
            raise OSError(f"{name}: could not place the alpha of {', '.join(map(str, failed))}; "
                          "each row is retracted — run this again") from next(iter(failed.values()))
