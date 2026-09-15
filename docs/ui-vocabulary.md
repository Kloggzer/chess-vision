# Das Vokabular der App

Elf Primitive (specs/48), aus denen jeder Screen gebaut ist:
`android/app/src/main/kotlin/com/chesslab/tracker/ui/Chrome.kt`. Die Probe ist, dass ein zwoelftes
entweder wirklich neu ist oder der Screen, der es will, falsch ist. Jedes KDoc dort sagt, WOFUER
ein Primitiv nicht da ist — der Grund, warum eine Komponente driftet, ist, dass niemand aufschrieb,
wann man sie nicht nimmt. Hier stehen die Vorfaelle, die die Regeln begruendet haben.

## Es gibt keine untere Leiste

`specs/47` §3.1a: drei Ziele brauchen keine dauerhafte Chrome, und das Referenztelefon gibt dieses
Band ohnehin an MIUIs eigene Navigation. Was die Leiste GETRAGEN haette, ist der Weg zurueck in eine
noch laufende Partie — das ist `LocalResumeTracker`, einmal vom Nav-Host gestellt, von
`ChesslabScaffold` gelesen, und vom Tracker selbst als null gestellt.

## `ChesslabScaffold`: warum jeder Screen denselben Rahmen traegt

Back war auf jedem Screen ein anders platziertes, anders gestaltetes Bedienelement — hier eine
umrandete Pille rechts, dort gruener Text links — und eine handgebaute Kopfzeile schiebt
scrollenden Inhalt nicht unter sich hervor, also scrollte die Einstellungsliste direkt unter ihren
eigenen Titel.

Der Rahmen besitzt auch den Seitenrand. Screens setzten ihn selbst und widersprachen sich: 12 dp
auf Games/Settings/Speech/Debug, 14 dp auf dem Brett, 0 auf der Kamera.

Die Leiste sitzt auf dem GRUND und wird vom Inhalt durch eine Linie getrennt, nicht durch eine
hellere Fuellung — sie war ein massives Band aus `surfaceRaised`, und das ist Erhebung durch
Fuellung, die diese Palette abgeschafft hat.

Der Abstand UNTER der Linie gehoert aus demselben Grund dem Rahmen: ohne ihn sitzt die erste Karte
AUF der Haarlinie und liest sich, als haette sie gar keine Oberkante. Der UNTERE Abstand ist
groesser als der obere, und das ist keine Symmetrie, sondern die Systemnavigation: `MainActivity`
verbraucht `safeDrawingPadding()`, das Fenster ist also eingerueckt — aber das letzte Element einer
Liste endet dann buendig AN dieser Grenze mit Androids eigenen Knoepfen direkt darunter, und
"Show all 83 moves" war ein Bedienelement, das der Nutzer deswegen nicht treffen konnte. Jeder
Screen, der in einer scrollenden Liste endet, hat dasselbe Problem, also wird es einmal hier
behoben.

## Die zwei Banner

**Laufende Partie.** Seit specs/43 ueberlebt eine Partie das Verlassen dieses Screens, das
Verlassen der App und die Benachrichtigungsleiste — sie endet nur durch ausdruecklichen Stopp.
Nichts auf dem Schirm hat das je GESAGT, und ein Nutzer, der wegnavigiert, hat keinen Grund, es zu
glauben. Diese Zeile ist diese Aussage. Sie ist ABWESEND, wenn keine Partie laeuft, nie
anwesend-und-leer.

**Engine-Auswertung.** Der Lauf ueberlebt den Screen, der ihn startete (`ReviewHost`), und eine
Suche, die niemand sehen oder stoppen kann, ist eine Hintergrund-Engine, die Akku verbrennt. Das
hier ist das Sehen und das Stoppen: es nennt die Partie, sagt, wie weit sie ist, und traegt den
EINZIGEN Stop-Knopf der App dafuer.

## Die Primitive und ihre Vorfaelle

**Karte.** Ein Behaelter fuer Dinge, die zusammengehoeren, als Fuellung auf dem Grund mit 1-px-Kante.
Nicht fuer einen einzelnen Wert (das ist ein `StatTile`), und auch kein Weg, etwas wichtig aussehen
zu lassen — die Kante ist ueberall dieselbe, und `accented` ist die eine Ausnahme fuer die Karte,
derentwegen der Screen offen ist.

**Stat-Kachel.** Eine gemessene Zahl, gross, mit Einheit und Nenner. Nicht fuer eine Zahl, die
niemand gemessen hat, und nicht fuer eine Null bei frischer Installation — dort ersetzt ein
`EmptyState` das Raster. Auf dem Grund mit Kante gezeichnet statt als gefuellter Block, damit eine
Reihe davon sich als Tabelle liest und nicht als vier Knoepfe.

**Disclosure-Zeile.** Titel, eine Zeile, was dahinter liegt, und die Linie zur naechsten. Der
Untertitel sagt, was man FINDEN wird oder was die Einstellung gerade IST — nie, wie der Screen
heisst. Die Linie gehoert ZWISCHEN Zeilen und nie um sie herum: eine umrandete Zeile in einer Liste
ist eine Karte, die vorgibt, eine zu sein.

*Zwei Varianten, eine Komponente* (specs/51). Die Vorgabe ist die Chevron-Form, die Home und der
Review-Screen nutzen. Settings gibt ein `icon` und `chevron = false`, was Androids eigene
Settings-Form ist: Piktogramm plus ein Untertitel, der den aktuellen Wert nennt, tragen die
Affordanz, der Pfeil ist Moebel. Ein zweiter Zeilentyp, der fast so aussieht wie dieser, ist die Art
und Weise, wie ein Vokabular verrottet — genau das, was specs/47 und specs/48 rueckgaengig machen
sollten, also wird die Kollision hier geloest und nicht durch eine `SettingsRow`.

Das `icon` ist DEKORATIV und traegt absichtlich keine `contentDescription`: der zugaengliche Name der
Zeile ist ihr Titel, und den erreicht `android-ui.ps1 tap-text`. Ein beschriebenes Icon setzte einen
zweiten Semantik-Knoten neben ein Label, das schon dasselbe Wort sagt.

**Abschnitts-Label.** Body-Schnitt, halbfett, gesperrt, Grossbuchstaben. NICHT monospace. Es war
es, zusammen mit den Tab-Labels und dem Banner, und monospace fuer Ueberschriften ist, was das hier
wie einen Log-Viewer aussehen liess. Die Grossschreibung passiert dort, damit eine Aufrufstelle die
Woerter so schreibt, wie sie sie sagen wuerde.

**Gefuellter Knopf.** Das eine, wofuer dieser Screen da ist — hoechstens EINER je Screen. Alles
andere ist `OutlineAction`, `TextAction` oder `DangerAction`, und eine zerstoererische Handlung ist
nie gefuellt.

**Umrandete Gefahr.** Sie behaelt Materials geraeumigeres Seitenpolster statt `ACTION_PADDING`: ein
zerstoererischer Knopf ist nie einer von dreien quer ueber ein Telefon, und bei 8 dp umschloss die
Kontur das Wort in einem Dialog so eng, dass es als Abzeichen las statt als Knopf.

**Chip.** Eine Option einer Gruppe, die alle gleichzeitig sichtbar sind. Ausgewaehlt ist die
MOEBEL-Farbe und ein Rahmen, nie der Akzent: ein Chip ist eine Wahl zwischen Dingen, die schon auf
dem Schirm sind, und darf nicht mit dem einen gefuellten Knopf konkurrieren, der den Screen
verlaesst.

**Schweregrad-Streifen.** Zustand in FORM und nicht nur in Farbe: eine 3-px-Kante ueberlebt einen
Blick und eine Farbsehschwaeche, wo ein getoentes Wort das nicht tut. Drei Stufen und nicht mehr —
`Accent`, `Busy`, `Danger`. Kein Weg, eine Zeile zu faerben, die sich bloss von ihren Nachbarn
unterscheidet.

**Leerzustand.** Ein Satz, der nennt, was erscheinen wird, ein Knopf, der es erscheinen laesst.
Keine Nullen, kein Skelettraster, keine Illustration von nichts. Der Knopf ist die EINE gefuellte
Aktion dieses Screens, solange der Zustand leer ist — deshalb nimmt er ein Label und keinen Slot.

## `ConfirmDialog`: die einzige Unterbrechung

Das einzige Primitiv, das unterbrechen darf, und die eine Antwort der App auf "ein Tipp darf nichts
tun, was der Nutzer nicht zurueckbekommt". Die Regeln, die es durchsetzt, damit keine Aufrufstelle
sie sich merken muss:

- der Titel nennt die SACHE — "Delete this game?", nie "Are you sure?";
- der Text nennt den Verlust in ZAHLEN, weil eine Anzahl eine Folge wirklich macht und ein Adjektiv
  nicht;
- der Bestaetigungsknopf traegt das VERB, nie "OK";
- er ist ein `DangerAction` — **umrandet, nie gefuellt**, weil ein gefuellter roter Knopf das auf
  einem Schirm am leichtesten versehentlich zu Treffende ist;
- Antippen ausserhalb bricht ab, und nichts hier nimmt den Fokus, also erreicht keine Tastatur- und
  keine Barrierefreiheits-Geste den zerstoererischen Knopf vor dem harmlosen.

Fuer eine Handlung, die nicht rueckgaengig zu machen ist, und fuer sonst nichts. Undo IST die
Umkehrung; eine Partie zu beenden SPEICHERT sie; eine Einstellung laesst sich zuruecksetzen. Eine
Nachfrage vor diesen ist, wie diese Regel zu einer Nachfrage vor allem metastasiert.

## `percent`: eine Groesse, eine Schreibweise

Gewinnerwartung, Genauigkeit und die Kosten eines Zuges sind alle Prozente und werden ueberall
gleich geschrieben. Waren sie nicht: der Review-Screen schrieb `53 %`, die Eval-Leiste `53%` und die
Kostenspalte des Partieformulars `−10%`, in drei Dateien, die dieselbe Groesse zeichnen.
