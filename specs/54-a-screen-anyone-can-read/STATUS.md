# 54 — Status

| Phase | State | Branch | Note |
|---|---|---|---|
| 00 — the models speak no language | `todo` | `specs-54-00` | lands alone; owns `TrackerLabel`, `GameResult`, the guard |
| 01 — the game ends with a result | `todo` | `specs-54-01` | after 00 |
| 02 — the screen reads like a game | `todo` | `specs-54-02` | after 01 (same file) |
| 03 — when it goes wrong, it says what to do | `todo` | `specs-54-03` | after 02 (same file); touches `core-engine` additively |
| 04-A — home/games/camera/chrome → resources | `todo` | `specs-54-04a` | after 01; ∥ 04-B |
| 04-B — review/analysis/settings → resources | `todo` | `specs-54-04b` | after 00; may run ∥ 01–03 |
| 05 — Deutsch | `todo` | `specs-54-05` | last |
| 06 — the app has a face | `done (uncommitted)` | working tree | mark **A** chosen by the user 2026-08-13; see the session log |

## Open decisions, carried into the phases

- ~~The logo mark is not chosen yet.~~ **Candidate A — the pawn in a viewfinder — chosen by the
  user, 2026-08-13.** `logo/chesslab-mark.svg` is it; the other two stay in `logo/` as the
  probe's record.
- **`Start tracking` / `Stop tracking` are frozen English** for the whole pack, because
  `scripts/android-smoke.ps1:67-69` matches them literally. Phase 05 translates them in
  `values-de/` only.
- **All stuck reasons collapse to one player sentence** in phase 03 (`BoardBusy`). If that turns
  out to hide something a player needed, it is a measured finding for this file — not a
  vocabulary to invent while implementing.

## Measured before the pack was written (2026-08-12)

| Fact | Value |
|---|---|
| Entries in `res/values/strings.xml` | **171** |
| …of them referenced anywhere | **3** (`app_name`, `notif_channel`, `notif_title`) |
| `android:icon` in the manifest | **absent** — the app ships the stock Android launcher icon |
| Capitalised literals in `ui/`, player-facing packages | **~400** |
| Pure UI models returning English | 3 (`stateLabel`, `undoLabel`, `resultHeadline`) |
| fps on the tracking screen | the largest number on it, and already in `TimingsPanel.kt:50-57` |
| Destructive branches on the tracking screen | 1 (`TrackerModal.DISCARDING`) |
| Results a stored game can express | mate, stalemate, draw-by-rule, `*` — **no resignation, no agreed draw** |

## Session log

### 2026-08-13 — phase 06, in the working tree, **not committed**

Landed: `res/drawable/ic_logo.xml` (the mark, colour through `@color/chesslab_logo`),
`ic_launcher_foreground.xml` (108 canvas, group `scale 0.6875` + `translate 21`),
`mipmap-anydpi-v26/ic_launcher{,_round}.xml` with a `<monochrome>` layer, the two new colours,
`values-v31/` + `values-night-v31/` splash themes, `android:icon` / `android:roundIcon` in the
manifest, and the mark in Home's app bar through a new optional `titleIcon` on
`ChesslabScaffold`.

Verified: `:app:compileDebugKotlin :app:ktlintCheck :app:detekt` green,
`:app:processDebugResources` green (so the vector path data, the group transform and the
adaptive-icon XML are valid). Content spans 30.6–77.4 of the 108 canvas, i.e. inside both the
72-unit safe zone and the round mask (max radius from centre 33.1 < 36) — **not** eyeballed on
a launcher yet; the emulator run is still owed.

Discrepancies with the spec:

- The spec says the foreground is a plain colour and `ic_logo` is tinted at the use site. True
  for Compose, false for the splash: `windowSplashScreenAnimatedIcon` cannot be tinted, so
  `ic_logo` resolves `@color/chesslab_logo`, which is defined per scheme. The launcher
  foreground keeps a hard-coded ink because its background is always paper.
- `ChesslabScaffold` needed a new optional parameter. The spec said "the title slot" without
  saying the slot takes a `String`.

**Found while gating, NOT this pack's:** `DpLiteralGuardTest` is **red on `main`** as of
`c6b4eb0 feat: improve capture pipeline and focus controls` — five bare `dp` literals in
`ui/camera/FocusRuler.kt:93-96` and `ui/camera/CameraControls.kt:231`. Untouched by phase 06;
reported, not fixed. Everything else in the module gates green.

### 2026-08-13 — phase 06, addendum: the watermark

User, mid-session: *"kannst du auch das icon als watermark im hintergrund nutzen? ggf nur sehr
subtil"*, then *"nur den pawn und schön zentriert im panel und subtiler"*.

Landed: `res/drawable/ic_pawn.xml` — the mark's piece **without** the viewfinder brackets, in a
viewport cropped to the piece (36 x 54.5, the same geometry translated by -30/-21.5) — and a
`Watermark()` behind Home's list, centred, `OnSurface` at `WATERMARK_ALPHA = 0.03f`.

Two things this cost, both worth writing down:

- **`Icon` fills an unspecified dimension from the drawable's INTRINSIC size, not from the
  aspect of the dimension you did give it.** `Modifier.height(260.dp)` alone produced a
  36 dp-wide box that the piece was then fitted into at ~54 dp tall — a watermark a fifth of
  the requested size. Both dimensions are given now (`172 x 260`, i.e. 36/54.5 * 260).
- **The alpha is measured, not judged.** Screenshotted on the emulator at 1440x3200 and sampled:
  the piece sits **6/255 from the ground on paper, 7/255 on ink**. The dark side runs a hair
  stronger because a light ink on a near-black ground separates more per unit alpha. An earlier
  KDoc claimed a measurement that had not been taken; it was corrected before it became lore.

Screenshots: `tmp/logo-final-light/screen.png`, `tmp/logo-final-dark/screen.png`. Still owed:
the launcher icon and the cold-start splash, neither of which has been photographed yet.

**The watermark's colour, in three rounds** (user: *"in der richtigen app farbe aber mit
opacity"*, then *"nicht das grün sondern das beige"*). Every number below is sampled from an
emulator screenshot at 1440x3200, watermark pixel against ground pixel on the same row:

| Tint | alpha | paper | ink |
|---|---|---|---|
| `OnSurface` | 0.03 | 6/255 | 7/255 |
| `Accent` | 0.03 | 5/255 | 6/255 |
| `Accent` | 0.10 | 17/255 | 19/255 |
| `PieceWhite` | 0.10 | 3/255 | 24/255 |
| **`PieceWhite`, per scheme** (shipped) | **0.85 paper / 0.10 ink** | **23/255** | **24/255** |

Two things this measured that were not obvious:

- **Below ~10/255 a tint has no hue.** At 0.03 the green and the ink were indistinguishable from
  each other — both read as "slightly darker shape". Colour choice does not exist at that alpha.
- **A cream cannot be loud on a cream ground.** `PieceWhite` `#FCF8F0` is only 18/255 from
  `PaperPalette.background` to begin with, so on light the watermark is a whisper at *any*
  alpha — 3/255 at 0.10, and 18/255 would need full opacity. The dark side has no such ceiling
  (24/255 at 0.10). **The alpha is therefore per scheme** (user's call): `WATERMARK_ALPHA_PAPER
  = 0.85f`, `WATERMARK_ALPHA_INK = 0.10f`, chosen by `Background.luminance() < 0.5` — the ground
  actually behind the piece, not `isSystemInDarkTheme()`. Measured after: **23/255 on paper,
  24/255 on ink**, i.e. the two sides finally read alike. Note that 0.85 is not a style choice
  but a ceiling: paper's maximum is 18/255 of pure cream, and the alpha buys most of it.

`Accent` was tried and dropped: specs/48 rule 2 reserves it for state, and a brand green behind
the cards spends that meaning on decoration.

### 2026-08-13 — phase 06, addendum: the app's name on the splash

User: *"im splashscreen bitte auch den app namen"*. The platform splash has no text attribute;
its one text slot is `android:windowSplashScreenBrandingImage`, a drawable at the bottom.
`res/drawable-nodpi/ic_wordmark.png` + a `drawable-night-nodpi/` twin (a branding image cannot be
tinted at the use site), 800x320, rendered from the emulator's own
`/system/fonts/Roboto-Regular.ttf` at `wght=500` — the app sets `FontFamily.Default`, so this IS
the typeface the app bar draws. Raster, because `VectorDrawable` has no `<text>` and
hand-authored glyph paths would not be Roboto.

**Photographed at last** (`tmp/splash/s5.png`, `tmp/splash/launcher.png`): the splash shows the
piece over the night ground with `chesslab` beneath it, and the launcher icon reads clearly in
the dock at icon size.

**Finding: the platform masks the splash icon to a CIRCLE**, so `ic_logo`'s four viewfinder
brackets — which sit in the corners of a square — are clipped away. The splash therefore shows a
pawn only. It looks right and the user approved it, but it is currently an accident of cropping;
pointing `windowSplashScreenAnimatedIcon` at `ic_pawn` would make it a decision. One line, not
taken yet.

Emulator housekeeping: `window_animation_scale` / `transition_animation_scale` /
`animator_duration_scale` were set to 10 to catch the splash and are **restored to 1**.
