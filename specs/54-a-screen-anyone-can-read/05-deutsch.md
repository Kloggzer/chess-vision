# Phase 05 — Deutsch

Last. Depends on 00–04: every player-facing string must already have a key.

## Why

The pack exists because the app talks like its build log. Half of that is vocabulary and the
other half is that the vocabulary is only available in one language — the user's own is German,
and the app has never spoken it.

The mechanism is already half-present and unused: `AppSettings.speechLanguage` defaults to
`"en-US"` and `MovePhrase` (`tracker-runtime/speech/MovePhrase.kt:155`) carries a full German
vocabulary for spoken moves. That is **not** the UI locale and stays independent — German
announcements over an English interface is a legitimate combination, and coupling them would
take a working setting away.

## Design (decided — do not redesign)

### 1. `values-de/strings.xml`

A translation of `values/strings.xml`, **adding no keys**. A key you cannot translate because
it does not exist is a gap: record it in STATUS.md and leave it. A key you translate wrongly
because you guessed its context is worse than an English fallback.

Terminology, fixed — these are the words the rest of the app already uses in `MovePhrase`'s
`GERMAN` table (`MovePhrase.kt:44-60`), and the translation must not invent synonyms:

| English | Deutsch |
|---|---|
| White / Black | Weiß / Schwarz |
| move (noun) | Zug |
| moves | Züge |
| board | Brett |
| square / squares | Feld / Felder |
| game | Partie (**not** "Spiel") |
| draw | Remis |
| tracking (the act) | Aufzeichnen |
| camera light | Kameralicht |

Sample of the tracking screen, for tone — plain, addressing the player with *du* implicitly by
avoiding the pronoun altogether:

```xml
<string name="tracking_state_live">Läuft</string>
<string name="tracking_state_hand">Hand über dem Brett</string>
<string name="tracking_state_lost">Brett stimmt nicht</string>
<string name="tracking_turn_white">Weiß am Zug</string>
<string name="alarm_headline">Das Brett stimmt nicht mehr</string>
<string name="alarm_continue">Passt jetzt</string>
<plurals name="tracking_take_back">
    <item quantity="one">Zug zurücknehmen</item>
    <item quantity="other">%1$d Züge zurücknehmen</item>
</plurals>
```

German plural rules are `one` / `other`, same two categories as English — but the *wording*
differs (`Zug zurücknehmen` vs `2 Züge zurücknehmen`), which is exactly why phase 00 forbade
concatenation.

### 2. The language is the system's

`AndroidManifest.xml`'s `<application>` gains `android:localeConfig="@xml/locales_config"`, and
`res/xml/locales_config.xml`:

```xml
<locale-config xmlns:android="http://schemas.android.com/apk/res/android">
    <locale android:name="en" />
    <locale android:name="de" />
</locale-config>
```

From API 33 this gives the user a per-app language picker **in the system settings** — no
in-app setting, no new screen, no dependency. `minSdk = 29`; on 29–32 the app follows the
system language and cannot be switched independently. That is the accepted trade-off: the
alternative is `androidx.appcompat`, a dependency the app does not have and does not otherwise
want.

### 3. The test tooling is pinned to English

`scripts/android-ui.ps1 tap-text` matches literal text, and `scripts/android-smoke.ps1:67-69`
waits for `Start tracking` / `Stop tracking`. On a German device every text-driven control
breaks — silently, as a timeout that reads like a hang.

`scripts/android-smoke.ps1` gains one assertion before it starts: `adb -s <serial> shell getprop
persist.sys.locale` must begin with `en`; otherwise it fails immediately with the reason. A
smoke test that cannot find a button must say *why*.

## Steps

1. `res/values-de/strings.xml` (new) — commit `feat(i18n): the app speaks German`
2. `res/xml/locales_config.xml` (new) + `AndroidManifest.xml` — commit
   `feat(i18n): the system's per-app language picker lists English and German`
3. `scripts/android-smoke.ps1` — commit `test(android): the smoke test refuses a non-English device`

## Tests (write, run once, targeted)

| Test | Case |
|---|---|
| `StringResourceParityTest` (new, JVM) | every `name=` in `values/strings.xml` exists in `values-de/strings.xml`, and vice versa — the failure message lists the missing keys |
| `StringResourceParityTest` | every `%1$d` / `%1$s` in a value has a counterpart in its translation (count the format specifiers per key) |
| manual, emulator | switch the AVD to German, launch, screenshot Home + Tracking + the end-game dialog |

```
gradlew.bat :app:testDebugUnitTest --tests "*StringResourceParityTest" --rerun-tasks
.\scripts\android-emulator.ps1 -Avd <yours> -Port <yours> -Clip blender-opening -RestartExisting
```

The parity test is the one that matters: it is what stops the translation from silently rotting
the next time a string is added.

## Acceptance criteria

- `grep -c "<string name=" android/app/src/main/res/values-de/strings.xml` equals the same
  count in `values/`, and the same for `<plurals`.
- No German string is longer than 1.6× its English source without having been checked on the
  emulator — long compounds break the app bar and the chips. List every one you checked.
- The smoke test passes in English and fails with a clear message when the device is German.
- Screenshots of Home, Tracking and the end-game dialog in German are attached to the report.
- `:app:ktlintCheck :app:detekt` clean.

## Do NOT

- Do not add keys in `values-de/`. Missing key = gap = STATUS.md.
- Do not touch `AppSettings.speechLanguage` or `MovePhrase` — the spoken language is a separate
  setting and stays one.
- Do not add an in-app language picker. `localeConfig` is the platform's answer and it is free.
- Do not translate `ui/debug/`, `KnobCatalog.kt`, PGN tags, SAN/UCI, square names or anything
  written to disk.
- Do not "fix" `Start tracking` / `Stop tracking` in `values/strings.xml` — the smoke test
  matches them and they are frozen English for this pack. Their German translation is fine;
  the ENGLISH source must not move.
