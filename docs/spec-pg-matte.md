> **VERWORFEN am 2026-09-16.** Der Nutzer hat die Migration nach laengerem Nachdenken abgesagt:
> der JSON-Weg traegt, und die Fehler zu beheben ist mehr wert. Diese Spec bleibt geparkt, weil
> sie zwei Dinge enthaelt, die unabhaengig von der Datenbank gelten: die vollstaendige Liste der
> neun Schreiber von `matte.jsonl` (Abschnitt 3) und den Widerspruch zwischen Python und
> TypeScript bei "Messung, dann Absage". Der Grund der Absage steht in
> `docs/offene-entscheidungen.md`, Punkt 27.

# Spec: erste vertikale Naht der Postgres-Migration — Familie `matte`

Stand 2026-09-16, dritte Fassung. Entscheidung: `docs/offene-entscheidungen.md`, Punkt 27.
Schema: `db/schema/001_measurements.sql`, `002_roles.sql`; Vertrag `tests/test_db_contract.py`;
Ablage `compose.yaml` (Bind-Mount `./data/pgdata`, committet als `0fc289ec`).
Jeder Punkt ist so gemeint, dass er ohne Rueckfrage gebaut und nachgeprueft werden kann; wo eine
Wahl getroffen wird, steht der Grund. Nicht Entscheidbares steht in Abschnitt 12.

---

## 0. Richtung und Zuschnitt

**Postgres ist die EINZIGE Wahrheit fuer `matte`. `matte.jsonl` wird abgeschafft.** Nutzer,
2026-09-16: "das matte.jsonl will ich ja gerade abschaffen, deswegen gibts ja erst pg." Kein
Doppelschreiben, kein Rueckfall auf die Datei. Die neun Schreiber (Abschnitt 3) schreiben nur
noch in die DB; `src/chesslab/` und `platform/app/` LESEN in dieser Naht aus der DB.

**"Ordner kopieren und es klappt" bleibt**, weil die Daten in `data/pgdata` liegen. Zwei
Auflagen (Abschnitt 9): zum Kopieren ist der Container GESTOPPT, und ein Datenverzeichnis ist
an seine PG-Hauptversion (17) gebunden.

**`scripts/` bleiben unveraendert** und lesen einen EINSEITIG erzeugten Bericht
`chesslab db export-matte` (Abschnitt 7). Das ist kein Doppelschreiben: nichts liest die Datei
je als Wahrheit zurueck, und eine Ratsche (8.4) haelt das.

Zuschnitt: nur `matte` plus die `recording`/`frame`-Zeilen, die der Fremdschluessel braucht.
Nicht `model-reads`, nicht `log`, nicht die Urteile.

Gemessene Fakten (nicht neu messen): 25 Aufnahmen, 11 647 Frames, 9 423 Matte-Zeilen, null
Abweisungen; **1 657 Zeilen (17,6 %) ueberholt** — gleicher Frame, gleiche Quelle, mehrfach;
null Absagen (`skipped`) im Korpus; drei Zustaende vom Schema erzwungen.

---

## 1. Der eine Vertrag: was "der Zustand dieses Frames" ist

1.1 **Schluessel.** `recording.name` = Verzeichnisname unter `data/recordings/` (= `name` der
Web-App). `matte.stem` = nackter Stem (`000123`), beim Import `Path(str(row["frame"])).stem`.
`matte.source` = `row.get("source") or "sam"`; Werte `sam`, `temporal`, `upsert`, Altwert
`merged`.

1.2 **Je `(recording, stem, source)` gilt der LETZTE Schreibvorgang** — das ist der
Primaerschluessel, ein Upsert ersetzt die Zeile ganz. Ein spaeteres `skipped` ersetzt damit eine
fruehere Messung DERSELBEN Quelle (`matte_state` verbietet beides zugleich).

1.3 **Je Stem gewinnt ueber die Quellen hinweg** die Zeile mit dem kleinsten Rang (Befund 3:
`labeling.read_matte` liess bisher eine Absage nie ueber eine Messung gewinnen, `lib/matte.ts`
liess jede Zeile gewinnen — zwei Antworten auf eine Frage; heute latent, weil der Korpus null
Absagen traegt). Der Rang steht in der Sicht `matte_current` (2.1) und kodiert, was
`prune_dead_rows` und die Anhaenge-Ordnung des `temporal-pass` bisher erzeugt haben:

| Rang | Zeile | Grund |
|---|---|---|
| 0 | `sam` mit `coverage`, mindestens ein Feld > 0 | SAM fand eine Hand — `upsert` existiert nur, WEIL SAM nichts fand, und `prune` loescht ihn dann |
| 1 | `upsert` | ersetzt SAMs leeren Schnitt ganz (Bewegungsunschaerfe) |
| 2 | `sam` mit `coverage`, ueberall 0 | gemessen und frei; schlaegt `temporal`, weil `prune` `temporal` loescht, sobald SAM geschnitten hat, "auch leer" |
| 3 | `temporal` | SAM hat diesen Frame nie geschnitten |
| 4 | jede andere Quelle mit `coverage` | `merged` (Altwert) |
| 9 | jede Zeile mit `skipped` | **eine Absage verliert gegen jede Messung** — SAMs Absage ist "nicht gemessen", und wer gemessen hat, hat ein Alpha auf der Platte |

Innerhalb eines Rangs gibt es je Stem nur eine Zeile (eine je Quelle). Nach `prune` koexistieren
nur noch `sam`+`upsert` (Rang 2/1) und `sam`-Absage+`temporal` (9/3); die Tabelle deckt auch die
Zwischenzustaende des Passes.

1.4 **Drei Zustaende, nie vier.** Keine Zeile in `matte_current` = nicht gemessen; `skipped` =
Absage; `coverage` = gemessen, darf 64 Nullen sein. Jeder Leser fragt `coverage is null`, nie
Truthiness (`tests/test_matte_coverage_rule.py` bleibt).

1.5 **Coverage-Reihenfolge.** `coverage[i]` ↔ `labeling.all_squares()[i]` (`a1…h1, a2…h8`). TS:
`allSquares()` in `lib/matte.ts` aus `lib/fen.ts` `FILES`. Nirgends eine zweite Reihenfolge.

1.6 **Dateien mit Stempel.** `frame.board_path`/`board_stamp`, `matte.alpha_path`/`alpha_stamp`;
Stempel = `provenance.file_stamp(path)` = `f"{st_mtime_ns // 1_000_000}:{st_size}"` (neu, Form
von `session_stamp`); TS `fileStamp(path)` = `` `${Math.floor(s.mtimeMs)}:${s.size}` `` in
`lib/provenance.ts`. Ein Pfad ohne Stempel heisst "behauptet, nicht auf der Platte".

---

## 2. Schema-Ergaenzung: `db/schema/003_matte_current.sql`

2.1 Inhalt (additiv, `if not exists`):

```sql
-- upsert_proposals stempelt merged_at; verify.ts vergleicht es mit dem Urteil (`reopened`).
alter table matte add column if not exists merged_at timestamptz;
-- Der eine Vertrag (docs/spec-pg-matte.md 1.3): welche Zeile je Stem "der Zustand" ist.
create or replace view matte_current as
    select distinct on (recording, stem) *
    from matte
    order by recording, stem,
        case when skipped is not null then 9
             when source = 'sam' and exists (select 1 from unnest(coverage) v where v > 0) then 0
             when source = 'upsert' then 1
             when source = 'sam' then 2
             when source = 'temporal' then 3
             else 4 end;
grant select on matte_current to chesslab_pipeline, chesslab_web;
```

KEIN `seq` als Spalte: die Zeilenposition braucht nur der einmalige Import (6.2), danach traegt
der Primaerschluessel die Wahrheit. `coverage` wird in derselben Datei auf `double precision[]`
umgestellt (`alter column … type double precision[]`), damit kein Leser runden muss
(Empfehlung aus der zweiten Fassung, jetzt entschieden: 9 423 × 64 × 4 B mehr sind 2,4 MB).

2.2 **Anwenden.** Frisches `data/pgdata`: automatisch (Compose, alphabetisch). Bestehendes:
`Get-Content db/schema/003_matte_current.sql | docker compose exec -T db psql -U chesslab -d chesslab -v ON_ERROR_STOP=1`
— steht in `db/README.md` (neu, wenige Zeilen, mit 9.2 und 12.4).

2.3 **Vertrag erweitern** (`tests/test_db_contract.py`, gleiche Form: gegen die DB, zurueckgerollt,
ohne Container `skip`) — ein Test je Zeile der Rang-Tabelle: `sam`-Absage + `temporal`-Messung →
`temporal`; `sam` leer + `upsert` → `upsert`; `sam` mit Hand + `upsert` → `sam`; `sam` leer +
`temporal` → `sam`; und `test_web_may_read_matte_current`. Ein nicht angewandtes 003 macht sie rot.

---

## 3. Die neun Schreiber und ihre neue Form

Alle gehen durch **`src/chesslab/matte_store.py`** (4.2). Kein anderes Modul schreibt `matte`.

| # | Funktion (Stelle heute) | Neu |
|---|---|---|
| W1 | `matte.alpha_worker` — `path.open("a")`, `write`+`flush` je Frame | je Frame: `store.put(row)` in einer Transaktion (4.3). `done`/`successful` aus `store.rows(recording)` statt aus der Datei; `live`-Filter bleibt |
| W2 | `matte.recut_fixed` — Datei ganz neu, Stempelwache | je betroffener Zeile `store.put` mit `alpha_path = mattes/<stem>.fixed.webp`; Stempelwache entfaellt (kein Datei-Rennen mehr) |
| W3 | `matte.recut_coverage` — dito | liest das Alpha aus `row["alpha_path"]`, nicht aus `mattes/<stem>.webp` (Befund 5, Abschnitt 10); `store.put` je geaenderter Zeile |
| W4 | `matte.close_seams` — dito, gestaffelte `.tmp.webp` | Pixel gestaffelt wie heute; Stempel vom Temp; `put` je Zeile; Umbenennung NACH dem Commit (4.4) |
| W5 | `temporal_matte.adopt_proposals` — `kept_lines + fresh` | `store.delete_source(recording, "temporal")`, dann `put` je adoptiertem Frame; `have` = Stems mit `coverage not null` aus `store.rows` |
| W6 | `temporal_matte.upsert_proposals` — dito | `delete_source(recording, {"upsert","merged"})`; je Upsert `put(upsert-Zeile)` UND `put(sam-Zeile mit alpha_path = mattes/<stem>.sam.webp)`, weil die Datei umzieht; Umzug nach Commit |
| W7 | `temporal_matte.prune_dead_rows` — Zeilen raus | `delete from matte where recording=%s and source='temporal' and exists (sam-Zeile mit coverage not null)` und `… source='upsert' and exists (sam-Zeile mit Feld > 0)` — dieselben zwei Regeln wie heute, als SQL |
| W8 | `sessions._filter_matte_frames` (trim) | `store.delete_stems(recording, removed_stems)` (Array-Parameter, `= any(%s)` — Befund 17: nie `in (…)` mit leerer Liste; leere Menge = kein SQL) |
| W9 | `sessions.delete_session` — `rmtree` | `store.drop_recording()` VOR dem `rmtree` |

`cli.session_temporal_pass` orchestriert nur. Die Web-App schreibt `matte` nie (Rolle
`chesslab_web` darf es nicht); `matte-fix.ts` schreibt `.fixed.webp` und startet `occluders recut`.

Wo `alpha_worker` heute die Datei-Zeile baut (`row = {"frame", "ply", "dirty_reason", …}`), bleibt
`row` ein Dict in derselben Form; `store.put` uebersetzt (Abschnitt 5). `ply`/`dirty_reason`
werden nicht mehr gespeichert (stehen auf `frame`), `zone` und `cells_over_half` entfallen (liest
niemand bzw. ableitbar).

---

## 4. Der Store

### 4.1 `src/chesslab/db.py`

- `URL_PIPELINE = os.environ.get("CHESSLAB_DB_URL_PIPELINE", "postgresql://chesslab_pipeline:chesslab_pipeline@127.0.0.1:5432/chesslab")`
  — Name und Standard wie `tests/test_db_contract.py`; Compose ist die eine Wahrheit ueber Port
  und Zugang, die Variable zeigt woandershin.
- `connect(url=URL_PIPELINE, *, timeout_s=3)`; `OperationalError` → `DbUnavailable(RuntimeError)`
  mit `"Postgres nicht erreichbar unter <host:port>: <ursache> — docker compose up -d"`.
- `require()` = `connect()` + `select 1`, wirft `DbUnavailable`.
- `psycopg[binary]>=3.3.5` wandert nach `[project].dependencies`.

### 4.2 `src/chesslab/matte_store.py`

```python
class Store:                       # eine Verbindung, eine Aufnahme
    def __init__(self, conn, session_dir): ...
    def ensure_frames(self, stems: set[str] | None) -> FrameReport   # None = alle Log-Zeilen
    def put(self, row: dict) -> None                                  # upsert nach Abschnitt 5
    def delete_stems(self, stems: set[str]) -> int
    def delete_source(self, sources: set[str]) -> int
    def drop_recording(self) -> None
    def rows(self) -> list[dict]                                      # alle Zeilen, alle Quellen
    def current(self) -> dict[str, dict]                              # stem -> Zeile aus matte_current
def open_store(session_dir) -> ContextManager[Store]                  # connect + Transaktion; commit/rollback
```

`ensure_frames` upsertet `recording` (aus `session.yaml`) und `frame` (aus `read_log`):

```sql
insert into frame (recording, stem, ply, fen, dirty, dirty_reason, board_path, board_size, board_border, board_stamp)
  values (…) on conflict (recording, stem) do update set ply=excluded.ply, fen=excluded.fen, dirty=excluded.dirty,
  dirty_reason=excluded.dirty_reason, board_path=excluded.board_path, board_size=excluded.board_size,
  board_border=excluded.board_border, board_stamp=excluded.board_stamp;
```

Fehlt die Brettdatei, werden die vier `board_*` `NULL` und der Stem in `FrameReport.board_missing`
gezaehlt (`frame_board_is_complete` laesst nichts anderes zu; die DB spiegelt fuer Binaerdateien
die Platte). `put`:

```sql
insert into matte (recording, stem, source, skipped, coverage, concepts, alpha_path, alpha_stamp, merged_at, measured_at)
  values (…, now())
  on conflict (recording, stem, source) do update set skipped=excluded.skipped, coverage=excluded.coverage,
  concepts=excluded.concepts, alpha_path=excluded.alpha_path, alpha_stamp=excluded.alpha_stamp,
  merged_at=excluded.merged_at, measured_at=now()
  returning (xmax = 0) as inserted;
```

### 4.3 Transaktionsgrenzen

- W1: eine Transaktion JE FRAME (`open_store` je Frame; die Verbindung wird einmal geoeffnet und
  je Frame `commit`). Einheit der Haltbarkeit wie der `flush` heute; ein Kill kostet den Frame in
  Flug.
- W2–W8: eine Transaktion je Aufnahme. W7 und W8 sind ein einziges `delete`.
- W9: eine Transaktion, dann `rmtree`.

### 4.4 Alpha-Bilder liegen ausserhalb der Transaktion (Befund 9)

Reihenfolge fuer jeden Schreiber, der ein Alpha erzeugt oder verschiebt (W1, W2 nicht — liest
nur; W4, W5, W6):

1. Pixel nach `mattes/<stem>.tmp.webp` schreiben (`.tmp.webp`, nicht `.webp.tmp`: `imwrite`
   waehlt den Codec ueber die Endung — heute schon so in `close_seams`).
2. `alpha_stamp = file_stamp(tmp)` — `os.replace` erhaelt Mtime und Groesse, der Stempel des
   Temps IST der Stempel der veroeffentlichten Datei.
3. `put(row)` mit `alpha_path` = ENDNAME, Commit.
4. `tmp.replace(final)` — VEROEFFENTLICHUNG NACH DEM COMMIT. Bei W6 zusaetzlich
   `<stem>.webp → <stem>.sam.webp` vor dem Ablegen des Temps; beide Zeilen (sam, upsert) sind
   schon committet.

Scheitert Schritt 4, traegt die DB einen Pfad, dessen Stempel auf der Platte nicht stimmt — die
Waechter-Fehlerklasse aus Punkt 27, sichtbar in `chesslab db check-alphas` (8.3). Heilung: den
Lauf wiederholen (W1 schneidet neu, W4–W6 rechnen aus ihren Quellen neu). Ein abgebrochener Lauf
laesst `*.tmp.webp` liegen; `_drop` raeumt sie bei Ausnahmen wie heute, und `check-alphas` nennt
den Rest.

### 4.5 Preflight am ANFANG des aeusseren Befehls (Befund 12)

`db.require()` ist der ERSTE Aufruf in diesen `cli.py`-Handlern, vor jedem Dateizugriff — ein
`trim` oder `delete`, das Log, Frames und Crops schon angefasst hat und dann an der DB stirbt,
hinterlaesst einen halben Zustand:

`occluders alpha-worker` (auch `--all`, vor `_sam3()`), `occluders recut`, `recut-coverage`,
`close-seams`, `gate-train`, `gate-scan`; `session temporal-scan`, `temporal-mattes`,
`temporal-adopt`, `temporal-upsert`, `temporal-pass`, `temporal-prune`, `trim`, `delete`,
`settle-scan`; `realgames position-flags`, `audit-flags`, `hand-flags`; `dataset build`,
`session pack`, `session boards` und jeder andere Aufrufer von `iter_session_crops` (liest
`read_matte`); `db import-matte`, `export-matte`, `check-alphas`.

`DbUnavailable` steht NICHT in der Fangliste von `alpha_worker_all`
(`FileNotFoundError, ValueError, KeyError, OSError`): ein Nachtlauf bricht ab, statt Session fuer
Session `[ERR]` zu drucken.

---

## 5. Abbildung Zeile ↔ DB (`matte_store.to_db` / `from_db`)

| Zeile (Dict, wie `alpha_worker` es baut / wie die alte Datei es traegt) | DB | Regel |
|---|---|---|
| `frame` | `stem` | `Path(str(frame)).stem` |
| `source` | `source` | `or "sam"` |
| `skipped` | `skipped` | 1:1 |
| `coverage` (Dict) | `coverage double precision[64]` | `None` → `NULL`; sonst `[cov.get(sq, 0.0) for sq in all_squares()]`; fehlende Felder 0.0, gezaehlt als `sparse` (Korpus 0; Fixtures schreiben `{"a8": 0.5}`) |
| `concepts` | `concepts jsonb` | 1:1 |
| `alpha` = `"fixed"` / Quelle | `alpha_path` | `NULL` bei `skipped`; `mattes/<stem>.fixed.webp` bei `fixed`; sonst der Pfad, den der Schreiber nennt (`<stem>.webp`, nach W6 fuer die `sam`-Zeile `<stem>.sam.webp`) |
| — | `alpha_stamp` | `file_stamp(alpha_path)`; `NULL` wenn die Datei fehlt (`alpha_missing` gezaehlt) — der Pfad bleibt, weil `fixed` das Wort des Menschen ist |
| `merged_at` | `merged_at` | ISO → timestamptz |
| `ply`, `dirty_reason` | — | auf `frame`; Leser holen sie ueber den Join |
| `cells_over_half`, `zone` | — | ableitbar / liest niemand |

`from_db` liefert die alte Dict-Form zurueck (mit `ply`/`dirty_reason` aus dem Join,
`cells_over_half` gerechnet, `alpha: "fixed"` aus dem Pfad) — das ist die Form, die
`export-matte` schreibt und die die Python-Leser (Abschnitt 6.3) intern weiterverwenden.

---

## 6. Import des Bestands und die Leser

### 6.1 `chesslab db import-matte [NAME…] [--all]` — einmalig, idempotent

Je Aufnahme EINE Transaktion:

1. `ensure_frames(None)` — alle Log-Zeilen (auch fuer Aufnahmen ohne `matte.jsonl`).
2. `matte.jsonl` in Zeilenordnung lesen; je Zeile `put` mit `on conflict do update` — die
   Zeilenordnung IST das Last-wins je `(stem, source)`, und `returning (xmax = 0)` zaehlt die
   Ueberschreibungen. `do nothing` ist VERBOTEN (Punkt 27).
3. **Waisen (Befund 15):** ein Stem ohne Log-Zeile hat keine `frame`-Zeile und scheitert am
   Fremdschluessel. Er wird NICHT importiert und je Aufnahme gezaehlt und gelistet. Grund: eine
   `frame`-Zeile ohne Log-Zeile behauptete einen Frame, den der Export nicht fuehrt (`dirty`
   haette den Default `false` — genau die Vorgabe, die Punkt 27 verbietet); jeder Konsument
   ignoriert Waisen schon (`alpha_worker.live`, `matteCensus`, `matte_status.orphans`). Die
   Zeilen bleiben in der umbenannten Datei (Schritt 5) erhalten.
4. Schema-Abweisung oder `KeyError`: Rollback dieser Aufnahme, Zeile und Grund auf stdout,
   Exit 1 am Ende. Nichts wird uebersprungen und als Erfolg gemeldet.
5. Nach dem Commit: `matte.jsonl` → `matte.jsonl.pre-pg` (umbenennen, nicht loeschen — Memory
   "Daten behalten"). Existiert `.pre-pg` schon, bricht der Import fuer diese Aufnahme ab, bevor
   er etwas schreibt: der Bestand wurde schon importiert, und was jetzt als `matte.jsonl` liegt,
   ist ein Bericht (Abschnitt 7).

Bericht je Aufnahme:
`<name>: frames 466 (board fehlt 0) | zeilen 401 -> eingefuegt 344, ueberschrieben 57 | waisen 0 | alpha fehlt 0 | sparse 0`

**Abnahme auf dem Korpus** (`delete from recording;`, dann `--all`): frames 11 647, zeilen 9 423,
eingefuegt + ueberschrieben + waisen = 9 423, **ueberschrieben 1 657**, Abweisungen 0. Die Zahl
der Waisen ist unbekannt (`matte_status` meldete am 2026-09-14 korpusweit 2 975 Matten-Zeilen
ohne Log-Zeile — die Zahl von heute kommt in Punkt 27). Ein zweiter `--all` bricht je Aufnahme
mit "schon importiert" ab und schreibt nichts.

### 6.2 Was der Import NICHT rekonstruiert

`measured_at` (wird Importzeit), `zone`, `cells_over_half`. Keins davon traegt eine Entscheidung.

### 6.3 Die zehn Python-Leser in `src/chesslab/` (in dieser Naht auf die DB)

| Datei | heute | neu |
|---|---|---|
| `labeling.read_matte(session_dir)` | Datei, `coverage is None` VOR last-wins | `{stem: coverage-Dict}` aus `store.current()`, nur Zeilen mit `coverage not null`. Signatur bleibt; alle Aufrufer (`iter_session_crops`, `position_flags`, `sessions` Settle-Scan) unveraendert |
| `temporal_matte.sam_matte` | Datei, Quelle ≠ temporal/upsert | `rows()` mit `source = 'sam'` und `coverage not null` |
| `hand_flags.measured_coverage` | Datei, jede Zeile | `current()`, `(stem, square) -> value` |
| `matte.matte_status` | Datei | `have` aus `current()` mit `coverage not null`; `orphans` = Stems in `rows()` ohne Log-Zeile |
| `matte.flagged_frames(temporal=True)` | grep `"source": "temporal"` | `rows()` mit `source = 'temporal'` |
| `matte.alpha_worker` `done`/`successful` | Datei | `rows()` ∩ `live` |
| `position_flags` `is_file()` | Datei existiert | `bool(rows())` — "hat die Aufnahme irgendeine Matte-Zeile" |
| `audit_flags` mtime von `*/matte.jsonl` | Datei | `select max(measured_at) from matte` |
| `hand_gate` glob `*/matte.jsonl` | Datei | `select distinct recording from matte` |
| `sessions` (`_filter_matte_frames`, `delete_session`, Docstring) | Datei | W8/W9; Docstring |

`config.py:329` und die `cli.py`-Hilfetexte werden umformuliert. Nach dieser Tabelle greift die
Ratsche 8.4.

---

## 7. `chesslab db export-matte` — der Bericht fuer `scripts/`

7.1 **Warum ein Export und nicht acht Umbauten.** Die acht Skripte (`audit_disk_damage`,
`clear_view_audit`, `coverage_errors`, `hand_audit`, `matte_audit`, `matte_cell_audit`,
`occlusion_gate`, `phone_candidate_offset`) sind Auswertungen, keine Schreiber; sie lesen
`<rec>/matte.jsonl` mit je eigener Zeilenlogik. Sie auf die DB zu heben, kostet acht Umbauten
und bringt keine Entscheidung. Der Vorschlag des Koordinators wird uebernommen, mit zwei
Schaerfungen: (a) der Bericht liegt unter dem ALTEN Pfad, damit die Skripte unveraendert
laufen — deshalb MUSS die Ratsche (8.4) verhindern, dass `src/` oder `platform/` ihn je liest;
(b) der Stempel liegt in einer Nebendatei, weil eine Kopfzeile in der JSONL die Skripte
braeche (`hand_audit` greift `r["frame"]` ohne Pruefung).

7.2 **Form.** `chesslab db export-matte [NAME…] [--all] [--check]` schreibt
`data/recordings/<name>/matte.jsonl` aus `rows()` in `from_db`-Form (Abschnitt 5), so
geordnet, dass die LETZTE Zeile je Stem der Gewinner aus `matte_current` ist — die Skripte
lesen last-wins, also stimmt ihre Antwort mit dem Vertrag 1.3 ueberein. Daneben
`matte.export.json`: `{"exported_at", "rows", "max_measured_at", "_source": provenance.source(dir)}`.
`--check` schreibt nichts und meldet je Aufnahme `veraltet`, wenn `max(measured_at)` in der DB
juenger als `exported_at` ist oder die Nebendatei fehlt; Exit 1 bei einem Treffer. Die Skripte
selbst bleiben unveraendert; das Rezept "erst `export-matte --all`, dann das Skript" steht in
`db/README.md` und im Kopf von `scripts/README.md` (falls vorhanden, sonst in `db/README.md`
allein).

7.3 Atomar schreiben (`.tmp` + `replace`), wie heute die Umschreiber. Der Export ist der
EINZIGE Erzeuger einer `matte.jsonl` nach dem Import.

---

## 8. Beweise

8.1 **Tests laufen gegen die echte DB.** Kein Fake-Store: die eine Vertrags-Implementierung ist
das SQL, und ein Python-Nachbau von `matte_current` waere eine zweite Antwort auf die Frage aus
Abschnitt 1. `tests/conftest.py`: Fixture `matte_db` (Verbindung als `chesslab`, `skip` ohne
Container mit dem Satz aus `test_db_contract.py`), die vor UND nach dem Test
`delete from recording where name = %s` fuer die Namen des Tests faehrt (pytest ist seriell,
`pytest-xdist` ist nicht installiert). `write_session(…, matte=[rows])` legt Zeilen ueber
`Store.put` an. Jeder heutige Test, der `matte.jsonl` als Fixture schreibt (25 Dateien, Liste
in Abschnitt 11), wird auf `matte=` umgestellt und liest Ergebnisse ueber `Store.rows()`.

8.2 **`tests/test_matte_store.py`** (Marker `db`), die teuren Pfade (Befund 16):

- `test_a_rejected_row_never_lands`: `coverage_of` auf 63 Felder gepatcht → `alpha_worker`
  wirft `CheckViolation`, `rows()` traegt den Frame nicht, und `mattes/<stem>.webp` existiert
  NICHT (das Temp wurde verworfen) — Vorfilter plus 4.4.
- `test_publish_failure_after_commit_is_visible`: `Path.replace` fuer den Endnamen gepatcht auf
  `OSError` → `alpha_worker` wirft, die DB-Zeile steht, `check-alphas` (8.3) meldet genau diesen
  Stem als `stempel falsch`; ein zweiter `alpha_worker`-Lauf heilt ihn (Stem in `done`? NEIN —
  `done` muss den Stem mit fehlendem Alpha ausnehmen: `successful` = `coverage not null AND
  alpha_stamp = file_stamp(alpha_path)`; das ist die Regel, die den Selbstheilungspfad traegt).
- `test_import_skips_orphans_and_counts_them`: Datei mit einem Stem ohne Log-Zeile → Bericht
  `waisen 1`, Zeile nicht in `rows()`, `.pre-pg` traegt sie.
- `test_import_last_line_wins_and_counts_overwrites`: drei Zeilen fuer denselben `(stem, sam)` →
  `ueberschrieben 2`, Inhalt der dritten.
- `test_import_refuses_a_second_time`: `.pre-pg` liegt → Abbruch, nichts geschrieben.
- `test_upsert_moves_sams_alpha_and_its_row`: nach W6 zeigt die `sam`-Zeile auf
  `<stem>.sam.webp` mit passendem Stempel, die `upsert`-Zeile auf `<stem>.webp`; `matte_current`
  waehlt `upsert`; `recut_coverage` schneidet die `sam`-Zeile aus `.sam.webp` (Befund 5).
- `test_delete_stems_with_empty_set_runs_no_sql`: Befund 17.
- `test_export_last_line_is_the_current_winner` und `test_export_check_flags_stale`.

8.3 **`chesslab db check-alphas [--all]`** — der Waechter fuer die Stempel (Punkt 27 nannte ihn
die neue Fehlerklasse): je Aufnahme `alpha fehlt` (Pfad, keine Datei), `stempel falsch` (Datei
da, `file_stamp` ≠ `alpha_stamp`), `brett fehlt`, `brett stempel falsch`, `temp liegt`
(`*.tmp.webp`). Exit 1 bei einem Treffer der ersten vier. Abnahme direkt nach 6.1: `alpha fehlt`
und `stempel falsch` null (die Stempel wurden gerade gegen diese Platte gerechnet); die Zahl
`brett fehlt` kommt in Punkt 27.

8.4 **Ratsche `tests/test_matte_file_ratchet.py`:** keine Datei unter `src/chesslab/` oder
`platform/app/` (ohne `*.test.ts`, ohne `node_modules`) enthaelt die Zeichenkette
`matte.jsonl`, ausser `src/chesslab/matte_store.py` (Import/Export) und diese Spec-Referenz in
`cli.py`-Hilfetexten des `db`-Befehls. Damit fallen auch die Kommentare in `review.tsx`,
`sections.tsx`, `board-paint.tsx`, `classes.ts`, `corpus-query.ts`, `corrections.ts`,
`audit-flags.ts`, `chain-steps.ts`, `jobs.ts`, `verify.ts`, `platform/app/README.md` — sie
werden umformuliert, nicht geloescht.

8.5 **Web.** `lib/db-test.ts`: `dbAvailable()` und `seedMatte(name, logRows, matteRows)` ueber die
Eigentuemer-URL `CHESSLAB_DB_URL`, Aufraeumen per `onTestFinished`; Name =
`path.basename(await tempDataRoot(...))` (vitest faehrt Dateien parallel, heute heissen alle
`g`). `matte-state-parity.test.ts`, vierter Fall: Fixture per `seedMatte`, `loadMatte` liefert
die drei Zustaende wie `decode`. Die 16 Testdateien aus Abschnitt 11 werden auf `seedMatte`
umgestellt.

---

## 9. Was ein Ordner-Kopieren bedeutet

9.1 `data/` ist der Backup-Gegenstand und traegt jetzt auch `data/pgdata` (Bind-Mount,
`compose.yaml`; von git ignoriert). Es gibt nichts ausserhalb von `data/`, das die DB braucht,
und keinen `pg_dump`-Weg (nicht Teil der Naht; der Ordner IST das Backup).

9.2 **Zwei Auflagen, in `db/README.md` und im Kopf von `compose.yaml`:**

1. **Zum Kopieren ist der Container gestoppt** (`docker compose down`). Ein laufendes Postgres
   schreibt WAL und Shared Buffers; eine Kopie im Lauf ist ein Zustand, den kein Neustart
   garantiert repariert.
2. **`data/pgdata` ist an die PG-Hauptversion 17 gebunden** (`postgres:17-alpine`, gepinnt).
   Ein anderes Image auf diesem Verzeichnis startet nicht; ein Versionswechsel ist
   `pg_dumpall` + neues Verzeichnis und liegt ausserhalb dieser Naht.

Auf dem anderen Rechner: `data/` kopieren, Repo auschecken, `uv sync`, `npm ci`, `.env.local`
mit `CHESSLAB_DATA_DIR`, `docker compose up -d` — die DB kommt mit ihren Zeilen hoch, kein
Import. Danach `chesslab db check-alphas --all`: die Stempel stimmen nur, wenn die Kopie Mtimes
erhalten hat (`robocopy /COPY:DAT`, `cp -p`); sonst meldet der Waechter jede Datei als
`stempel falsch`, und `chesslab db restamp --all` (Teil von `check-alphas`, Flag `--restamp`)
rechnet die Stempel gegen die neue Platte neu — NUR die Stempel, nie Inhalte. Grund fuer den
eigenen Schritt: ein stilles Neu-Stempeln machte den Waechter wertlos; der Nutzer sieht die
Zahl und entscheidet.

9.3 **Test** `test_copied_pgdata_needs_no_import` ist auf dieser Maschine nicht als pytest
fahrbar (zweites Postgres). Der Beweis ist manuell und wird in Punkt 27 protokolliert: Container
stoppen, `data/` nach `tmp/copy-probe/` kopieren, dort `docker compose -p probe up -d` mit
anderem Port, `chesslab db check-alphas --all` gegen `CHESSLAB_DB_URL_PIPELINE=<probe>` → gleiche
Zeilenzahl (`select count(*) from matte`) wie im Original, `stempel falsch` = 0 nach
`--restamp`. Der Koordinator hat den Bind-Mount-Start bereits geprueft; dieser Lauf prueft die
Kopie.

---

## 10. Befund 5: `recut_coverage` und `.sam.webp` — erst messen

Heute liest `recut_coverage` fuer JEDE Zeile `mattes/<stem>.webp`, ohne nach `source` zu
filtern. Nach `upsert_proposals` liegt SAMs Original unter `<stem>.sam.webp` und `<stem>.webp`
ist Temporals Alpha; ein `recut-coverage` schneidet SAMs Zeile dann aus dem falschen Bild. Ob das
im Korpus vorgekommen ist, ist NICHT gemessen. Vor Commit 2 (Abschnitt 13) misst der Umsetzer
nach dem Import:

```sql
select recording, stem from matte where source = 'sam' and coverage is not null
  and exists (select 1 from matte u where u.recording = matte.recording and u.stem = matte.stem and u.source = 'upsert');
```

und prueft je Treffer, ob `mattes/<stem>.sam.webp` existiert und ob die gespeicherte `sam`-Coverage
zu `.sam.webp` oder zu `.webp` passt (`coverage_of` auf beide, Abstand ≤ 1e-4). Ergebnis in
Punkt 27. Die Reparatur ist in der Naht enthalten: W6 setzt `alpha_path` der `sam`-Zeile auf
`.sam.webp`, W3 liest `alpha_path`. Betroffene Zeilen des Bestands heilt ein einmaliges
`chesslab occluders recut-coverage --all` NACH dem Import, weil der Import `alpha_path` fuer
`sam`-Zeilen mit vorhandenem `.sam.webp` auf `.sam.webp` setzt (Regel in `to_db`: existiert
`<stem>.sam.webp` und die Zeile ist `sam`, ist das ihr Pfad).

---

## 11. Ohne DB geht nichts mehr an der Matte (Befund 11)

11.1 **CLI.** Jeder Befehl aus 4.5 endet SOFORT, vor jedem Dateizugriff, mit
`[FAIL] Postgres nicht erreichbar unter 127.0.0.1:5432 (<ursache>) — docker compose up -d`
und Exit-Code 2. Das betrifft auch `dataset build`, `session pack`, `session boards` und jeden
Aufrufer von `iter_session_crops`: **Trainingsdaten lassen sich ohne DB nicht mehr schneiden**,
weil die Coverage-Labels aus ihr kommen. `train` selbst liest den Pack und braucht keine DB.

11.2 **Web.** `app/shell.tsx` ruft serverseitig `dbAvailable()` (Verbindung, 3 s, Ergebnis 30 s
auf `globalThis` gehalten — 25 Aufnahmen mal 3 s Timeout waeren 75 s je Seite). Ist die DB weg,
rendert die Shell statt der Kinder EINE Seite: Ueberschrift
"Postgres nicht erreichbar", der Satz mit `docker compose up -d`, der Grund, seit wann. Kein
Rueckfall, keine leere Lane, kein Stack. Betroffen ist jede Seite, die `loadMatte`,
`matteCensus`, `verify` oder `audit-flags` beruehrt — also `/`, `/strom/*`, `/game/[name]`,
`/corpus`; die API-Routen antworten 503 mit demselben Satz als JSON (`{ error }`), damit das
Handy ihn zeigt. Eine DB, die erreichbar, aber falsch ist (fehlendes 003, Rolle), propagiert als
gewoehnlicher Fehler — "DB da, aber falsch" darf nicht wie "DB weg" aussehen.

11.3 **`scripts/`** brauchen keine DB, sie lesen den Bericht; `export-matte --check` sagt, ob er
veraltet ist.

---

## 12. Offene Fragen

12.1 **Waisen kuenftig.** Ein Re-Export waehlt andere Stems; `frame`-Zeilen der alten Stems
bleiben (nur Upserts), ihre Matte-Zeilen auch. `matte_status.orphans` zeigt sie. *Alternativen:*
(a) so lassen; (b) `ensure_frames(None)` im Export loescht Frames ohne Log-Zeile (Cascade nimmt
die Matte mit — Daten weg). *Empfehlung:* (a); Loeschen braucht den Imperativ des Nutzers.

12.2 **Standard-URLs im Code** (4.1, Web analog mit `chesslab_web`). *Alternative:* Pflicht-Env.
*Empfehlung:* Standard — Zugangsdaten stehen in `compose.yaml`, eine liegende DB faellt laut auf.

12.3 **Test-Datenbank.** Tests schreiben in `data/pgdata` mit eigenen Namen und raeumen auf; ein
abgestuerzter Lauf laesst `s`/`chesslab-*`-Aufnahmen liegen. *Alternativen:* (a) so, Aufraeumen in
`db/README.md`; (b) zweite Datenbank `chesslab_test` per Init-Skript. *Empfehlung:* (a) jetzt.

12.4 **`alphaPath()` der Web-App** (`crops.ts`, Review-Bild) bleibt in dieser Naht dateibasiert
(`.fixed.webp` wenn da, sonst `<stem>.webp`) statt `alpha_path` der Gewinnerzeile zu lesen. Nach
W6 ist `<stem>.webp` Temporals Alpha, und Temporal ist der Gewinner — stimmt. *Empfehlung:* so
lassen, in der Naht mit `alpha_stamp`-Anzeige umstellen.

12.5 **Rueckfall-Fenster 30 s** (11.2) ist gesetzt, nicht gemessen.

---

## 13. Umsetzung und Abnahme — drei Commits, jeder gruen

**Commit 1 — DB und Store.** `003_matte_current.sql`, anwenden, `db/README.md`,
`test_db_contract.py` (2.3), `psycopg` in `dependencies`, `db.py`, `provenance.file_stamp`,
`matte_store.py`, CLI-Gruppe `db` mit `import-matte`, `export-matte`, `check-alphas`.
Abnahme: `uv run pytest tests/test_db_contract.py` gruen; Import auf dem Korpus mit den Zahlen
aus 6.1; `check-alphas --all` mit `alpha fehlt` 0, `stempel falsch` 0; Messung aus Abschnitt 10
in Punkt 27; `export-matte --all` und `scripts/matte_audit.py` liefert dieselben Zahlen wie vor
dem Import (der Umsetzer nennt sie im Commit-Text).

**Commit 2 — Python schreibt und liest nur noch DB.** W1–W9 (Abschnitt 3), Alpha-Reihenfolge
(4.4), Preflights (4.5), die zehn Leser (6.3), `conftest.py` `matte_db` + `write_session(matte=)`,
Umbau der 25 Python-Testdateien, `test_matte_store.py`, Ratsche 8.4 fuer `src/`.
Abnahme: `uv run pytest` gruen MIT Container; OHNE Container: DB-Tests `skip`, Rest gruen;
`ruff`, `vulture`, Kommentar-Ratsche sauber; ein echter `occluders recut-coverage <name>`, dann
`check-alphas <name>` null; Container stoppen → `occluders recut-coverage <name>` endet mit
`[FAIL] Postgres nicht erreichbar …`, Exit 2, keine Datei angefasst (Mtimes vergleichen);
`session temporal-pass` auf einer Aufnahme laeuft durch, `matte_current` traegt danach die
Gewinner nach 1.3 (Stichprobe von fuenf Stems gegen `.pre-pg`).

**Commit 3 — Web liest DB.** `pg` (exakt gepinnt) + `@types/pg`; `lib/db.ts` (`pool` auf
`globalThis`, `max 4`, `connectionTimeoutMillis 3000`, `dbAvailable()`); `lib/matte.ts`:
`loadMatte` aus `matte_current` mit Join auf `frame` (`MatteFrame` + `source`, `alphaStamp`;
`coverage` 64 Schluessel), `matteCensus` (`usable`/`skipped` aus DB, `pile`/`exported` weiter
aus `log.jsonl`), `alphaState(row, fixedStamp)` per Stempel (`fixed` wenn `row.alpha === "fixed"
&& row.alphaStamp === fileStamp(.fixed.webp)`, `pending` wenn die Datei da ist und der Stempel
nicht passt, sonst `sam`), `matteStamp` und `WORKER_QUIET_MS` GELOESCHT (kein Datei-Rennen
mehr); `audit-flags.ts` Staleness aus `max(measured_at)`; `verify.ts`, `matte-fix.ts`;
`app/shell.tsx` (11.2); API-Routen 503; Kommentare umformuliert (8.4); `jsonl-readers.txt`
`lib/matte.ts` auf den Wert, den `jsonl-ratchet.test.ts` meldet (erwartet 2); `lib/db-test.ts`;
Umbau der 16 Testdateien; `platform/app/README.md`. Abnahme: `npm test` gruen mit Container,
Skips ohne; `lint`, `knip` sauber; `/strom/labeln`, `/strom/matte`, Kette zeigen fuer eine
Aufnahme dieselben Zahlen wie vor Commit 1 (Umsetzer nennt Aufnahme und Zahlen im Commit-Text);
Container stoppen → die eine Seite aus 11.2, `curl /api/…` → 503 mit Satz.

**Reihenfolge beim Zurueckdrehen:** 3, dann 2, dann 1 — und die `.pre-pg`-Dateien zurueck auf
`matte.jsonl` (ein Befehl in `db/README.md`), sonst liest der alte Code Berichte als Wahrheit.
Deshalb duerfen die `.pre-pg`-Dateien erst weg, wenn Commit 3 zwei Wochen gelaufen ist.

**Die 25 Python-Testdateien** (schreiben heute `matte.jsonl`): `test_bug_hunt_20260915.py`,
`test_bug_hunt_20260916.py`, `_20260916b.py`, `_20260916d.py`, `_20260916f.py`,
`test_close_seams_atomic.py`, `test_framescan.py`, `test_gate_respects_the_human.py`,
`test_geometry_bug_hunt.py`, `test_hand_flags.py`, `test_labeling_settle.py`, `test_matte.py`,
`test_matte_pile_agreement.py`, `test_matte_state_parity.py`, `test_model_read_key_readers.py`,
`test_pipeline_audit_20260914.py`, `test_position_flags.py`, `test_recut_coverage.py`,
`test_scripts_bug_hunt_20260914.py`, `test_sensors_bug_hunt.py`, `test_temporal_flags.py`,
`test_temporal_matte.py`, `test_temporal_missing_stamp.py`, `test_temporal_upsert_stamp.py`,
`test_todo_sweep_20260915.py`, `test_zone_limit_removed.py`. `test_scripts_bug_hunt_20260914.py`
testet ein Skript und bleibt bei der Datei (Bericht). **Die 16 vitest-Dateien:** `bughunt-2026-09-15b`,
`chain`, `matte-reported-blocks`, `matte-reported-orphan`, `matte-reported-skipped`,
`matte-skipped-frame-lane`, `matte-state-parity`, `matte-zero-coverage.bughunt-2026-09-14b`,
`matte`, `model-reads`, `next-step-reported`, `query`, `seams-2026-09-16`, `verify-route-status`
(plus `bughunt-2026-09-15` und `raster-cache-abort`, die mocken und unberuehrt bleiben). Das ist
die groesste Kostenstelle der Naht und wird im Commit-Text als Zahl der umgebauten Dateien genannt.

---

## 14. Doku-Nachzug (derselbe Commit wie die Aenderung)

- `docs/offene-entscheidungen.md` Punkt 27: Richtung (PG einzige Wahrheit, `matte.jsonl` nur noch
  Bericht), Zahlen aus 6.1, 8.3, 10 und 9.3.
- `CLAUDE.md`, hoechstens fuenf Zeilen unter "Verification": `matte` lebt in Postgres
  (`data/pgdata`, Container stoppen zum Kopieren), `matte_store.py` ist die einzige Schreib- und
  Lesestelle, `matte.jsonl` ist ein Bericht aus `chesslab db export-matte`; ohne DB kein
  Schneiden; Waechter `chesslab db check-alphas`; Zeiger auf diese Spec. Der Absatz "SAMs ABSAGE
  ist kein sauberes Brett" bekommt den Satz "und in `matte_current` verliert eine Absage gegen
  jede Messung (Spec 1.3)".
- `platform/app/README.md`: `CHESSLAB_DB_URL_WEB`, `docker compose up -d` als Voraussetzung,
  Verhalten ohne DB (11.2).
- `docs/data-pipeline.md`: `matte.jsonl` → "Bericht; Wahrheit ist `matte` in Postgres".
- `db/README.md` (neu): 003 anwenden, Kopier-Auflagen (9.2), Export-Rezept (7.2), Aufraeumen
  (12.3), Rueckweg (`.pre-pg` zurueck).
