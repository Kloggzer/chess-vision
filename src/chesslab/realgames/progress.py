"""Die eine Fortschrittszeile, die `lib/progress.ts` aus dem Log liest."""

from __future__ import annotations

#: Frames between progress lines. The log IS the progress channel (`platform/app/lib/progress.ts`).
PROGRESS_EVERY = 100


#: Wie oft ein Worker seinen Stand meldet. Feiner als `PROGRESS_EVERY`, weil ein Abschnitt oft
#: kürzer als 100 Zeilen ist — der Balken stünde sonst bis zum Ende der Phase auf null.
WORKER_PROGRESS_EVERY = 10


def say_progress(progress, done: int, line: str) -> None:
    """A serial run prints its own line; a worker only counts, because the bar belongs to one log.

    Four workers each printing `N/M` would make `lib/progress.ts` (last number wins) jump about.
    """
    if progress is None:
        if done % PROGRESS_EVERY == 0:
            print(line, flush=True)
    elif done % WORKER_PROGRESS_EVERY == 0:
        progress(WORKER_PROGRESS_EVERY)
