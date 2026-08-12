# Phase 04 — Every player-facing string is a resource

**Two assignments, one recipe.** They share no file and may run in parallel with each other.
04-B additionally shares no file with phases 01–03 and may run beside them.

| Assignment | Scope | Literals measured 2026-08-12 |
|---|---|---|
| **04-A** | `ui/home`, `ui/games`, `ui/camera`, the loose `ui/*.kt` (`Chrome.kt`, `SourcePreview.kt`, `ChesslabNavHost.kt`) | 33 + 24 + 31 |
| **04-B** | `ui/review`, `ui/analysis`, `ui/settings` **except `KnobCatalog.kt`** | 136 + 16 + 88 |

Out of scope for both, permanently: `ui/debug/` (20) and `ui/settings/KnobCatalog.kt` (54).
Behind the developer door the vocabulary *is* English — `census threshold`, `z threshold` — and
translating it makes it unfindable (specs/51).

## Why

Phases 00–03 converted the tracking screen. The rest of the app is still hardcoded English, and
a half-localized app is worse than an English one: the German user gets German buttons above an
English dialog. Phase 05 cannot start until every player-facing string has a key.

## Design (decided — do not redesign)

The recipe, per file:

1. Every string that a player reads becomes a `stringResource(R.string.…)` — including every
   `contentDescription`, which a screen reader speaks and `scripts/android-ui.ps1
   tap-description` matches.
2. Keys follow the convention stated in `values/strings.xml` by phase 00:
   `<screen>_<thing>`, lowercase, no abbreviations. The screen prefix is the package:
   `home_`, `games_`, `camera_`, `review_`, `analysis_`, `settings_`.
3. **Counted quantities go through `<plurals>`**, never through `if (n == 1) "move" else "moves"`
   and never through concatenation. German pluralises differently and the string must be able
   to say so. `games_move_count`, `review_ply_count` and the like are plurals.
4. **Sentences are not assembled from fragments.** `"$date · ${resultHeadline(result)}"` is
   layout (a separator between two rendered values) and stays; `"Game " + name + " has " + n +
   " moves"` is a sentence and becomes one resource with positional arguments (`%1$s`, `%2$d`).
   Positional arguments are mandatory — German reorders.
5. Anything written to disk or the wire keeps `Locale.ROOT` and is **not** a resource: PGN tags,
   export filenames, `DecisionLog` lines, JSON keys, FEN, SAN, UCI, square names.
6. When a literal turns out to be dead (a label nothing renders), delete it and say so in the
   report rather than giving it a key.

Register the assignment's packages in `StringLiteralGuardTest`'s `LOCALIZED` set (phase 00) in
the same commit that finishes them — that set is the ratchet, and a package that is converted
but not registered will drift back.

## Steps

One commit per package, named for it:

```
refactor(home): the home screen reads its strings from resources
refactor(games): …
refactor(camera): …
refactor(ui): the shared chrome reads its strings from resources     # 04-A
refactor(review): …
refactor(analysis): …
refactor(settings): the player-facing settings read their strings from resources   # 04-B
```

Then one commit per assignment adding its packages to the guard:

```
test(ui): <packages> are localized packages
```

## Tests (write, run once, targeted)

There is nothing new to unit-test — this is a mechanical substitution. What must be run once:

```
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.*" --rerun-tasks
```

`StringLiteralGuardTest` must be green **with your packages registered**. A green run with an
unregistered package proves nothing.

## Acceptance criteria

- For every package in your assignment, report the measured before/after:
  `grep -rhoE '"[A-Z][^"]{2,}"' <pkg> --include=*.kt | wc -l`. After must be near zero, and
  every survivor must be named in the report with the reason it is not user-facing (a route
  name, a JSON key, a `Locale.ROOT` format).
- `StringLiteralGuardTest.LOCALIZED` contains your packages and the test is green.
- No `<plurals>` in your scope is faked with an `if`:
  `grep -rn 'if (.*== 1)' <pkg>` returns nothing that picks a word.
- The emulator smoke test still passes — `scripts/android-smoke.ps1` matches `Start tracking`
  and `Stop tracking` literally and those strings are frozen (English) by this pack.
- `:app:ktlintCheck :app:detekt` clean, no new suppressions.

## Do NOT

- Do not touch `ui/debug/` or `ui/settings/KnobCatalog.kt`.
- Do not change any wording while converting. A conversion diff that also rewrites sentences
  cannot be reviewed. Wording belongs to 00–03 (tracking) or to a later pack (everything else).
- Do not add `values-de/`. That is phase 05, and it adds no keys of its own — every key must
  exist here first.
- Do not touch the other assignment's packages, even for a one-line fix. Record it instead.
- Do not localize `Start tracking` / `Stop tracking` away from their current English text.
