# Die Naht zwischen `core-engine` und `tracker-runtime` (2026-09-21)

Ein Architektur-Review (Codex, nur lesend) lieferte acht Befunde; fünf davon hat er selbst als
„unbelegt" markiert. Eine zweite, unabhängige Durchsicht hat jeden davon gegen den Code geprüft.
**Zwei sind widerlegt, drei belegt** — und einer der belegten ist schärfer als die Vermutung.

Nichts davon ist gebaut. Das hier ist die Beweislage, aus der entschieden wird.

## Belegt 1 — eine nicht ersetzbare Aktion kann still verdrängt werden

`EngineHost` führt **zwei** Warteschlangen (`actions`, Kapazität 32; `snapshots`, Kapazität 4).
Ein CNN-Schnappschuss kann eine Aktion also nie verdrängen — insoweit war die Vermutung falsch.

Erreichbar ist der Überlauf trotzdem, und der Weg ist kurz:

1. `setCameraOn(false)` stoppt die Kamera, **baut den Stack aber nicht ab**. Damit läuft
   `TrackerCoordinator.onFrame` nicht mehr — und `host.tick` ist der einzige Leerer der Queue.
2. Eine nicht ersetzbare Aktion geht rein: `AcceptCnnPosition`, `Undo`, `ChoosePromotion`,
   `CaptureBaseline` — oder `CnnAvailability(false)` aus `wireCnnAvailability`.
3. Der Regler im Einstellungsbildschirm feuert **ungedrosselt**: `KnobSlider.onValueChange` erzeugt
   je Compose-Frame ein `EngineAction.UpdateConfig`, kein Debounce. Nach 32 davon ist die Aktion
   aus Schritt 2 weg.
4. `submit` gibt `Unit` zurück. Der Verlust erscheint einzig als `actionQueue=…` in einer
   Perf-Logzeile — kein Aufrufer, kein Status, kein Alarm.

**Die teuerste Folge:** `CnnAvailability(false)` ist der Fix aus `b7a9287d`, der nach einem
gescheiterten CNN-Attach den Evaluator abhängt. Wird genau er verdrängt, bleibt `cnnRun = true`
bei totem CNN — also exakt der Zustand, den jener Commit schließen sollte.

Dazu, unabhängig davon: jede der fünf Einreichstellen ist `stacks.current?.host?.submit(…)`.
Während `StackSwitch.restart` zwischen `current = null` und Neubau steht, **verschluckt das `?.`
die Aktion**. Das Fenster ist nicht kurz — `old.close()` enthält `observer.close()` mit bis zu
fünf Sekunden (siehe unten).

**Fix:** nicht klein. Es braucht „ersetzbar / nicht ersetzbar" im `EngineAction`-Typ (nur
`UpdateConfig` und `SetDebugEnabled` sind koaleszierbar) und einen Rückgabewert für `submit`.
Der Restart-Teil wäre klein: eine Übergabe-Queue im `StackSwitch`.

## Belegt 2 — der Close-Timeout gibt Speicher frei, den ein laufender Thread noch benutzt

`CnnObserver.close()` wartet `CLOSE_TIMEOUT_MS = 5000` und kehrt bei Ablauf mit einer Warnung
zurück — während der Observer-Thread noch in `cnn.classify` steht. Danach gibt `TrackerStack.close`
Pipeline, Crop-Store und CLAHE frei, und `StackSwitch.restart` öffnet sofort die nächste
ONNX-Session.

Das ist schlimmer als „zwei Sessions gleichzeitig": der Observer-Thread schneidet in `cropFrame`
native Mats aus dem Warp und ruft `clahe?.applyTo(crop)` auf **genau dem `CropClahe`, das
`TrackerStack.close` als Nächstes freigibt**. Ein nativer Use-after-free auf dem CLAHE-Handle und
dem Crop-Store, nicht nur auf der Inferenz-Session.

`b87868c3` hat den Normalfall geschlossen, und `CnnObserverCloseTest` deckt drei Wege ab — **den
Timeout-Zweig deckt keiner.** Die fünf Sekunden sind eine bewusste Abwägung („a close that never
returns is worse than a leaked arena"), aber ihre Konsequenz steht nirgends.

Auslösbarkeit: Inferenz liegt bei ~16 ms, fünf Sekunden brauchen einen hängenden nativen Aufruf.
Der Befund ist **strukturell** belegt, die Eintrittswahrscheinlichkeit ist nicht gemessen.

**Fix:** klein und verhaltensgleich möglich — bei Timeout die Freigabe auf den Aufräum-Task
nachziehen statt sie im Aufrufer zu tun, und den Neubau erst nach dem Latch zulassen.

## Belegt 3 — `FrameInput.board` liefert nach dem nächsten Frame fremde Pixel

`core-engine` liest die Lazy-Funktion **nirgends** (gelesen werden nur `seq`, `grayDet`, `bgrDet`,
`corners`, `lumaPreClahe`, `motionRoiScore`, `gridLineCoverage`, `timestampMs`). Sie existiert für
`TrackerCoordinator`, der sie nach `host.tick(input)` im selben `onFrame` für Rauschen, Fokus und
Belichtung braucht.

Die Falle ist schärfer als „wird null": `OpenCvStages.boardAt` liefert aus `scope`, und `scope`
wird in `endFrame()` genullt — als erste Zeile von `convert()`. Ein festgehaltenes `FrameInput`
gibt danach **das Brett des NEUEN Frames** zurück. Keine Null, kein Fehler, nur falsche Pixel
unter der `seq` von vorgestern. Die einzige Absicherung ist, dass heute genau eine Stelle sie liest.

**Fix:** klein und verhaltensgleich — entweder die Funktion neben statt in `FrameInput` führen,
oder den Lazy an seine `seq` binden und bei Nichtübereinstimmung `null` liefern.

## Widerlegt 1 — die zwei Verdeckungsarme schweigen heute nicht gemeinsam

`CnnSnapshot.gridOccluded` ist `0L` sowohl bei abgeschaltetem Grid-Arm als auch bei gemessener
Sauberkeit, und `Taint.visibleSquares` liest das als voll sichtbar. Ein erreichbarer Doppelschweiger
existiert heute aber nicht:

- Alle sieben gebündelten Modelle tragen `coverage_output: true` → Grid-Arm aus, Modell-Arm an.
- Ein fehlendes oder unlesbares Spec ergibt `null` → Grid-Arm **an**. Die Ausfallrichtung ist die
  sichere.
- Ein Modell, das `coverage_output` deklariert und nur 13 Spalten liefert, ist verriegelt:
  `require(logits.size == batch * spec.outputWidth)` lässt den Attach scheitern, es entsteht gar
  kein Schnappschuss.
- Der Desktop-Replay setzt `runGridOcclusion` nie → Vorgabe `true`, er fährt wirklich beide Arme.

**Was bleibt:** die Invariante „genau ein brauchbarer Arm" hängt an einer einzigen Zeile in `:app`
(`gridArmFor`) und ist in `CnnSnapshot`/`CnnObservation` nicht ausdrückbar. Ein `== true` statt
`!= true` dort schaltet den Phantom-Veto auf **jedem ausgelieferten Modell** ab — und nichts außer
einem Kommentar hält das. Ein Test, der die Richtung festnagelt, ist billig und fehlt.

## Widerlegt 2 — der Doppelbesitz von „CNN läuft" schadet heute nicht

Observer besitzt `CnnState`, Engine besitzt `cnnRun`. Alle Restfenster durchgespielt:

- Das `Attaching`-Fenster ist bewusst offen und endet immer — `load()` ist `runCatching(open)`, es
  gibt keinen Zweig, der den Zustand unaufgelöst lässt.
- Bei `cnnVerify = false` bleibt `cnnRun` für immer `true`, aber folgenlos:
  `cnnOn = config.cnnVerify && cnnRun`.
- `retryAttach` emittiert `Off` vor `Attaching`, ein erneutes identisches `Failed` kommt also durch.
- Ein dauerhaft hängender Attach ergäbe einen Livelock über `expireStalledVerify`, nie einen
  falschen Commit.

**Der einzige echte Restweg läuft über Belegt 1**, nicht über den Doppelbesitz.

## Zwei Messungen, die fehlen

1. Wie lange `observer.close()` am Gerät wirklich braucht, mit Verteilung — das entscheidet, ob der
   Timeout aus Belegt 2 je zuschlägt.
2. Grid-Arm gegen Coverage-Arm auf demselben Material — das entscheidet, ob die Invariante aus
   Widerlegt 1 überhaupt die richtige ist. `CLAUDE.md` nennt diese Messung selbst seit Langem offen.
