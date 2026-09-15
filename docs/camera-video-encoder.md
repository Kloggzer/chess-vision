# Der Aufnahme-Encoder

Die Belege hinter `android/app/src/main/kotlin/com/chesslab/tracker/camera/CameraVideo.kt`. Im Code
steht jeweils ein Satz mit Zeiger hierher.

## Eine Bitrate-Entscheidung fuer beide Pfade (2026-09-13)

Zwei fest verdrahtete Raten waren eine Einladung auseinanderzudriften. `BITS_PER_PIXEL = 0,54` ist
das 1,5-fache der 0,362, die der Korpus heute misst; eine Partie mit 1440p/15 landet auf
29,9 Mbit/s, eine Aufnahme mit 2160p/15 auf 67,2.

`MIN_VIDEO_BIT_RATE = 8_000_000` ist der Boden, damit ein unplausibel kleiner gelieferter Frame
keine unbrauchbare Datei erzeugt. 8 Mbit/s ist, wo die schwaechste Aufnahme auf der Platte
(`rg-2026-09-11-20-00-52`) ohnehin schon liegt, und das gilt bereits als grenzwertig.

Gerechnet wird auf der GELIEFERTEN Groesse, nie auf der angefragten: 4K zu verlangen, waehrend das
Geraet 1440p herausgibt, kaufte die dreifache Rate fuer ein Bild, das sie nicht nutzen kann.

## Warum in Minuten-Segmente geschnitten wird

Der Index eines MP4 (`moov`) wird beim SCHLIESSEN des Muxers geschrieben, eine noch laufende
Aufnahme ist also eine Datei, die kein Dekoder oeffnen kann. Gemessen 2026-08-13: vier von elf
uebertragenen Aufnahmen — 1,99 GB — hatten `ftyp` und `mdat` und kein `moov`, und Androids eigenes
Exit-Log nennt den Toeter: `reason=16 (PACKAGE UPDATED)`, also ein neuer Build, ueber eine laufende
Aufnahme installiert. Ein SIGKILL vom Package-Manager fuehrt keinen Callback aus, es kann also auf
dem Weg hinaus nichts finalisiert werden; die einzige Verteidigung ist, schon finalisiert zu haben.
Eine Minute QHD sind ~150 MB, und der Muxer-Wechsel passiert auf einem Sync-Frame des Encoders — es
wird nichts neu kodiert und zwischen Segmenten geht kein Frame verloren.

Der Schnitt muss auf einem Keyframe landen: ein Segment, das mit einem P-Frame beginnt, hat nichts
zum Dekodieren dagegen, seine erste Sekunde waere also Muell. Der Encoder gibt alle
`VIDEO_I_FRAME_SECONDS` einen aus, deshalb ist der Schnitt "an oder nach der Grenze" statt genau auf
ihr — ein Segment darf bis zu eine Sekunde ueberlang sein, und kein Frame wird verworfen oder
verdoppelt.

`writtenBytes()` zaehlt JEDES Segment. `outputFile.length()` ist Segment 0 allein und gewann gegen
die akkumulierte Summe — gemessen an `2026-09-11-20-00-52`: `session.yaml` sagte 76,7 MB, wo 761 MB
in 13 Dateien lagen. Gelesen wird nach `releaseEncoder`, damit der letzte Muxer seinen Index
geschrieben hat und die Laengen endgueltig sind.

## Der Vorlauf-Ring

Eine Aufnahme startet ARMIERT: der Encoder laeuft, aber der Muxer wird nie geoeffnet — kodierte
Samples gehen in einen `PreRollRing`, gedeckelt auf `PRE_ROLL_SECONDS` und `PRE_ROLL_MAX_BYTES`.
Erst `keep` (der erste committete Zug) benennt eine Datei, oeffnet den Muxer und schreibt die
gepufferten Samples mit auf null rebasierter PTS; ab da laeuft die Aufnahme live wie zuvor,
Minuten-Rotation eingeschlossen. Ein Lauf, der nie behalten wird, schreibt NICHTS — Brettaufbau,
Marker-Kleben und Kalibrierung waren neun von elf uebertragenen Aufnahmen (4,7 GB) am
2026-08-13/14, und das ist der Mechanismus, der sie von der Platte haelt.

Die geflushten Samples und der Live-Pfad teilen eine Uhr: `originUs` ist die erste PTS des Rings,
`segmentStartUs` beginnt dort ebenfalls, also landet das erste Live-Sample genau einen Frame nach
dem letzten gepufferten, und die Minuten-Rotation zaehlt ab der Null der Datei.

`keep` ist idempotent — jeder spaetere Commit ruft es erneut und findet es schon behalten. Der Muxer
muss unter Umstaenden noch auf das Ausgabeformat des Encoders warten (`goLive` laeuft dann aus dem
Formatwechsel), aber die Entscheidung rastet hier ein.

`preRollUs` ist die Antwort der Aufnahme auf "hat der Vorlauf ueberlebt?" und erreicht
`session.yaml` als `video_pre_roll_ns`. Null heisst, der Ring war beim Commit armiert und nicht
davor.

## Warum die armierte Phase ihre Tiefe ins Log schreibt

Die armierte Phase hat keine Session, also fallen die Fortschrittszeilen von
`RecordingBundleHost` auf eine Null-Timeline und keine Datei haelt sie fest: zwischen Armieren und
erstem Commit ist der Vorlauf unsichtbar. Gemessen auf dem Telefon 2026-08-14 (Session
`20260814-142947`): die fertige Aufnahme trug ~1,4 s vor dem Commit, wo 20 faellig waren, und nichts
darin konnte sagen, WANN der Encoder armiert wurde. `ARMED_LOG_INTERVAL_MS` ist, was den naechsten
Lauf das ohne Forensik beantworten laesst.

## Warum ueberhaupt selbst kodiert wird

Dieses Telefon bietet kein CameraX-QHD-Recorder-Profil und kann `VideoCapture` nicht neben
`ImageAnalysis` binden. Ein zweiter Kamera-Besitzer waere falsch (MEMORY
`android-single-camera-owner`), also wird der eine Analyzer-Strom in einen
Hardware-AVC-Encoder kopiert. `MediaCodec.getInputImage()` legt das tatsaechliche Ebenen-Layout des
Encoders offen und erspart Annahmen ueber planares gegen halbplanares Chroma.

`TooManyFunctions` ist unterdrueckt, weil die Zahl DER LEBENSZYKLUS des Encoders ist: arm, keep,
encode, drain, sample, live gehen, rotieren, freigeben, plus die zwei, die das Geraet fragen, was es
akzeptiert, und melden, was geschrieben wurde.

## Der Encoder wird gefragt, nicht angenommen

Eine Rate ueber dem angegebenen Bereich des Codecs wird von `configure` nicht abgelehnt — sie wird
still uminterpretiert, und die Aufnahme behauptet danach eine Qualitaet, die sie nie hatte. Vorher
zu fragen macht daraus eine Zeile im Log und eine Notiz in `capture.json`.

`KEY_BIT_RATE` ist pro SEKUNDE und der Encoder gibt sie pro FRAME aus: ein 15-fps-Strom, dem 30
gesagt wurden, verschenkte die Haelfte — die Aufnahme ist Trainingsmaterial, und die halben Bits
sind die halbe Detailtiefe, aus der die Crops geschnitten werden.

## Die Naht

`VideoRecorderPort` ist die Videonaht, wie ihr einziger Konsument (`RecordingBundleHost`) sie sieht.
Armieren hat einen Besitzer, und das ist der Recorder — nicht die Callbacks des Encoders selbst
(doppeltes "armed", 2026-08-14). Die Naht zu benennen ist, was erlaubt, das auf der JVM gegen ein
Fake zu treiben, das zaehlt, wer was armiert hat.
