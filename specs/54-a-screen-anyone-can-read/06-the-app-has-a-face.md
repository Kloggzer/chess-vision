# Phase 06 — The app has a face

The user, 2026-08-12: *"kannst du für die app noch ein logo erstellen und nutzen? während des
loadings soll das dargestellt werden und dann irgendwo auf der startseite untergebracht
werden"*.

Independent of 00–05. The only file it shares with another phase is `ui/home/HomeScreen.kt`
(04-A). Land it before 04-A, or after — never beside it.

## Why

**The app ships with the stock Android launcher icon.** `AndroidManifest.xml`'s `<application>`
declares `android:label` and no `android:icon` (`AndroidManifest.xml:21-25`), and
`app/src/main/res/` contains exactly three value files and no `mipmap/` or `drawable/`
directory at all. On the phone's home screen chesslab is the green robot.

The launch window is already handled with care — `Theme.ChesslabTracker` paints
`@color/chesslab_background` and is overridden under `values-night/` so a cold start does not
flash the wrong scheme (`themes.xml`, `colors.xml`). What it paints is a blank ground.

## Design (decided — do not redesign)

### 1. The mark

The pack carries it: `specs/54-a-screen-anyone-can-read/logo/chesslab-mark.svg`, plus
`chesslab-wordmark.svg` (mark + the word "chesslab"). It is a camera viewfinder's four corner
brackets around a chess motif — the two things the app is, in one shape, and geometric enough
to survive 24 dp.

Converted, by hand, into three Android assets — **no new dependency, no generator**:

| File | What | Notes |
|---|---|---|
| `res/drawable/ic_logo.xml` | the mark, 96×96 viewport | single-colour, `android:fillColor="#FF000000"`, tinted at the use site |
| `res/drawable/ic_launcher_foreground.xml` | the mark at 108×108 with the 18 dp safe margin | the adaptive icon's foreground layer |
| `res/values/ic_launcher_background.xml` | `<color name="ic_launcher_background">` | the paper ground, `#FFF3EDE3`, matching `chesslab_background` |
| `res/mipmap-anydpi-v26/ic_launcher.xml` | `<adaptive-icon>` binding the two | plus `ic_launcher_round.xml`, same content |

The mark is **one colour plus the background**. A two-tone checker in the icon is unreadable at
launcher size and would need a second layer; the brackets and the piece carry it.

Manifest: `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`.

### 2. The launch screen

Android 12+ draws its own splash from the theme. Under `res/values-v31/themes.xml`:

```xml
<style name="Theme.ChesslabTracker" parent="android:Theme.Material.Light.NoActionBar">
    <item name="android:windowSplashScreenBackground">@color/chesslab_background</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
    <item name="android:windowBackground">@color/chesslab_background</item>
</style>
```

and the same under `values-night-v31/` with the night parent and the night background, so the
splash follows the system scheme exactly as the launch window already does.

**The app's name on the splash** (user, 2026-08-13: *"im splashscreen bitte auch den app namen"*)
goes in the platform's one text slot, `android:windowSplashScreenBrandingImage` — a drawable
shown at the BOTTOM of the splash. The system splash has no text attribute at all, and the icon
slot is masked to a circle, so a wordmark inside it would be cropped.

It is a **raster** asset, deliberately: `VectorDrawable` has no `<text>` element, the app sets
`FontFamily.Default` (Roboto on device), and hand-drawing eight glyphs as paths would produce a
wordmark that is not the app's typeface. `res/drawable-nodpi/ic_wordmark.png` is rendered from
the device's own `/system/fonts/Roboto-Regular.ttf` at 800x320 (200x80 dp at xxxhdpi), with a
`drawable-night-nodpi/` twin because a branding image cannot be tinted at the use site.

**`androidx.core:core-splashscreen` is NOT added.** `minSdk = 29`, so API 29–30 get no system
splash — they keep today's behaviour, a themed blank ground, which is what they have now. One
dependency to backport a logo onto two API levels that this app is not being used on is not
worth it. Say so in the KDoc-equivalent XML comment, the way `themes.xml` already explains
itself.

### 3. On Home

`HomeScreen.kt`'s `ChesslabScaffold("chesslab", …)` title becomes the **wordmark**: the mark at
28 dp followed by the existing title text, in the bar's title slot. Nothing else on Home moves,
and the greeting card keeps its own words.

- The `Icon` gets `contentDescription = null` — it sits next to the word "chesslab", and a
  screen reader reading "chesslab logo, chesslab" is noise.
- Tinted `OnSurface`, not `Accent`: it is an identity, not a state (specs/48 rule 2).
- A named component size in the file that draws it: `private val LOGO_SIZE = 28.dp`.

## Steps

1. `res/drawable/ic_logo.xml`, `ic_launcher_foreground.xml`, `values/ic_launcher_background.xml`,
   `mipmap-anydpi-v26/*.xml`, `AndroidManifest.xml` — commit
   `feat(brand): chesslab has a launcher icon`
2. `res/values-v31/themes.xml`, `res/values-night-v31/themes.xml` — commit
   `feat(brand): the launch screen shows the logo`
3. `ui/home/HomeScreen.kt` — commit `feat(home): the title carries the mark`

## Tests

None to write — this is assets. What must be **shown**, in the phase report:

- the launcher icon on the emulator's home screen, light and dark (`adb shell am start -a
  android.intent.action.MAIN -c android.intent.category.HOME` then screenshot)
- the splash, caught on a cold start (`adb shell am force-stop …` then launch and screenshot)
- Home's app bar with the wordmark, light and dark
- the mark at 24 dp beside the mark at 96 dp, to prove it survives

```
gradlew.bat :app:ktlintCheck :app:detekt --rerun-tasks
.\scripts\android-emulator.ps1 -Avd <yours> -Port <yours> -Clip blender-opening -RestartExisting
```

## Acceptance criteria

- `grep -n "android:icon" android/app/src/main/AndroidManifest.xml` hits.
- `ls android/app/src/main/res/mipmap-anydpi-v26/` lists `ic_launcher.xml` and
  `ic_launcher_round.xml`.
- No PNG under `res/` **for the mark** — it is vector at every size, which is why it was drawn
  geometrically. The splash's *wordmark* is the one exception (see below): letterforms are not
  geometry, and hand-authored paths would not be the app's typeface.
- No new Gradle dependency: `git diff --stat` touches neither `app/build.gradle.kts` nor
  `gradle/libs.versions.toml`.
- The four screenshots above are attached.

## Do NOT

- Do not add `androidx.core:core-splashscreen`, an icon generator, or `material-icons-extended`.
- Do not put the logo on the tracking screen. That screen is for the board; a brand mark on it
  is the "empty container" rule broken with a picture (specs/48).
- Do not animate the splash icon. `windowSplashScreenAnimatedIcon` accepts a static drawable and
  that is what is wanted; an animation needs a duration attribute and a reason.
- Do not raise `minSdk` to get a splash on every device.
- Do not change `chesslab_background` in this phase. **Measured 2026-08-13: it drifts from the
  Compose palette in both schemes** — `#FFF3EDE3` against `PaperPalette.background`'s
  `#FFEAE3D5`, and `#FF1A1714` against `InkPalette.background`'s `#FF100E0C`, while
  `colors.xml`'s own comment claims it mirrors them. The splash makes that step visible where
  the blank launch window did not. It is a two-line fix and it is **not** this phase's: it
  changes what every cold start looks like, which is its own review.
