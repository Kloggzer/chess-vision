# 14 — Finlayson intrinsic-image channel (shadow-free diff input, experimental)

> Entry file for the spec pack. Every implementing agent reads THIS file completely,
> then exactly one phase file. `specs/08-android-tracker/entry.md` is the origin pack
> for the app; its **Git hygiene / Static-analysis / Dependency-management /
> Memory-constraint** sections apply verbatim here and are only summarized below.

## What this is

An **experimental, settings-toggleable preprocessing channel** that makes the move
tracker's diff input itself illumination-invariant, instead of vetoing shadows after
the fact. Based on Finlayson/Drew/Lu, *"Intrinsic Images by Entropy Minimization"*
(ECCV 2004; IJCV 2009, DOI 10.1007/s11263-009-0243-z):

- Under ~Planckian lighting with narrowband sensors and Lambertian surfaces,
  a lighting change moves every pixel along a **straight line in 2-D
  log-chromaticity space**. The line's direction is a **per-camera constant**.
- Projecting log-chromaticity orthogonally to that direction yields a 1-channel
  **invariant image** in which shadows (a lighting change) largely vanish while
  material changes (a piece appearing/vanishing) remain.
- The projection angle θ is found **once per camera** by entropy minimization
  (the correct angle produces the tightest, lowest-entropy histogram).

Integration principle (decided): the invariant image **replaces the CLAHE-gray
detect image** as the engine's `gray` input when the toggle is on. The engine
(Kotlin `com.chesslab.engine`, Python `_try_detect`) is **not modified at all** —
diff, census, noise models, and all vetoes operate unchanged on the new input.
It is purely a swap inside the two preprocessing seams:

- Python: `MoveTracker._gray` (src/chesslab/move_tracker/tracker.py:933-944 —
  `cvtColor → CLAHE → GaussianBlur`)
- Android: `BoardFramePipeline.process/preprocessGray`
  (android/app/src/main/kotlin/com/chesslab/tracker/service/BoardFramePipeline.kt —
  same chain, "Discrepancy #7" comment)

When the intrinsic channel is active, **CLAHE is skipped** (the invariant image has
its own fixed normalization; CLAHE on top would re-introduce local gain). The 5×5
GaussianBlur stays. The dark-frame gate's `meanLuma` stays measured on the PLAIN
gray (pre-intrinsic) — a dark room must still trip the gate.

## The math (decided — do not redesign)

All formulas operate on the warped BGR board at detect resolution, channels
clamped to `max(v, 1)` before logs (no log(0)).

1. **Geometric-mean log-chromaticity** (paper's ρ → χ, camera-neutral):
   `p = (R·G·B)^(1/3)`; `r = (ln(R/p), ln(G/p), ln(B/p))` (sums to 0, rank 2).
   Project onto the plane ⊥ (1,1,1) with the fixed basis
   `u1 = (1/√2, −1/√2, 0)`, `u2 = (1/√6, 1/√6, −2/√6)`:
   `χ = (r·u1, r·u2)`.
2. **Invariant grayscale**: `I_θ(x) = χ1(x)·cosθ + χ2(x)·sinθ`.
3. **Calibration (entropy minimization)** on ONE well-lit board frame that contains
   both square colors and ideally a visible shadow:
   for θ in 0..179° (1° steps): take the middle 90% of `I_θ` values (1st..99th
   percentile band per paper §5: reject outliers), bin width by Scott's rule
   `3.5·std·N^(−1/3)`, compute Shannon entropy of the histogram; `θ* = argmin`.
4. **Fixed u8 mapping** (temporal stability is non-negotiable — a per-frame
   normalize would defeat diffing): on the calibration frame compute
   `lo = P1(I_θ*)`, `hi = P99(I_θ*)`; store `(θ*, lo, hi)`; at runtime
   `u8 = clip((I_θ* − lo)/(hi − lo), 0, 1)·255`.
5. **Performance**: use a 256-entry `ln` LUT; the whole transform is a few
   multiply-adds per pixel at detect resolution (≤512²) — well under a ms budget.

Storage of `(θ*, lo, hi)`:
- Python: new optional fields on the calibration profile
  (`src/chesslab/calibration.py`, the dataclass `ensure_profile` round-trips;
  missing fields decode to `None` for old YAMLs).
- Android: three DataStore keys next to the other tracker settings
  (`SettingsRepository.kt`) — per-install ≈ per-camera is acceptable for an
  experimental feature; NOT in `CalibrationProfile` (geometry only, see
  android/.../geometry/CalibrationProfile.kt:18-29).

## Dependency table

| Spec | Phase | Depends on | Parallel? |
|---|---|---|---|
| `00-python-reference.md` | Python transform + calibration + golden values | — | first |
| `01-kotlin-port.md` | Kotlin port + golden parity test + pipeline seam | 00 (golden JSON) | after 00 |
| `02-android-integration.md` | Settings toggle, on-device calibration, wiring | 01 | after 01 |

Strictly **sequential** — 01 consumes 00's golden file, 02 wires 01's class and
touches the same pipeline file. Do not run in parallel.

## Protocol for implementing agents

- Branch: work directly on `main` is FORBIDDEN — one feature branch for the pack:
  `feat/14-intrinsic-image`. Atomic conventional commits exactly as named in each
  phase's Steps. Stage explicitly (never `git add -A` across scopes).
- Trust the code over the spec — line numbers drift; every anchor is paired with a
  symbol or grep. Record discrepancies in `STATUS.md`.
- If blocked, STOP and write the blocker into `STATUS.md`; do not improvise design.
- **Memory contract**: run tests ONCE, targeted (`uv run pytest tests/test_intrinsic.py -q`,
  `gradlew :app:testDebugUnitTest --tests '*Intrinsic*'`). NEVER the full clip suite,
  `assembleDebug`, detekt/ktlint repo-wide, or `pytest` unscoped — the orchestrator
  runs the full gate after all phases.
- **Static analysis**: `ruff check src tests` (Python phase) / ktlint+detekt scoped
  to touched modules via `gradlew :app:ktlintCheck :app:detekt` ONCE at phase end;
  zero NEW findings, no suppressions. Use `ktlintFormat`/`ruff format` instead of
  hand-fixing style.
- **Dependencies**: none needed. Everything is NumPy / plain Kotlin. Adding any
  dependency requires a STATUS.md justification.

## Repo rules you will actually hit

- **Engine purity**: `android/engine/**` (pure Kotlin, no Android deps) must NOT
  change in this pack. The transform lives app-side (`com.chesslab.tracker.service`),
  exactly like CLAHE does today.
- **Parity discipline**: Python is the reference; the Kotlin port must match it on
  golden values to 1 u8 gray level. Document any deliberate divergence in the code
  comment AND `STATUS.md`.
- **Settings pattern**: every new setting = field in `TrackerSettings` (+ default
  const) → key in `SettingsRepository` (decode/encode) → control in
  `SettingsScreen` (Experimental section) → applied in `TrackerService.observeSettings`.
  Follow the `lockExposure`/`focusDistance` commit (`b381890`) as the template.
- **Experimental features must be toggleable in Settings, default OFF** (user
  requirement). The Reset-to-defaults button must NOT flip experimental toggles on.
- **Determinism**: calibration must be reproducible — no RNG anywhere.
- **Language**: code/comments/docs English. Do not commit `data/`, `scans/`, APKs.

## Definition of done (per phase)

Phase file's acceptance criteria all pass + targeted tests green + scoped lint clean
+ STATUS.md row flipped to `done` with a one-line session log entry. The
orchestrator (not phase agents) runs afterwards: full `uv run pytest -q`,
`pytest -q -m clips`, `gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug`,
repo-wide ktlint/detekt/lint, and the on-device smoke test.
