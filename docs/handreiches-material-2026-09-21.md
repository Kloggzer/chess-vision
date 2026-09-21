# Was das handreiche Material zeigt (2026-09-21, gemessen)

Seit heute hat der Messsatz einen zweiten Teil: `-Satz v2`, die zwei Partien vom 2026-09-19 mit
875 verdeckten Frames auf 988. Der Zehner-Satz trägt 24 auf 11 001. Zum ersten Mal ist die
Verdeckungs-Achse überhaupt messbar — und sie zeigt sofort zwei Defekte, die der alte Satz
strukturell nicht sehen konnte.

## Der Stand, in einer Tabelle

| Konfiguration | `15-50-28` (87 Züge) | `16-26-22` (59 Züge) | Zehner-Satz |
|---|---|---|---|
| wie sie war | 17/70/**6** | 0/59/0 | 396/3/0, 8 Desync |
| nur Anker-Fix (gebaut) | 17/70/**6** | **55/4/0** | **396/3/0, 8 Desync** |
| nur `cleanCommitsOnly=1` | **87/0/0** | **55/4/0** | **396/3/0, 8 Desync** |
| beides | **87/0/0** | **55/4/0** | — |

Beide Fixes greifen auf `16-26-22` an derselben Ursache; nur der Knopf hilft zusätzlich auf
`15-50-28`. Die vier auf `16-26-22` verbleibenden sind die **letzten vier Halbzüge** (`Qxc8`,
`Rxc8+`, `Ne8`, `Rxe8#`) — der Turmabtausch am Partieende, also der bekannte Reorder-Fall, kein
neuer Defekt.

## Der Anker-Fix ist gebaut

Der erste Quad einer Sitzung war 57,2 px daneben, weil `LiveAlign` mit leerem Tracker startet und
der erste akzeptierte Quad mit rund 92 % Wahrscheinlichkeit aus drei Markern affin rekonstruiert
wird. Verhaltensgleich auf dem Zehner-Satz nachgewiesen, also entschieden und gebaut.

## `cleanCommitsOnly` ist ein Vorschlag, keine Entscheidung

Der Knopf steht per Vorgabe auf **aus**. Er lässt einen Blick mit Hand drin weder bestätigen noch
verwerfen. Was für eine Beförderung spricht:

- **Auf dem Zehner-Satz kostet er nichts** — nicht eine Ziffer, und auch der Commit-Verzug ist
  Ziffer für Ziffer gleich (Median 0,27 s, p90 0,97 s, max 3,10 s, `scripts/commit_lag.py`).
- **Auf handreichem Material bringt er 70 Treffer und nimmt 6 Phantome weg.** Phantome sind in
  diesem Projekt das Veto; ein Fix, der sie auf null bringt, ist die stärkste Sorte Beleg.

Was dagegen spricht, beziehungsweise was fehlt:

- **„Kostet nichts" heißt auf dem Zehner-Satz nur „hat nie gegriffen".** 24 verdeckte Frames auf
  11 001 — der Knopf wird dort kaum je gefragt. Die Null ist kein Nachweis der Harmlosigkeit.
- **Der Preis fällt genau dort an, wo er greift:** jeder Blick mit Hand verzögert den Commit. Für
  `-Satz v2` fehlt die Verzugsmessung, weil die zwei Aufnahmen keine `retime`-Referenz unter
  `tmp/retime/<name>.json` haben. Das ist ein Lauf, kein Rätsel — er gehört vor die Entscheidung.

**Empfehlung:** erst den Verzug auf `-Satz v2` messen, dann befördern. Ein Knopf, der 70 Treffer
holt und 6 Phantome nimmt, ist kaum abzulehnen — aber „wie viel später committet er?" ist genau
die Frage, die der Nutzer an einer App merkt, und sie ist heute unbeantwortet.

## Die Lehre, schon zum dritten Mal heute

Der Zehner-Satz konnte keinen der beiden Defekte sehen. Beide liegen auf der Hand- und
Verdeckungs-Achse, und dort ist er blind: alle drei Hand-Wachen lassen sich abschalten, ohne dass
sich eine Ziffer bewegt (`docs/wachen-ablation-2026-09-21.md`). Der neue Teil des Satzes hat
innerhalb eines Tages zwei Defekte freigelegt, die monatelang unsichtbar waren — einer davon
kostete auf einer Aufnahme **alle 59 Züge**.
