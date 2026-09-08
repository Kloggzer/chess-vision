# Der Audit darf nur über Klassen urteilen, die das Modell ausgibt

**Gefunden 2026-09-08**, nachdem die Fold-Modelle die Lesarten übernommen hatten.

## Der Befund

`audit-flags --all --visible` meldete **9 807 Flags**. Davon sagten **3 548** `→ occluded` — bei
einer Wahrscheinlichkeit von exakt **0,000** und negativer Margin. Ein Modell, das `occluded` gar
nicht ausgeben kann, „sagte" es 3 548-mal vorher.

| Art | vorher | nach dem Fix |
|---|---:|---:|
| Typ | 3 828 | 3 828 |
| Besetzung | 2 063 | 2 063 |
| Farbe | 368 | 368 |
| **→ `occluded`** | **3 548** | **0** |
| | 9 807 | **6 259** |

## Warum

Drei Dinge greifen ineinander:

1. Die Fold-Modelle haben **13 Klassen**. Verdeckung ist bei ihnen ein **eigener Sigmoid** in
   Spalte 13 (`coverage_output`), keine 14. Klasse — `predict_arrays` schneidet die Spalte ab,
   bevor es softmaxt, sonst verbögen sich alle Wahrscheinlichkeiten.
2. `occluded` kommt trotzdem als **Schwellenklasse** herein: aus dem menschlichen Ledger, aus
   Altzeilen der Zeit, als Verdeckung von Hand gemalt wurde.
3. Northcutts Gleichung 2 setzt die Schwelle einer Klasse auf die **mittlere Selbstsicherheit des
   Modells für sie**. Für eine Klasse ohne Einheit im Modell ist das null.

Eine Schwelle von 0 besteht jede Zelle. Sobald das Label der Zelle an seiner eigenen (hohen)
Schwelle scheitert, ist `occluded` der einzige verbliebene Kandidat und gewinnt die Argmax mit
Wahrscheinlichkeit 0 — ohne je eine Aussage gewesen zu sein.

Der Modulkommentar rechnete ausdrücklich mit **14c-Läufen**, wo `occluded` eine echte Klasse ist.
Bei 13+1 trägt die Annahme nicht mehr.

## Der Fix

`read_proposals` gibt die `_classes` aus der Kopfzeile jeder `model-reads.jsonl` mit zurück, und
`confident_class` entscheidet nur noch über diese. Regression: `test_audit_flags.py`,
`test_a_class_the_model_cannot_output_never_wins` — sie stellt den Fall nach (Label mit hoher
Schwelle fällt auf einer Zelle durch) und prüft die 0,0 mit.

## Verdeckung: drei Quellen, eine Zuständigkeit

| Quelle | wo | Rolle |
|---|---|---|
| **Matte** (SAM-Alpha) | `matte.jsonl` | **das Maß** — `--visible` wirft alles über `MATTE_DIRTY = 0.15` raus |
| Modell (`cov`-Sigmoid) | `model-reads.jsonl` | zweite Meinung, reist als `model_cov` an jedem Flag mit |
| Ledger-Altzeilen (`occluded` gemalt) | `corrections.jsonl` | **kein Kandidat mehr** |

Ausgerechnet die veraltete Quelle bestimmte vorher die Flags, während die gemessene nur filterte.
