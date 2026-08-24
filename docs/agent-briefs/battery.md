# Auftrag: Der Tracker verbraucht mehr Strom, als das Ladegerät liefert

## Das Problem, gemessen

Ein Redmi (`24117RK2CG`, SM8650, Serial `f86dfdca`) **entlädt sich während des Trackings, obwohl
er am Ladegerät hängt**: 16 % → 14 % über gut zwei Stunden Spielbetrieb am 2026-08-24, Status
durchgehend `charging`. SoC-Temperatur zwischenzeitlich 72 °C. Das ist der Auftrag: herausfinden,
wohin die Leistung geht, und sie senken, ohne die Tracking-Qualität zu verlieren.

## Was schon gemessen ist — nicht nochmal messen

Aus der Session vom 2026-08-24 (`docs/emission-correlation.md`, `docs/occlusion-gate.md`):

| | |
|---|---|
| Bildrate | 31 fps, `frame` 22–30 ms |
| Engine | 10,3 ms je Frame |
| CNN | 20–27 ms für 64 Crops, XNNPACK |
| Auswertungen | ~90 % aller Snapshots werden als `not due` verworfen |
| Aufnahme | `resolutionMode: R1440` |

**Rechenzeit ist nicht der Engpass** — die Latenzuntersuchung hat gezeigt, dass die Wartezeiten in
Gates sitzen, nicht in der CPU. Für den Stromverbrauch heißt das aber gerade NICHT, dass nichts zu
holen ist: 31 fps bei 1440p durchgehend zu dekodieren, zu warpen und zu vergleichen ist
Dauerlast, unabhängig davon, wie schnell ein einzelner Frame fertig ist.

**Erste Hypothese, ungeprüft:** die Kamera bei 1440p und die Vollbild-Pipeline dominieren, nicht
die CNN. `detectScale` steht auf 0,5, die CNN läuft selten — aber `convert`/`warp`/`gray`/`motion`
laufen auf JEDEM Frame.

## Werkzeuge — eine Falle ist bekannt

- **`simpleperf` ist auf diesem Gerät tot.** Der Hersteller hat `perf_event` im Kernel gesperrt;
  auch `simpleperf stat -e cpu-clock sleep 1` verweigert. Nicht daran aufhalten.
- **Perfetto läuft.** `adb shell perfetto -o /data/misc/perfetto-traces/t.pftrace -t 20s -b 32mb
  sched freq idle am wm gfx view binder_driver hal dalvik camera`. Zum Herunterladen
  `MSYS_NO_PATHCONV=1 adb pull …` (Git Bash mangelt sonst den Pfad). Auswertung braucht
  `trace_processor` (~50 MB Download) — vorher fragen, oder die Datei dem User für
  `ui.perfetto.dev` geben.
- **Für Strom ist ohnehin `batterystats` das richtige Werkzeug**, nicht der Profiler:
  `adb shell dumpsys batterystats --reset`, spielen lassen, dann
  `adb shell dumpsys batterystats --charged com.chesslab.tracker`. Dazu
  `/sys/class/power_supply/battery/current_now` für den Momentanstrom und
  `dumpsys thermalservice` für die Drosselung.
- Die App loggt selbst: `chesslabPerf` je Sekunde mit der Stufenaufteilung, `chesslabCnn` je
  Beobachtung, `chesslabState` bei jedem Übergang.

## Der Hebel, der schon belegt ist

Die Emissionsfehler des Modells sind zeitlich korreliert (ρ = 0,90 innerhalb einer Stellung, 0,87
noch über 1,5 s Abstand). **Zusätzliche CNN-Reads derselben Stellung tragen nachweislich nichts
bei.** Auf der Kette gemessen: jeden 5. Read zu nehmen statt jeden schlägt alle Reads deutlich
(64/2/4 gegen 57/9/19). Weniger zu rechnen kostet hier also keine Genauigkeit — das ist der
seltene Fall, in dem Sparen gratis ist.

Dasselbe Argument gilt für die Bildrate: wenn 19 Reads wie einer zählen, ist zu prüfen, ob 31 fps
Kamera überhaupt gebraucht werden oder ob 15 dieselbe Erkennung liefern.

## Was zu tun ist, in dieser Reihenfolge

1. **Messen, dann erst ändern.** Ein Basiswert in mA über 10 Minuten Trackingbetrieb, aufgeteilt
   nach Verursacher (Kamera, CPU, Display, GPU). Ohne diese Aufteilung ist jede Optimierung
   geraten.
2. **Die Aufteilung prüfen**, nicht die Vermutung: Kamera-Auflösung, Bildrate, Display-An,
   Pipeline-Stufen. Ein Lauf mit `resolutionMode` niedriger und einer mit gedrosselter Bildrate
   sagen mehr als jede Codelektüre.
3. **Kandidaten bauen und gegenmessen.** Jede Änderung an `:core-engine` oder der Pipeline muss
   über `scripts/replay-batch.ps1` gegen die 10 Recordings, bevor sie aufs Gerät geht — der
   aktuelle Stand ist **304/90/7** (gefunden/verpasst/erfunden). Eine Stromersparnis, die Plies
   kostet, ist keine.
4. **Am Gerät gegenprüfen**, dass der Akku am Ladegerät wieder steigt.

## Regeln, die hier gelten

- **Das Handy vor jedem Install sichern ist normalerweise Pflicht** (`adb exec-out "run-as
  com.chesslab.tracker tar cf - files" > …`). Der User hat am 2026-08-24 erklärt, die Daten lägen
  inzwischen mehrfach vor; trotzdem vor dem ersten Install nachfragen, nicht annehmen.
- `adb install -r` mit **demselben Signaturschlüssel** behält alle Sessions (42 zuletzt). Was
  `files/` löscht, ist ein Signaturkonflikt oder ein instrumentierter Testlauf.
- Gradle meldet „up-to-date" auch bei Fehlern → **immer `--rerun-tasks`**.
- ktlint über ALLE Module, Kommentarblöcke maximal 5 Zeilen (die Ratchet feuert bei 8), längere
  Prosa nach `docs/` mit einer Zeile Zeiger im Code.
- Jedes neue `TrackerConfig`-Feld braucht einen Knob **und** einen Eintrag in `KNOB_CATALOG` oder
  `NOT_A_SETTING` — zwei Tests erzwingen das.
- Höchstens **zwei** Desktop-Replays parallel (je ~6 GB nativ).
- Nichts löschen ohne ausdrückliche Anweisung; parken statt löschen.

## Was nicht Auftrag ist

Die Erkennungsqualität. Der Figur-Typ liegt bei 80,6 % (`real13-ms-s3-hn4-bn80`), die Belegung bei
99,9 % — daran arbeitet ein anderer Agent. Hier geht es um Watt, und die Qualität ist die
Nebenbedingung, die nicht schlechter werden darf.
