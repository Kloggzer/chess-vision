"""Die eine Fortschrittszeile, die `lib/progress.ts` aus dem Log liest."""

from __future__ import annotations

#: Frames between progress lines. The log IS the progress channel (`platform/app/lib/progress.ts`).
PROGRESS_EVERY = 100


#: Feiner als `PROGRESS_EVERY`: ein Abschnitt ist oft kuerzer als 100 Zeilen.
WORKER_PROGRESS_EVERY = 10


def say_progress(progress, done: int, line: str) -> None:
    """A serial run prints its own line; a worker only counts, or four `N/M` lines make the bar
    jump.
    """
    if progress is None:
        if done % PROGRESS_EVERY == 0:
            print(line, flush=True)
    elif done % WORKER_PROGRESS_EVERY == 0:
        progress(WORKER_PROGRESS_EVERY)
