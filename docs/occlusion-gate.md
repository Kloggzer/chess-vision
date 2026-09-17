# Die Verdeckungsschwelle folgt aus der Modellgüte (2026-08-24)

`P_OCCLUDED_THR` stand auf 0,5 und war eine Konstante der Engine. Beides ist falsch: die Schwelle
gehört zum Modell, und 0,5 lässt Reads durch, die zu 84 % lügen.

## Warum es ein Gate braucht

Verdeckte Felder werden nicht verschwiegen, sie werden erfunden. Gegen die SAM-Matten über
470 000 Feld-Reads, Modell `comp13-occ-bn-lr1e2-bs512`:

| echte Verdeckung | Figuren richtig | mittlere Konfidenz |
|---|---|---|
| 0,00–0,05 | 66,5 % | 0,963 |
| 0,30–0,45 | 28,4 % | 0,686 |
| > 0,60 | **2,4 %** | 0,765 |

Bei über 60 % Verdeckung ist fast jede Aussage falsch, und ein Viertel davon kommt mit
Konfidenz ≥ 0,85. Ohne Gate zählt das als Evidenz (User, 2026-08-24: *„sonst ist ja jede
confidente Entscheidung wenn die Hand im Bild ist einfach falsch"*).

## Warum sie nicht in die Engine gehört

Die Regel ist die übliche Form unter asymmetrischem Verlust: ein Read lohnt, wenn
`p(richtig) ≥ λ/(1+λ)`, mit λ als Preis einer Erfindung gegen den Nutzen eines Treffers. Was
dabei herauskommt, hängt am Modell. **Der Projektwert ist λ = 3 (Nutzer, 2026-09-14), nicht die
2, unter der die drei Läufe hier gemessen wurden** — die Tabelle bleibt als Herleitung der Regel
stehen, die ausgelieferten Schwellen stehen weiter unten. Wilson-Untergrenze, zusammengefasste
Bänder:

| Modell | 0,00–0,02 | 0,02–0,15 | 0,15–0,25 | τ bei λ=2 |
|---|---|---|---|---|
| `comp13-occ-bn-lr1e2-bs512` | 68,1 % | 49,3 % | 26,4 % | **0,02** |
| `real13-ms-s2-bn80-bs256-swa1e4` | 80,7 % | 73,9 % | 63,4 % | **0,15** |
| `real13-ms-s3-hn4-bn80` | 80,6 % | 76,7 % | 64,9 % | **0,15** |

Die drei Bänder von hn4 im Übergang (77,0 / 77,3 / 75,7 %) fallen gleichmäßig; swa1e4 bricht bei
0,02–0,05 auf 70,2 % ein und erholt sich wieder, was Stichprobenrauschen ist. Beide landen bei
λ = 2 auf 0,15, hn4 aber mit mehr Luft.

Faktor 7 zwischen comp13 und den real13-Läufen. Eine gemeinsame Konstante kann für beide nicht
stimmen, deshalb bringt jedes Modell seine als `coverage_gate` in der `config.json` mit;
`ModelSpec` liest sie, `TrackerService` legt sie auf `TrackerConfig.pOccludedThr`. Fehlt der
Schlüssel, gilt der alte Default.

`build_model_card` führt das Feld seit 2026-08-24, schreibt es aber **nur, wenn ein Wert übergeben
wird** — ohne Messung bleibt es weg, damit kein Default als gemessener Wert durchgeht.
`scripts/stage_model_asset.py --gate` bleibt der Weg, einen gemessenen Wert zu stempeln.

λ = 3 verlangt 75 % und ist mit comp13 nicht zu haben (bestes Band 68,1 %); die real13-Läufe
schaffen es bei τ = 0,02. λ = 5 erreicht keines.

**Das Zumachen kostet fast nichts:** von 0,5 auf 0,15 bleiben 90 % aller Reads. Verloren gehen
genau die, die ohnehin falsch waren.

## Was ausgeliefert wird

**Stand 2026-09-14: die APK buendelt SIEBEN `p4*`-Modelle, und jedes traegt jetzt ein gemessenes
`coverage_gate`.** (`p4a-96` ist an dem Tag raus — zu wenig Tempo, zu wenig Qualitaet.) Bis dahin
erbten alle den Alt-Default 0,5, genau die Konstante, die dieses Dokument oben verwirft;
`ModelSpecTest` stand deshalb rot und ist es seit der Messung nicht mehr.

Gemessen auf den **12 Aufnahmen, die alle sieben herausgehalten haben**, 104 337 Figuren-Reads
gegen die SAM-Matte, Wilson-Untergrenze. (Die 104 337 sind ohne Inferenzlauf nicht
nachrechenbar und stehen unveraendert. **Gegengeprueft 2026-09-17**: die APK buendelt weiter
genau sieben `p4*`-Verzeichnisse, und jedes `config.json` traegt das hier entschiedene
`coverage_gate` — 0,35 / 0,35 / 0,25 / 0,15 / 0,05 / 0,05 / 0,05 in der Reihenfolge der Tabelle.
Die Tabelle und die Artefakte stimmen also noch ueberein.)

**λ = 3, nicht 2 (Nutzer, 2026-09-14: „das wichtigste ist keine phantome zu haben").** λ ist eine
ENTSCHEIDUNG, keine Messung: es sagt, was eine Erfindung gegen einen Treffer kostet. Die
stehende Regel des Projekts ist, dass Phantome disqualifizieren und Misses verrechenbar sind, und
λ = 3 (ein Read muss 75 % halten) bildet genau das ab. Es kostet gegenueber λ = 2 rund **einen
Prozentpunkt der Reads** und wirft dafuer die knappen Baender raus.

| Modell | τ (λ=3) | 0,00–0,02 | 0,15–0,25 | 0,25–0,35 | 0,50–0,70 | Reads bleiben |
|---|---|---|---|---|---|---|
| `p4a-128` | **0,35** | 96,9 % | 84,6 % | 80,2 % | 42,2 % | 85 % |
| `p4afull-128` | **0,35** | 95,5 % | 84,9 % | 77,7 % | 47,8 % | 85 % |
| `p4a-80-clahe` (Default) | **0,25** | 94,1 % | 79,2 % | 72,2 % | 29,5 % | 84 % |
| `p4a-80` | **0,15** | 93,5 % | 68,2 % | 55,9 % | 18,3 % | 84 % |
| `p4-128` | **0,05** | 97,5 % | 61,4 % | 44,5 % | 22,8 % | 84 % |
| `p4-80` | **0,05** | 94,2 % | 57,2 % | 46,7 % | 21,7 % | 84 % |
| `p4full-128` | **0,05** | 97,8 % | 64,8 % | 53,7 % | 24,9 % | 84 % |

(Die Prozente sind die Punktwerte; entschieden hat jeweils die Untergrenze. τ ist die OBERE Kante
des letzten angenommenen Bandes — `p4a-80-clahe` mit 0,25 nimmt also 0,15–0,25 bei 76,6 %
Untergrenze noch mit und verwirft 0,25–0,35 bei 69,3 %.)

**Was λ = 2 anders entschieden haette:** `p4a-80-clahe` 0,35, `p4-128` 0,10, `p4full-128` 0,15 —
die uebrigen vier gleich. Die drei Unterschiede sind genau die Baender, die zwischen 67 % und
75 % liegen, und `p4afull-128` haelt seine 0,35 bei λ = 3 mit 75,1 % Untergrenze nur knapp.

**Die `a`-Familie traegt die Spreizung.** `p4a-80-clahe` haelt bei 0,15–0,25 noch 79,2 %, wo
`p4-80` auf 57,2 % faellt — Faktor 7 zwischen dem strengsten und dem lockersten Gate, dieselbe
Spreizung wie zwischen comp13 und den real13-Laeufen oben. Eine gemeinsame Konstante kann fuer
beide Enden nicht stimmen.

**Am Regressionssatz gemessen: kein Unterschied (2026-09-14).** 0,5 gegen 0,25 ergibt
Aufnahme fuer Aufnahme 385 / 14 / 1 / 167 und 6 Alarme. Das Gate wirkt dabei nachweislich — es
maskiert **17 % mehr Zellen** (184 827 -> 216 231 ueber 41 136 Beobachtungen) —, nur war keine
davon fuer einen Commit entscheidend. Der Satz enthaelt den Fall nicht, gegen den das Gate
schuetzt. Details und warum `set:pOccludedThr=` dafuer nicht taugt:
`docs/regression-reference.md`.

**Und 0,5 war fuer JEDES der sieben zu lasch.** Im Band 0,50–0,70, das der Alt-Default als Evidenz
durchliess, liegt selbst der beste bei 47,8 % und der Default bei 29,5 %.

Die vier Modelle mit aelterem Gate (`real14-80` ohne, die beiden `real13-ms-*` je 0,15,
`comp13-occ-bn-lr1e2-bs512` 0,02) sind seit 2026-08-30 NICHT mehr im APK. Ihre Zahlen oben bleiben
gueltig als Herleitung der Regel, nicht als Aussage ueber das, was ausgeliefert wird.

**Der Weg, es zu wiederholen** — und die Falle, die dabei auffiel: `trained_on` las nur das
Datensatz-Verzeichnis, und `real13-mix-v4` ist nicht mehr auf der Platte. Die Zirkularitaetssperre
fand dann keine Treffer und meldete JEDE Aufnahme als herausgehalten; ohne den Fix waeren drei
Modelle auf ihren eigenen Trainingsdaten gemessen worden. Seit 2026-09-14 gilt der im Lauf
eingefrorene `config.json["split"]` vor dem Verzeichnis, und ist keines lesbar, verweigert die
Sperre.

    uv run chesslab realgames model-read <session> --model <asset-dir> --out model-reads.gate-<m>.jsonl
    uv run python scripts/occlusion_gate.py model-reads.gate-<m>.jsonl <die 12 Sessions>
    uv run python scripts/stage_model_asset.py --stamp <asset-dir> --gate <tau>

`--out` ist Pflicht: `model-reads.jsonl` ist tragend (Labeling-Lane, `audit_flags`, Chain-Steps,
Provenance), sieben Laeufe haetten es sieben Mal ueberschrieben.

Die Liste steht in `BUNDLED_MODELS` und ist HANDGEPFLEGT — zwei Tests prüfen je Eintrag Graph-Form und Crop-Größe,
also erzwingt sie, dass jemand die Form eines neuen Modells hinschreibt. Wer ein Modell nur nach
`assets/cnn_model/` legt, findet es im Picker nicht wieder, und `bundledModelOrDefault` setzt einen
von Hand gesetzten Namen still auf den Default zurück.

`scripts/stage_model_asset.py` legt ein Modell ab und ergänzt dabei `coverage_output` und
`coverage_gate` — `chesslab export` schreibt beides nicht, und ein 14-spaltiger Graph ohne
`coverage_output` würde als 14 Klassen gesoftmaxt.

## Warum die Wahl von τ im Mittelfeld kaum etwas ändert

Die Verdeckung ist zweigipflig verteilt, gemessen über `real13-straight-80-v3` (424 519 Zellen):

| Coverage | Zellen | Anteil |
|---|---|---|
| exakt 0,0 | 376 347 | **88,7 %** |
| 0,001–0,02 | 2 652 | 0,6 % |
| 0,02–0,25 | 9 657 | **2,3 %** |
| 0,25–0,75 | 12 739 | 3,0 % |
| 0,75–1,00 | 22 602 | **5,3 %** |

Eine Hand ist viel größer als ein Feld: ein Feld liegt entweder unter ihr oder daneben, teilweise
verdeckt sind nur die Felder am Silhouettenrand. Deshalb liegen zwischen 0,02 und 0,25 — dem
Bereich, in dem τ überhaupt entscheidet — nur 2,3 % aller Zellen.

**Die Gate-Entscheidung ist praktisch binär:** nimmt man die 8,3 % stark verdeckten Zellen an oder
nicht? Bei 42 % Genauigkeit lautet die Antwort nein, für jedes λ ≥ 1. Ob τ dann auf 0,02, 0,15 oder
0,25 steht, verschiebt ein paar tausend Zellen. Der Schaden entsteht allein dadurch, dass der alte
Default von 0,5 den ganzen 0,25+-Block durchlässt.

Aus demselben Grund lohnt es nicht, die Trainingsmaske zu verschieben: `--visible-max 0.2` statt
0,15 fügt dem Training 1 086 Zellen hinzu — 0,37 %. Ein Von-Grund-auf-Vergleich könnte den Effekt
nicht von der Seed-Streuung trennen.

## Fallen bei der Messung

- **Nicht der Punktwert, die Untergrenze.** Ein Band mit 121 Reads kippte λ = 2 von 0,15 auf 0,02,
  bis die dünnen Bänder zusammengefasst waren. Genauigkeit fällt nicht ab und erholt sich dann.
- **Nur der zusammenhängende Lauf ab 0 zählt.** Ein gutes Band hinter einem durchgefallenen rettet
  nichts — die erste Fassung von `scripts/occlusion_gate.py` hatte hier einen Fehler und meldete
  0,10 statt 0,02.
- **Die vorhergesagte Coverage ist gut kalibriert.** Echte Verdeckung < 5 % → Vorhersage Median
  0,001; > 45 % → Median 0,838. Das Gate darf sich also auf sie stützen.
- **Der Coverage-Kopf über-meldet nicht.** Vetos über 12 Feldern sahen nach Fehlern aus, aber aus
  11 306 gematteten Frames deckt eine echte Hand im Median 3 Felder und im p90 **23**, maximal 41.
  Eine Ausdehnungsgrenze würde echte Hände wegwerfen.

## Reproduktion

    uv run chesslab realgames model-read <session> --model <run-dir>
    uv run python scripts/occlusion_gate.py <reads-datei>
    uv run python scripts/stage_model_asset.py <run-dir> --gate <tau>

Zulässig sind nur Sessions, auf denen das Modell nicht trainiert hat. Für die real13-Läufe sind
das `2026-08-08-00-39-57` und `2026-08-08-11-55-19` — der Split von `real13-straight-80-v3` ist
session-getrennt.

## Kopf gegen Spezialist, gegen dieselbe Matte (2026-08-26)

Die Frage kam auf, den Coverage-Kopf aus dem Figurenmodell zu ziehen und den destillierten
Hand-Schüler (`hand_gate.py`) an seine Stelle zu setzen. Gemessen auf 16 000 Zellen aus
`rg-2026-08-16-20-41-33` — Val des Figurenmodells UND Holdout in der Karte des Schülers, also
beiden ungesehen. Wahrheit ist SAM 3s Matte, `scripts/coverage_arms.py`.

| bei τ = 0,15 | Precision | Recall | F1 | MAE gesamt | MAE auf verdeckten |
|---|---|---|---|---|---|
| CNN-Kopf `c8d1-seed43` | **0,958** | 0,959 | **0,958** | **0,0099** | 0,091 |
| Hand-Schüler `mnv4-640` | 0,520 | **0,988** | 0,682 | 0,0453 | 0,065 |

Der Schüler ist ein **Recall-Sieb**, und das ist kein Mangel: er wurde für den Ingest gebaut, wo
eine verpasste Hand 64 Labels verdirbt und ein Fehlalarm ein Frame kostet. Sein bestes F1 über
alle Schwellen ist 0,765 (bei 0,50) und bleibt damit weit unter dem Kopf. Als Präzisionsinstrument
auf dem Gerät ist er die schlechtere Wahl — zusätzlich zu einem eigenen Vorwärtslauf je Brett.

**Wo die wahrgenommene Unschärfe herkommt: comp13 an seinem eigenen Gate.**

| Modell | bei 0,02 | bei 0,10 | bei 0,15 | MAE gesamt | MAE auf verdeckten |
|---|---|---|---|---|---|
| `comp13-occ-bn-lr1e2-bs512` (Gate 0,02) | **0,682** | 0,956 | 0,972 | 0,0161 | **0,158** |
| `real13-ms-s2-bn80-bs256-swa1e4` (Gate 0,15) | 0,894 | 0,940 | 0,956 | 0,0079 | 0,078 |

(Precision gegen die Matte.) An seinem ausgelieferten Arbeitspunkt ist jede dritte Meldung von
comp13 auf einer real klaren Zelle. Das widerspricht der λ-Herleitung oben nicht — die fragt, ob
ein Read über τ noch zu glauben ist, nicht wie viele klare Zellen τ wegwirft. Beides zusammen
heißt: comp13s Kopf ist auf echten Brettern doppelt so schlecht kalibriert wie die real13-Läufe
(MAE auf verdeckten 0,158 gegen 0,078), was zu seinem Trainingsmaterial passt.

**Folgerung:** den Kopf behalten, den Schüler im Ingest lassen, comp13 als Verdeckungsquelle
ablösen. Offen bleibt der Vergleich, den `docs/class-scheme.md` benennt: der modellfreie
`gridOccluded`-Arm ist gegen keinen der beiden gemessen.

    uv run python scripts/coverage_arms.py --run data/models/<lauf> [--no-gate]
