# Das Vokabular der App

Die Primitive (specs/48) in `android/app/src/main/kotlin/com/chesslab/tracker/ui/Chrome.kt`, aus
denen jeder Screen gebaut ist. Ein neues ist entweder wirklich neu, oder der Screen, der es will,
ist falsch. Jedes KDoc sagt, wofuer ein Primitiv NICHT da ist — eine Komponente driftet, wenn
niemand aufschreibt, wann man sie nicht nimmt. Hier stehen die Vorfaelle dahinter.

## Rahmen und Banner

- **Keine untere Leiste** (specs/47 §3.1a): drei Ziele brauchen keine dauerhafte Chrome, und MIUI
  belegt das Band ohnehin. Was sie getragen haette — der Weg zurueck in die laufende Partie — ist
  `LocalResumeTracker`.
- **`ChesslabScaffold`:** Back war auf jedem Screen anders platziert, und eine handgebaute Kopfzeile
  liess die Einstellungsliste unter ihren eigenen Titel scrollen. Der Rahmen besitzt auch den
  Seitenrand (vorher 12, 14 und 0 dp je Screen). Die Leiste sitzt auf dem Grund, getrennt durch
  eine Linie statt eine hellere Fuellung. Der Abstand unter der Linie gehoert dem Rahmen; der
  untere ist groesser, weil das letzte Listenelement sonst buendig an Androids Navigation endet —
  "Show all 83 moves" war deshalb nicht zu treffen.
- **Banner laufende Partie:** seit specs/43 ueberlebt eine Partie das Verlassen der App und endet
  nur durch Stopp; nichts auf dem Schirm sagte das. ABWESEND, wenn keine Partie laeuft.
- **Banner Engine-Auswertung:** der Lauf ueberlebt den Screen (`ReviewHost`); eine Suche, die
  niemand sieht oder stoppt, verbrennt Akku. Das Banner nennt Partie und Fortschritt und traegt den
  EINZIGEN Stop-Knopf dafuer.

## Die Primitive

- **Karte:** Dinge, die zusammengehoeren, Fuellung mit 1-px-Kante. Nicht fuer einen einzelnen Wert
  (`StatTile`), kein Weg, wichtig auszusehen; `accented` nur fuer die Karte, derentwegen der Screen
  offen ist.
- **Stat-Kachel:** eine GEMESSENE Zahl mit Einheit und Nenner. Nicht fuer eine ungemessene Zahl und
  keine Null bei frischer Installation (dort `EmptyState`). Mit Kante statt Fuellung, damit eine
  Reihe als Tabelle liest und nicht als Knoepfe.
- **Disclosure-Zeile:** der Untertitel sagt, was man FINDET oder was die Einstellung IST, nie, wie
  der Screen heisst. Linien ZWISCHEN Zeilen, nie um sie herum. Zwei Varianten einer Komponente
  (specs/51): Chevron (Home, Review) und Settings mit `icon` und `chevron = false` — ein zweiter,
  fast gleicher Zeilentyp ist, wie ein Vokabular verrottet. Das `icon` ist DEKORATIV ohne
  `contentDescription`: der zugaengliche Name ist der Titel, den `android-ui.ps1 tap-text` trifft.
- **Abschnitts-Label:** halbfett, gesperrt, Grossbuchstaben, NICHT monospace — monospace liess die
  App wie einen Log-Viewer aussehen. Die Aufrufstelle schreibt die Woerter normal.
- **Gefuellter Knopf:** das eine, wofuer der Screen da ist, hoechstens EINER je Screen; eine
  zerstoererische Handlung ist nie gefuellt.
- **Umrandete Gefahr:** behaelt Materials geraeumigeres Seitenpolster; bei 8 dp las sie im Dialog
  als Abzeichen.
- **Schweregrad-Streifen:** Zustand in FORM (3-px-Kante), nicht nur Farbe. Drei Stufen: `Accent`,
  `Busy`, `Danger`. Nicht fuer eine Zeile, die sich bloss von ihren Nachbarn unterscheidet.
- **Leerzustand:** ein Satz, was erscheinen wird, ein Knopf, der es erscheinen laesst — die eine
  gefuellte Aktion, solange leer. Keine Nullen, kein Skelettraster, keine Illustration von nichts.

## `ConfirmDialog`: die einzige Unterbrechung

Fuer eine Handlung, die nicht rueckgaengig zu machen ist, und fuer sonst nichts (Undo ist die
Umkehrung, Partie beenden speichert, Einstellungen lassen sich zuruecksetzen). Die fuenf Regeln:

- der Titel nennt die SACHE ("Delete this game?", nie "Are you sure?");
- der Text nennt den Verlust in ZAHLEN;
- der Bestaetigungsknopf traegt das VERB, nie "OK";
- er ist ein `DangerAction` — **umrandet, nie gefuellt**; ein gefuellter roter Knopf ist das am
  leichtesten versehentlich Getroffene;
- Antippen ausserhalb bricht ab, nichts nimmt den Fokus, also erreicht keine Geste den
  zerstoererischen Knopf vor dem harmlosen.

## `percent`: eine Groesse, eine Schreibweise

Gewinnerwartung, Genauigkeit und Zugkosten sind Prozente und werden ueberall gleich geschrieben —
vorher `53 %`, `53%` und `−10%` in drei Dateien fuer dieselbe Groesse.
