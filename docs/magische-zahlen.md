# Die abgestimmten Zahlen und ihre Herkunft (Stand 2026-09-19)

Anlass: mit `taintIdentityThr` reitet die dritte Zahl auf einem eigenen Weg ins Geraet, und man
sieht keiner an, wie sie zustande kam. Diese Datei zaehlt sie auf und nennt, was eine ordentliche
Messung je Zahl kosten wuerde — **fuer den Release-Kandidaten, nicht fuer jetzt.**

## Das eigentliche Problem: Herkunft ist unsichtbar

Eine gemessene Zahl und eine geratene sehen im Code gleich aus. Das schaerfste Beispiel steht in
den sieben ausgelieferten Modellen:

| Modell | `coverage_gate` | `temperature` | `prior_lambda` |
|---|---|---|---|
| `p4-128` | 0,0500 | 1,7551 | 7,0204 |
| `p4-80` | 0,0500 | 1,6684 | 6,6736 |
| `p4a-128` | 0,3500 | 1,5285 | 6,1140 |
| `p4a-80` | 0,1500 | 1,5963 | 6,3852 |
| `p4a-80-clahe` (Champ) | 0,2500 | 1,4950 | 5,9800 |
| `p4afull-128` | 0,3500 | 1,2603 | 5,0412 |
| `p4full-128` | 0,0500 | 1,7202 | 6,8808 |

`coverage_gate` ist **gemessen** (104 337 Lesungen gegen die SAM-Matte, lambda 3).
`temperature` ist **gefittet** (auf val, Guo 2017). `prior_lambda` ist **keins von beidem**: es
ist exakt `4,0 x temperature` in allen sieben Zeilen, ein Migrationswert, der das Verhalten beim
Umbau gleich halten sollte. Sieben verschiedene Nachkommastellen, die wie eine Messreihe
aussehen und keine sind. Genau das ist gemeint, wenn die Zahlen „Ausmasse annehmen".

## Der Bestand

`TrackerConfig` hat 63 Felder, davon 52 Zahlen:

| Klasse | Anzahl | heisst |
|---|---|---|
| NOTIERT | 15 | eine Herkunftsnotiz steht am Feld |
| PLATZHALTER | 1 | die Notiz nennt sich selbst ungemessen (`desyncStandoffObsN = 12`) |
| STRUCTURAL | 5 | keine Schwelle, sondern Groesse oder Schalter |
| **UNGEPRUEFT** | **31** | gar keine Herkunft notiert |

Die vollstaendige Liste steht in `android/config/tuned-constants.txt`, abgeleitet statt gepflegt
(`uv run python android/scripts/tuned_constants.py`). Was die Notiz WERT ist, entscheidet die
Liste bewusst nicht — das kann kein Regex, und eine Klasse „MEASURED", die aus Kommentartext
raet, waere genau der Fehler, den diese Datei beschreibt.

Darunter sind Zahlen, die das Verhalten offensichtlich tragen: `zThr = 3.0`, `censusThr = 40.0`,
`maxChanged = 6`, `cnnMinAgreement = 0.97`, `minConfidentBoard = 32`, `recoveryMaxPlies = 4`.

## Die Alternative, die jetzt nichts kostet

Nicht messen, sondern **die Herkunft zur Pflicht machen, nicht zur Hoeflichkeit**. Die Ratsche
`tests/test_tuned_constants.py` haelt `UNGEPRUEFT` bei 31 und laesst die Zahl nur sinken. Eine
NEUE Zahl kommt damit entweder mit ihrer Messung oder mit einem Satz, warum sie geraten ist —
und der Rueckstand wird nicht groesser, waehrend die Forschung weiterlaeuft. Dasselbe Muster wie
`route-coverage.txt`, `jsonl-readers.txt` und das Kommentarbudget. Der Test traegt eine
eingepflanzte Gegenprobe.

Was er NICHT tut: er erzwingt keine Messung und faellt bei keiner bestehenden Zahl an. Er
verhindert nur das Weiterwachsen.

## Was der Release-Kandidat nachzuholen haette

Nach Hebelwirkung geordnet, mit ehrlicher Kostenschaetzung:

| Zahl | Stand | Messung | Kosten |
|---|---|---|---|
| `prior_lambda` | Migration `4,0 x T`, kein Optimum | Kurve je Modell am Regressionssatz | 7 x ~50 min |
| `cnnConfThr = 0.85` | Kante, kein Entwurf; vor `calibratedConfThr` gesetzt | Kurve je Modell | 6 x ~50 min (fuer `clahe` liegt sie) |
| `taintIdentityThr = 0.5` | Zwei-Punkt-Befund (0,5 gegen 0,7) | Kurve 0,3–0,7, und auf mehr als einem Modell | ~5 x 50 min |
| `zThr`, `censusThr`, `maxChanged` | ungeprueft, tragen den Frame-Diff | Empfindlichkeit am Regressionssatz | je ~50 min |
| `desyncStandoffObsN = 12` | erklaerter Platzhalter | am Verlust-Verhalten | offen |

Rund 20–25 Regressionslaeufe zu je etwa einer Stunde, ein Job zur Zeit. Das ist RC-Arbeit, keine
Forschungsarbeit — die Aufzaehlung existiert, damit sie zu dem Zeitpunkt nicht neu gesucht
werden muss.

## Die Naht, die dabei zuerst zu schliessen waere

`taintIdentityThr` steht in der Engine auf 0 und in der App auf 0,5. Das schuetzt die sieben
Python-Paritaetstests, heisst aber: der Wert, der aufs Geraet geht, wird von keinem Test
gefahren. Entweder die Paritaetstests ziehen nach, oder die App-Belegung bekommt einen eigenen
Test — sonst ist die einzige Absicherung der Regressionssatz, der mit dem Engine-Default faehrt.
