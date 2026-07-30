# Phase 03 — Remove the levers that can break things

**Independent of 00–02 and may run in parallel with them: different files, different concern.**
**Same principle: the app measures what it can measure instead of asking.**

## Why

The user's request, verbatim: *"ich möchte auch Hebel aus der Bedienung entfernen und möglichst
viel automatisieren, vor allem wenn man Sachen halt wirklich kaputt machen kann."*

Some settings in this app are conveniences. Others can silently destroy a session, and one of them
says so in its own help text:

> **Board orientation** — *"Which physical corner is a8. A wrong a8 assignment silently
> transposes every label."*

Silently is the operative word. A wrong orientation does not fail — it produces a full board of
confident, wrong labels, and every downstream number is poisoned. That is the worst class of knob:
destructive, silent, and offered to the user as a free choice.

## What is already known — start from this, verify it, do not assume it

**The marker IDs already determine the corners.** `resolveBoardCorners` addresses neighbours as
`(m ± 1).mod(4)` and the opposite as `(m + 2).mod(4)`, i.e. marker `N` **is** corner `N` in the
`[a8, h8, h1, a1]` order (`core-geometry/Aruco.kt`). Which physical corner is a8 is therefore a
property of where the stickers sit, not a user opinion.

`whitePov` is a *second*, separate thing: a 180° rotation of the square mapping
(`Corners.kt:80-92`, "rotated 180 degrees when `!whitePov`"). It is about which side the player
sits on, applied on top of the marker-derived geometry.

**So the first job of this phase is to establish which of the two the setting actually
controls**, and whether the marker layout makes it redundant. If the user always sticks marker 0
on the a8 corner, the knob is redundant AND dangerous. If the markers are stuck arbitrarily and
the knob is what reconciles them, it is load-bearing and must stay — but then it should be
*verified*, not merely offered.

## Design (decided — do not redesign)

### 1. Audit, and classify every setting

Go through `settings/AppSettings.kt` and `ui/settings/KnobCatalog.kt` and put each entry in one
of three buckets, in `STATUS.md`:

- **derivable** — the app can measure it. Then remove the knob and measure it.
- **destructive** — a wrong value silently produces wrong data. Then it needs a verification step,
  not a free choice.
- **preference** — speech, language, verbosity, debug. Leave alone; these break nothing.

Two entries are already known to belong in the dangerous half and must be named explicitly:

- `orientation` (above).
- `boardSize` in `KnobCatalog.kt:204`, range 640–2560. It overrides `measuredBoardSize`, which
  derives the warp from the corner quad and clamps to 320…1280. A hand-set value that disagrees
  with the measurement warps the board to a size the picture does not have.

### 2. Orientation: derive it, and verify it once

If the audit shows the marker IDs fix a8, remove the free-floating choice and replace it with a
**one-time visual confirmation at calibration**: render the rectified board with the corner
squares named and `a1` marked (specs/23's review overlay already does exactly this, and the same
legend belongs here), and let the user confirm or rotate. Rotation, not naming — the user
confirmed that shape once already: *"ich möchte die Box setzen und solange rotieren bis Weiß unten
ist."*

The difference from today is decisive: a knob is a standing invitation to be wrong; a confirmation
is a single decision made while looking at the answer.

### 3. `boardSize`: measured, or absent

The knob catalog's `boardSize` may not silently override a measurement. Either remove it, or make
it explicit that it overrides the measurement and show both values side by side. Prefer removal —
`measuredBoardSize` exists precisely so that nobody has to know this number.

## Steps

### 1. `specs/24-frame-the-board/STATUS.md` — commit `docs(specs): every setting classified derivable / destructive / preference`

The audit first, alone. It decides how much of the rest there is to do.

### 2. orientation — commit `feat(android): the board's orientation is confirmed once, not configured`

### 3. `KnobCatalog.kt` — commit `feat(android): boardSize follows the measurement`

### 4. tests — commit `test(android): orientation comes from the markers and survives a rotation`

## Tests (write, run once, targeted)

1. **Marker layout decides a8** — a quad with the four IDs in a rotated arrangement produces the
   correspondingly rotated square mapping, with no setting involved.
2. **The confirmation actually rotates** — each of the four states maps a1 to a different physical
   corner, and one of them is right for any placement.
3. **No path can produce a board size that disagrees with the measurement**, or if an override
   survives, it is visible in the profile.

```
gradlew.bat :app:testDebugUnitTest --tests '*Orientation*' --tests '*Calibration*'
```

Run **once**.

## Acceptance criteria

- `STATUS.md` classifies every entry of `AppSettings` and `KnobCatalog` into the three buckets.
- No setting remains that can silently transpose labels: either it is derived, or changing it
  forces a visual confirmation.
- `grep -n "boardSize" android/app/src/main/kotlin/com/chesslab/tracker/ui/settings/KnobCatalog.kt`
  either misses, or the row states that it overrides the measurement.
- Targeted tests green; `:app:ktlintCheck :app:detekt` clean.

## Do NOT / out of scope

- Do not remove a setting whose only sin is being unnecessary. This phase is about settings that
  can **destroy** something; a harmless knob costs nothing and removing it costs a rebuild.
- Do not touch speech, spectator or debug settings.
- Do not change the tracker's detection parameters (census, motion, occlusion thresholds). They
  are tuned against the clip suite and are not user-facing in the sense meant here.
- Do not touch `src/chesslab/` — the Python side's settings are a different pipeline.
