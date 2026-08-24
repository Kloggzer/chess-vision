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
dabei herauskommt, hängt am Modell — gemessen bei λ = 2, Wilson-Untergrenze, zusammengefasste
Bänder:

| Modell | 0,00–0,02 | 0,02–0,15 | 0,15–0,25 | τ bei λ=2 |
|---|---|---|---|---|
| `comp13-occ-bn-lr1e2-bs512` | 68,1 % | 49,3 % | 26,4 % | **0,02** |
| `real13-ms-s2-bn80-bs256-swa1e4` | 80,7 % | 73,9 % | 63,4 % | **0,15** |
| `real13-ms-s3-hn4-bn80` | 80,6 % | 76,7 % | 64,9 % | **0,15** |

Faktor 7 zwischen comp13 und den real13-Läufen. Eine gemeinsame Konstante kann für beide nicht
stimmen, deshalb bringt jedes Modell seine als `coverage_gate` in der `config.json` mit;
`ModelSpec` liest sie, `TrackerService` legt sie auf `TrackerConfig.pOccludedThr`. Fehlt der
Schlüssel, gilt der alte Default.

λ = 3 verlangt 75 % und ist mit comp13 nicht zu haben (bestes Band 68,1 %); die real13-Läufe
schaffen es bei τ = 0,02. λ = 5 erreicht keines.

**Das Zumachen kostet fast nichts:** von 0,5 auf 0,15 bleiben 90 % aller Reads. Verloren gehen
genau die, die ohnehin falsch waren.

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
