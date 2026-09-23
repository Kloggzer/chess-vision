"""Frueher Abbruch schwacher Trainingslaeufe — GEEICHT UND VERWORFEN (2026-08-26).

Das Werkzeug bleibt, weil sein `--replay` das Ergebnis traegt: **auf diesem Korpus trennt kein
Frueh-Kriterium gute von schlechten Laeufen.** Wer es nochmal bauen will, faengt hier an.

Rueckwirkend ueber 33 fertige Laeufe haette das relative Kriterium (occ_acc oder macro 6 sd unter
der Basis am gleichen Epochenstand, 3 Epochen in Folge) **15 davon getoetet** — darunter `c8d2`
und `p8`, die beiden besten Arme des Mischungsvergleichs, und `balcls-wcap1-wd05`, den
aussichtsreichsten Regularisierungslauf. Zwei Gruende:

- **Fremde Val-Saetze.** `p8`/`p2`/`c2d8` sind andere Datensaetze mit anderem Verdeckungsanteil;
  ihr `occ_acc` gegen den der Basis zu halten ist der Konfundierer der Ausduenn-Studie (2026-08-26).
- **Regularisierte Arme starten langsamer und holen auf.** `wd20` faellt zwischendurch auf
  `occ_acc` 0,626 (von 0,987) und endet ueber der Basis.

Absolute Boeden helfen nicht: 0,90 auf `occ_acc` trifft 7 legitime Laeufe, und `train_loss` bei
Epoche 15 ist fuer `wd20` (0,551) hoeher als fuer den wirklich kaputten `wd50` bei Epoche 2
(0,588). Passt zum Morgenbefund in `docs/evaluation.md`: Spearman 0,40 zwischen der
Rangfolge nach 15 und nach 60 Epochen.

Der Live-Modus toetet deshalb NUR mit `--arm`; ohne das laeuft er trocken.

    uv run python scripts/train_watchdog.py --replay      # die Eichung oben nachrechnen
"""
import argparse
import subprocess
import time
from pathlib import Path

from chesslab.ioutil import read_jsonl

#: Rauschen je Epoche, gemessen ueber 25 Laeufe. `occ_board` steht bewusst NICHT hier: es
#: verlangt alle 64 Felder richtig und traegt damit sd 0,0989 — es springt zwischen Nachbarepochen
#: von 0,03 auf 0,88, waehrend die Zellgenauigkeit sich um 0,016 bewegt. Als Abbruchkriterium
#: haette es am 2026-08-26 einen gesunden Lauf getoetet.
SD_OCC = 0.0028
SD_MACRO = 0.0178
#: Vorher ist alles Rauschen — die Basiskurve steigt bis Epoche 20 noch steil.
MIN_EPOCH = 15
#: So viele Epochen in Folge muss das Urteil halten.
STREAK = 3


#: Die zwei Spalten, gegen die SD_OCC und SD_MACRO geeicht sind. `_compact_metrics` streicht
#: beide aus jedem Occlusion-Lauf, und fuer `macro_recall` gibt es dort kein Gegenstueck — eine
#: `visible_`-Spalte einzusetzen waere eine ANDERE Messung unter denselben Schwellen.
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
    """Rueckwirkend: wo haette der Waechter zugeschlagen, und was ist aus dem Lauf geworden?

    Das ist die Eichung. Ein Kriterium, das gute Arme killt, ist schlimmer als keins — der Preis
    eines Fehlalarms ist ein verlorener Befund, der eines verpassten Abbruchs nur GPU-Zeit.
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
        # Ohne die Spalte gibt es keinen besten Lauf: `-1` fuer alle waehlte stumm die ERSTE
        # Epoche und meldete sie als Bestwert.
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
