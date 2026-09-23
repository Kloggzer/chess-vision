"""Frueher Abbruch schwacher Trainingslaeufe — GEEICHT UND VERWORFEN: auf diesem Korpus trennt kein
Frueh-Kriterium gute von schlechten Laeufen (rueckwirkend 15 von 33 getoetet, die besten
darunter).

Der Live-Modus toetet deshalb NUR mit `--arm`.

    uv run python scripts/train_watchdog.py --replay      # die Eichung nachrechnen"""
import argparse
import subprocess
import time
from pathlib import Path

from chesslab.ioutil import read_jsonl

#: Rauschen je Epoche ueber 25 Laeufe. `occ_board` nicht: es verlangt alle 64 Felder und springt
#: zwischen Nachbarepochen von 0,03 auf 0,88.
SD_OCC = 0.0028
SD_MACRO = 0.0178
#: Vorher ist alles Rauschen; die Basiskurve steigt bis Epoche 20 steil.
MIN_EPOCH = 15
#: So viele Epochen in Folge muss das Urteil halten.
STREAK = 3


#: Die Spalten der Eichung; `_compact_metrics` streicht beide aus Occlusion-Laeufen, und eine
#: `visible_`-Spalte waere eine ANDERE Messung.
NEEDED = ("val_occupied_acc", "val_macro_recall")


def refuse_unless_comparable(rec: dict) -> None:
    """Laut statt KeyError: der Lauf traegt die Spalten nicht, gegen die geeicht wurde."""
    missing = [k for k in NEEDED if k not in rec]
    if missing:
        raise SystemExit(
            f"[FAIL] dieser Lauf traegt {', '.join(missing)} nicht — `_compact_metrics` streicht "
            f"sie aus jedem `--head occlusion`-Lauf. SD_OCC/SD_MACRO sind gegen genau diese "
            f"Spalten geeicht; eine `visible_`-Spalte einzusetzen misst etwas anderes unter "
            f"derselben Schwelle. Neu eichen oder den Lauf ohne Occlusion-Kopf messen."
        )


def verdict(run: list[dict], base: list[dict], e: int) -> str | None:
    """Warum dieser Lauf bei Epoche `e` aus dem Rauschen faellt — oder None."""
    r, b = run[e - 1], base[min(e, len(base)) - 1]
    refuse_unless_comparable(r)
    refuse_unless_comparable(b)
    oa, oab = r["val_occupied_acc"], b["val_occupied_acc"]
    if oa < oab - 6 * SD_OCC:
        return f"occ_acc {oa:.4f} liegt {(oab-oa)/SD_OCC:.1f} sd unter der Basis ({oab:.4f})"
    mr, mrb = r["val_macro_recall"], b["val_macro_recall"]
    if mr < mrb - 6 * SD_MACRO:
        return f"macro {mr:.3f} liegt {(mrb-mr)/SD_MACRO:.1f} sd unter der Basis ({mrb:.3f})"
    return None


def check(base: list[dict], dry: bool) -> None:
    for d in sorted(Path("data/models/_reg").iterdir()):
        p = d / "metrics.jsonl"
        if not p.is_file() or d.name.endswith(".abgebrochen"):
            continue
        ms = read_jsonl(p)
        if len(ms) < MIN_EPOCH + STREAK or len(ms) >= 60:
            continue
        why = [verdict(ms, base, e) for e in range(len(ms) - STREAK + 1, len(ms) + 1)]
        if not all(why):
            continue
        print(f"[ABBRUCH] {d.name} bei Epoche {len(ms)}: {why[-1]} "
              f"({STREAK} Epochen in Folge)", flush=True)
        if dry:
            continue
        subprocess.run(["powershell", "-NoProfile", "-Command",
                        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | "
                        f"Where-Object {{ $_.CommandLine -like '*{d.name}*' }} | "
                        "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }"],
                       check=False, capture_output=True)
        time.sleep(5)
        d.rename(d.with_name(d.name + ".abgebrochen"))


def replay(base: list[dict], dirs: list[Path]) -> None:
    """Rueckwirkend: wo haette der Waechter zugeschlagen, und was wurde aus dem Lauf? Ein Fehlalarm
    kostet einen Befund, ein verpasster Abbruch nur GPU-Zeit.
    """
    print(f"{'Lauf':30}{'Ep':>4}{'Abbruch bei':>13}{'gespart':>9}"
          f"{'Endstand macro':>16}{'occ_acc':>9}")
    for d in dirs:
        p = d / "metrics.jsonl"
        if not p.is_file():
            continue
        ms = read_jsonl(p)
        if len(ms) < MIN_EPOCH + STREAK:
            continue
        hit = None
        for e in range(MIN_EPOCH + STREAK, len(ms) + 1):
            if all(verdict(ms, base, k) for k in range(e - STREAK + 1, e + 1)):
                hit = e
                break
        # Ohne die Spalte gibt es keinen besten Lauf; `-1` fuer alle waehlte stumm die ERSTE Epoche.
        scored = [r for r in ms if "val_checkpoint_score" in r]
        best = max(scored, key=lambda r: r["val_checkpoint_score"]) if scored else None
        saved = f"{100 * (len(ms) - hit) / len(ms):.0f} %" if hit else "—"
        cols = ("—".rjust(16) + "—".rjust(9) if best is None else
                f"{best['val_macro_recall']:>16.4f}{best['val_occupied_acc']:>9.4f}")
        print(f"{d.name:30}{len(ms):>4}{(str(hit) if hit else '—'):>13}{saved:>9}{cols}")
        if hit:
            print(f"{'':30}   Grund: {verdict(ms, base, hit)}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="data/models/_ab/c8d1-seed42/metrics.jsonl")
    ap.add_argument("--every", type=int, default=300, help="Sekunden zwischen den Runden.")
    ap.add_argument("--arm", action="store_true",
                    help="Wirklich abbrechen. Ohne das nur melden — siehe Eichung im Kopf.")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--replay", action="store_true",
                    help="Rueckwirkend ueber alle fertigen Laeufe statt live.")
    a = ap.parse_args()
    base = read_jsonl(Path(a.base))
    print(f"[i] Waechter laeuft, Basis {a.base}. Abbruch nur wenn occ_acc oder macro_recall "
          f"6 sd unter der Basis am GLEICHEN Epochenstand liegen, {STREAK} Epochen in Folge, "
          f"fruehestens ab Epoche {MIN_EPOCH}.")
    if a.replay:
        dirs = sorted(list(Path("data/models/_reg").iterdir())
                      + list(Path("data/models/_ab").iterdir()))
        replay(base, [d for d in dirs if d.is_dir()])
        return 0
    while True:
        check(base, not a.arm)
        if a.once:
            return 0
        time.sleep(a.every)


if __name__ == "__main__":
    raise SystemExit(main())
