# 10 — Move-Detection v2: probabilistisches Scoring, Recovery & Robustheit

**Größe:** L · **Hängt ab von:** 06 (Tracker-Produktisierung), 09 (CNN-Recovery) · **Blockiert:** —

## Ziel & Kontext

Die Pipeline (Motion-Gate → Diff vs. Base-Truth → Legal-Move-Matching → CNN-Verify) entspricht
bereits dem publizierten Stand der Technik (chesscog, LiveChess2FEN, Wang & Green 2013,
Poggi ACMR). Die Schwächen liegen nicht in der Architektur, sondern in der Bewertungslogik
und den Randfällen. Ein Review des Ist-Stands (2026-07-03) hat vier strukturelle Probleme
identifiziert:

1. **Harte Schwellen statt Wahrscheinlichkeiten.** `change_thr=16.0` ist ein absoluter
   Grauwert ohne Rausch-Baseline pro Feld. Weiße Figur auf weißem Feld → Diff unter Schwelle
   → die −1000-Endpunkt-Strafe (`tracker.py:180`) killt den korrekten Zug. Die
   Ambiguitäts-Marge (=`change_thr`) ist in Roh-Diff-Einheiten und damit beleuchtungsabhängig.
2. **CNN kann falschen Zug nicht vetoen.** Bei Identity-Mismatch gewinnt der Diff trotzdem
   (`tracker.py:682-684`); nach `verify_window=8` unentschiedenen Frames wird ohnehin
   committed. Das CNN kann nur „kein Zug" (Schatten) verhindern, nie „anderer Zug".
3. **Ohne CNN-Run gibt es Sackgassen.** Nudge (j'adoube), Promotion (alle Varianten scoren
   identisch → ewig „mehrdeutig"), subtiler Schlag (gleicher Figurtyp) → nur manueller
   Resync. Es gibt keinen Nicht-CNN-Re-Anchor-Pfad.
4. **Zwei schnelle Züge sind unrettbar.** Recovery sucht nur 1 Halbzug tief
   (`cnn_recovery.py:236-249`); zwei vermischte Züge → 4 geänderte Felder → stuck. Nach
   Recovery-Commit ist `ref_gray=None` (`tracker.py:595`) → Tracker blind bis zur nächsten
   Settle-Phase.

Referenzen (Recherche 2026-07-03):
- LiveChess2FEN: globale Max-Likelihood-Zuordnung unter Schach-Constraints statt Argmax pro
  Feld — Vorbild für Teil 1. https://github.com/davidmallasen/LiveChess2FEN
- Poggi ACMR: Engine-Prior als Tie-Break bei mehreren diff-kompatiblen legalen Zügen;
  Motion-ROI größer als das Brett. https://www.alessiopoggi.org/blog/acmr/
- Wang & Green (IVCNZ 2013): hysteretische n-Frame-Persistenz als vereinheitlichtes
  Gate/Debounce. https://ieeexplore.ieee.org/document/6727033/
- Sanin et al., Shadow-Survey (arXiv:1304.1233): bestätigt HSV+Census-Kombination —
  Schatten-Veto bleibt unverändert.

## Änderungen

### 1. Soft-Evidence-Scoring (größter Hebel, einziger echter Umbau)

**Pro-Feld-Rauschmodell.** Der Tracker führt je Feld ein laufendes Rauschmodell des Diffs
gegen die Referenz, aktualisiert **nur in stabilen, ereignislosen Phasen** (state=stable,
kein Pending, kein Stuck):

```python
@dataclass
class SquareNoise:
    # EMA von Mittelwert und Streuung des per-square-Diffs im Ruhezustand
    mean: np.ndarray   # (64,), init 0
    std: np.ndarray    # (64,), init z. B. 4.0, Floor 1.5 (nie 0)
    alpha: float = 0.05
```

(Repräsentation `(64,)`-Array vs. `dict[str, float]`: der Rest des Moduls nutzt
dict-Idiom — bei Implementierung eine Wahl treffen und konsistent halten;
Array + zentrale `square_index()`-Hilfe ist ok, aber dann durchgängig.)

`normalize_diffs` (Median-Abzug) bleibt als erster Schritt; **das EMA-Update läuft auf den
bereits median-normalisierten Diffs**, nicht auf den Roh-Diffs — sonst springen die z-Scores
bei jedem Belichtungswechsel. Danach wird jeder Diff in einen **z-Score** überführt:
`z[sq] = (diff[sq] − mean[sq]) / std[sq]`. Das Rauschmodell überlebt Commits (Referenzwechsel);
der std-Floor 1.5 ist zwingend, weil die EMA gegen eine frische Referenz (diff ≈ 0) sonst
kollabiert.

**Log-Likelihood-Score statt Straftermen.** `best_legal_move` wird ersetzt:

```python
def score_move_loglik(move_touched, z, k=1.0) -> float:
    # Für alle 64 Felder: p(geändert) = sigmoid(k * (z[sq] - z_thr))
    # touched-Felder tragen  log(p_changed[sq]) bei,
    # nicht-touched-Felder    log(1 - p_changed[sq]).
    # Kein -1000-Cutoff mehr: ein schwaches to-Feld senkt den Score,
    # eliminiert den Zug aber nicht.
```

- `z_thr` (Default 3.0) ersetzt `change_thr` als primäre Empfindlichkeit; `change_thr`
  bleibt als Fallback-CLI-Flag erhalten, wird aber deprecated markiert.
- Ambiguität: `best − second < ambiguity_margin_ll` (Log-Likelihood-Einheiten, Default 2.0,
  entspricht ~e²-Faktor) — beleuchtungsunabhängig.
- Das Schatten-Veto (HSV+Census) läuft **vor** dem Scoring wie bisher: vetoed Felder werden
  auf z=0 gesetzt statt entfernt.
- **Viabilitäts-Filter** (ersetzt die −1000-Strafe weich): ein Zug ist nur Kandidat, wenn
  BEIDE Endpunkte mindestens z ≥ z_thr/2 tragen — sonst scort ein einzelnes heißes Feld
  (Nudge!) Züge mit völlig kalten Zielfeldern netto-positiv. Weiß-auf-weiß (Ziel knapp
  unter z_thr) bleibt viabel.
- „empty changed → re-anchor" wird **verschärft**, nicht nur übersetzt: Re-Anchor nur, wenn
  (a) kein Feld z > z_thr hat UND (b) der beste Legal-Move-LL-Score unter einem Floor liegt
  (`reanchor_ll_floor`, Default −4.0 — bei k=1, z_thr=3 liegt ein komplett ruhiges Brett
  bei ≈ −6, ein schwacher echter Zug deutlich darüber). Grund: ein weißer Läufer auf
  weißem Feld hebt evtl. kein Feld über z_thr — ein voreiliger Re-Anchor backt die
  Zug-Evidenz dauerhaft in die Base-Truth ein, bevor das LL-Scoring je läuft (würde das
  erste DoD-Kriterium untergraben). Schwache, aber zugkonsistente Evidenz (z. B. z > 1.5
  auf den touched-Feldern eines Kandidaten) hält den Re-Anchor zurück und lässt den
  Confirmer weiter sammeln.

**Kalibrierung/Debug:** Die Debug-Karte in der UI zeigt zusätzlich z-Scores und das
Rauschmodell (mean/std pro Feld als Heatmap), damit Schwellen live beurteilbar sind.

### 2. Engine-Prior als Ambiguitäts-Tie-Break

Wenn nach Teil 1 `best − second < ambiguity_margin_ll`, aber beide Kandidaten hoch scoren
(kein Rauschen), wird ein **Plausibilitäts-Prior** addiert statt zu stallen:

```python
def move_prior(board, move) -> float:
    # Stufe A (immer verfügbar, kein Stockfish): kleine Heuristik-Boni in LL-Einheiten:
    #   Schlagzug +0.5, Schachgebot +0.3, Vorwärtszug > Rückwärtszug +0.2.
    # Stufe B (optional, --engine PATH): flacher Stockfish-Eval (depth 6, multipv=4);
    #   prior = 0.8 * softmax-Gewicht des Zugs unter den Top-Kandidaten.
    # UMSETZUNGSSTAND (2026-07-04): Stufe A implementiert; Stufe B bewusst VERSCHOBEN
    # (Engine-Aufruf im Hot-Path unter Lock wäre blockierend — braucht eigenes Design).
```

- Prior-Gewicht klein halten: er darf nur echte Beinahe-Gleichstände entscheiden, nie
  Bild-Evidenz überstimmen. Deshalb Deckelung: |prior| ≤ 1.0 LL.
- Bleibt es auch mit Prior mehrdeutig → bisheriges Verhalten („bitte sauber ziehen"),
  aber die UI zeigt beide Kandidaten mit Scores an.
- **Undo-Sichtbarkeit:** Ein per Prior entschiedener Zug wird in Historie/UI markiert
  (Note wie bei Recovery-Commits) — der Prior kann bei echtem Bild-Gleichstand raten
  (klassisch: zwei Bauern aufs gleiche Feld, from-Feld im Bild nicht unterscheidbar);
  der Nutzer soll sehen, dass Undo naheliegt.
- Neue CLI-Flags: `--engine` (Pfad, optional), `--no-prior`.

### 3. K-Ply-Recovery + Referenz-Handling

**2-Halbzug-Suche in der CNN-Recovery.** `derive_move_identity`/`score_moves` bekommt einen
Modus `max_plies=2`: wenn kein einzelner legaler Zug die Beobachtung erklärt, alle Zugpaare
(board.legal_moves × Antwort-legal_moves, ~1200 Kandidaten) durchsuchen — reine Auswertung,
unkritisch schnell. **Keine Order-Ambiguität:** die Reihenfolge im Paar ist durch
side-to-move fixiert (erst die Seite am Zug, dann die Antwort). Rückgabe wird
`list[chess.Move]` (1 oder 2 Züge). Beide Züge durchlaufen gemeinsam den
`_recovery_confirmer`, Commit erfolgt atomar (beide oder keiner) in Historien-Reihenfolge.

- Agreement-/Margin-Kriterien wie in Spec 09 (margin in **Feldern**); für Zugpaare gilt
  dieselbe Schwelle gegen den besten Einzelzug UND das beste andere Paar.
- Occupancy-only-Modus: Zugpaare, die auf Occupancy-Ebene identisch sind (z. B. Nf3/Ng3
  Varianten), ⇒ None wie bisher — keine Rätselraten.

**Referenz nach Recovery nicht verwerfen.** `tracker.py:595` (`ref_gray = None`) wird
ersetzt: die Referenz wird sofort aus dem aktuellen `cur`-Buffer gesetzt (der Frame, auf dem
die Recovery entschieden hat, ist per FEN-Revalidierung (`tracker.py:556`) nachweislich
noch stellungsaktuell). Fällt der Buffer weg (Motion), gilt das bisherige Verhalten.

### 4. Nicht-CNN-Re-Anchor für erklärbare Störungen (Nudge/Drift)

Neuer Pfad in `_try_detect`, greift wenn **kein** CNN-Run konfiguriert ist (mit CNN bleibt
die bestehende Recovery zuständig):

- Bedingung: 1–4 Felder persistent über z_thr (4 statt 2 seit Clip-Replay: eine
  zurückweichende Hand kontaminiert die Commit-Referenz auf bis zu 4 Nachbarfeldern),
  seit ≥ `nudge_timeout_s` (Default 5.0)
  unverändert stuck, UND kein VIABLER Zug mit netto-positiver LL (der Viabilitäts-Filter
  aus Teil 1 übernimmt die Rolle des separaten `nudge_ll_floor`),
  UND das Diff-Muster ist „belegungs-neutral
  plausibel" (Feld war laut Spielzustand belegt — eine verrückte Figur ändert Aussehen,
  nicht Belegung; ein leeres Feld, das sich ändert, ist dagegen verdächtig → kein Re-Anchor).
- Aktion: Referenz auf diesen Feldern nachziehen (nur die betroffenen Zellen in `ref_gray`
  patchen, nicht die ganze Referenz), Log-Warnung + UI-Hinweis „Referenz nachgezogen
  (Feld e4): Figur verrückt oder Licht gedriftet".
- Dasselbe Zellen-Patching wird auch für langsamen **räumlichen Lichtdrift** genutzt: Felder,
  deren z langsam (über ≥ `drift_window_s`, Default 30 s) und monoton gewachsen ist, ohne je
  einen Zugkandidaten zu stützen, werden ebenso nachgezogen. **Abweichend vom Nudge-Pfad
  gilt hier KEIN Belegungs-Check** — Lichtdrift trifft gerade leere Felder; der Schutz gegen
  den „stillen Fehlzug" ist dort die Monotonie-über-30-s-Bedingung, nicht die Belegung.
  (Nudge-Pfad: nur belegte Felder. Drift-Pfad: alle Felder.) Der EMA-`SquareNoise` aus
  Teil 1 absorbiert den Rest.

### 5. CNN-Verify: Gegenkandidat statt „Diff gewinnt immer"

`_verify_tick` wird erweitert: Bei Identity-Mismatch (heute Regel 3, `tracker.py:682-684`)
schlägt das CNN aktiv einen Alternativzug vor:

- `verify_move_identity` wird gegen **alle** Legal-Move-Kandidaten mit LL-Score innerhalb
  `ambiguity_margin_ll` vom besten gescort, nicht nur gegen den Diff-Sieger.
- Gewinnt ein anderer Kandidat mit agreement ≥ `min_agreement` UND ≥ margin_squares
  Vorsprung → dieser wird committed (Log: „CNN hat Diff-Kandidat überstimmt: e2e4 → d2d4").
- Sonst wie bisher: bei ≥2 konfidenten touched-Feldern gewinnt der Diff mit Warnung;
  Timeout-Verhalten (`verify_window`) unverändert.
- **Promotion:** die Kandidatenliste enthält alle Promotion-Varianten; das CNN entscheidet
  über das Ziel-Feld-Label. Ohne CNN: UI-Dialog „Umwandlung in? (Q/R/B/N)" statt
  Dauer-Ambiguität — der Diff-Pfad committet den Zug mit der Nutzer-Antwort.

### 6. Kleinere Härtungen

- **Motion-ROI über den Brettrand hinaus:** Motion-Gate zusätzlich auf einem um
  `motion_margin` (Default 12 % der Brettkante) erweiterten Warp-Ausschnitt rechnen; Hände
  werden erfasst, bevor sie Felder verdecken. (Poggi)
- **`min_confident` aufsplitten:** heute gate't derselbe Wert (8) sowohl
  `board_matches_identity` (periodische Kontrolle/Re-Anchor) als auch
  `derive_move_identity`/`score_moves` (Recovery). Zwei getrennte Parameter:
  `min_confident_board` = 32 (verhindert Re-Anchor gegen ein großteils verdecktes Brett,
  `cnn_recovery.py:217-222`) und `min_confident_recovery` = 8 (Recovery muss gerade bei
  Teilverdeckung handlungsfähig bleiben). Beide werden CLI-Flags.
- **Census ohne Wrap-around:** `np.roll` (`tracker.py:85`) durch gepaddete Verschiebung
  ersetzen (`cv2.copyMakeBorder` REPLICATE); betrifft Reihe 1/8-Ränder.
- **Crop-Überhang im Tracker:** per-square-Diff-Zellen Richtung hintere Reihe um den
  `crop`-Parameter des Kalibrierprofils erweitern (wie Labeling-Pipeline) — lehnende Figuren
  erzeugen sonst unexplained-Diffs auf Nachbarfeldern. Erweiterte Zellen überlappen; das ist
  ok, weil das LL-Scoring (Teil 1) weiche Evidenz verträgt.
- **CLI-Exposition:** `verify_window`, `min_agreement`, `margin_squares`, `min_confident`,
  `cnn_cooldown_s`, `cnn_check_interval_s`, `z_thr`, `ambiguity_margin_ll`,
  `nudge_timeout_s` als `chesslab track`-Flags mit Defaults in `config.py` — keine
  Magic Numbers mehr in `tracker.py`/`cnn_recovery.py`.
- **Dead Code:** `(bs, p) if False else (p, bs)` (`tracker.py:903`) entfernen.

## Reihenfolge & Abgrenzung

Implementieren in Stufen, jede einzeln testbar:

1. Teil 1 (Rauschmodell + LL-Scoring) — Umbau von `per_square_diff`-Konsum,
   `best_legal_move`, Gates in `_try_detect`.
2. Teil 3 (K-Ply + Referenz-Fix) — lokal in `cnn_recovery.py` + `_cnn_tick`.
3. Teil 4 (Nudge-Re-Anchor) — neuer Pfad in `_try_detect`.
4. Teil 5 (CNN-Gegenkandidat + Promotion-Dialog) — `_verify_tick` + UI.
5. Teil 2 (Engine-Prior) — additiv, kann zuletzt.
6. Teil 6 — verteilt, jederzeit einschiebbar; Census/Dead-Code sofort möglich.

**Nicht in dieser Spec:** Schatten-Veto-Änderungen (bestätigt stabil), YOLO/Detection-Ansätze
(zu teuer für Edge-Ziel, siehe Mobile-Tracker-Richtung), Full-Board-CNN-Umbau.

## Definition of Done

- [ ] Weiß-auf-weiß-Zug (schwaches to-Feld) wird erkannt statt „no_legal_move" (Testclip
      oder synthetischer Frame-Test).
- [ ] Zwei Bauern aufs gleiche Feld: Tracker entscheidet per Prior oder zeigt beide
      Kandidaten, stallt nicht stumm.
- [ ] Zwei schnelle Züge (Antwort vor Commit): Recovery committet beide atomar in richtiger
      Reihenfolge; Referenz danach nicht None.
- [ ] Nudge ohne CNN-Run: Referenz wird nach `nudge_timeout_s` gepatcht, Tracker läuft
      weiter; leeres Feld mit Änderung wird NICHT gepatcht.
- [ ] CNN kann einen falschen Diff-Kandidaten durch einen besseren Legal-Move-Kandidaten
      ersetzen (Unit-Test mit gemockter Observation).
- [ ] Promotion ohne CNN endet in UI-Dialog, nicht in Dauer-Ambiguität.
- [ ] Alle in Teil 6 genannten Parameter via CLI setzbar; Defaults in `config.py`.
- [ ] `pytest`-Suite: Rauschmodell (EMA-Update nur in Ruhe), LL-Scorer (Schlag, Rochade,
      en passant, Promotion-Varianten), 2-Ply-Suche, Zellen-Patch-Re-Anchor.
- [ ] Live-Smoke: eine echte Partie (≥ 20 Halbzüge) mit Handy-Feed ohne manuellen Resync.
