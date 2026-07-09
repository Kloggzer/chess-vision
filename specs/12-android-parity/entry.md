# 12 — Android parity port: 2026-07-09 Python tracker fixes → Kotlin

> Entry file. The implementing agent reads THIS file completely, then exactly one
> phase file. The Python tracker (`src/chesslab/move_tracker/`) is the reference
> implementation and stays untouched.

## What this is

The Android engine (`android/engine`, ported in pack 08 phase 01) and CNN
safeguard (`android/app/.../tracker/cnn/`, phase 05) were built against the
Python tracker as of commit `3b759db`. Since then one intensive live-debugging
day (2026-07-09) landed a stack of correctness fixes on `main` that the Kotlin
side does not have. **The porting worklist IS the following commit list** —
read each diff (`git show <hash> -- src/chesslab/move_tracker src/chesslab/config.py`),
port semantics + defaults verbatim, and mirror the Python regression tests:

### Phase 00 worklist (engine, pure Kotlin)

| Commit | What |
|---|---|
| `b3d3825` | census evidence fusion (own SquareNoise, fused `z_eff = max(z_gray, w·z_census)`) + structural shadow/occlusion classifier (`occl_census_thr`) |
| `c3c2315` | census median-normalize + global-disturbance channel guard (hot > max_changed+2 → drop channel this frame, learn into noise) |
| `8c30888` | census flat-square noise (wide init_std, slow-lane learning — census channel only) + occlusion state gate counts the RAW occluded core |
| `242ea94`+`35f83be` | `move_destination_squares` (to + castling rook-to, NOT ep-captured) — destinations may never be shadow-vetoed; applied in viability, pair, endpoint; `shadow_blocked` debug |
| `211744f` | latch invariant: taint releases only when hold expired AND (motion since last refresh OR z back under z_thr); latched squares z-zeroed EVERY frame |
| `6368b88` (part) | `blocked_n = len(tainted)` counts toward max_changed in the hypothesis |

### Phase 01 worklist (safeguard/verify + alarm, engine api + app cnn)

| Commit | What |
|---|---|
| `1f5d86f` | from-empty never commits when destination reads confidently empty (non-castling) |
| `9432e1f` | from-empty alone NEVER confirms non-castling: needs castling OR whole-board deriving exactly the pending move |
| `cf31c81` (part 1) | verify-window fallback resync-checks the POST-move position; any occupancy conflict → discard |
| `cf31c81` (part 2) | resting-hand veto: fresh CNN snapshot occluded-dominant (p>0.5, age ≤3 s) → same taint latch |
| `6368b88` | to-arrived insufficient when origin confidently never emptied; desync alarm blocks ALL commits (dispatch gate + pending discard) |
| `b80a03c`+`e867df1` | illegal-move desync alarm: ≥3 distinct-observation stable identity mismatches → alarm state {conflicts, guess}; blocks re-anchor; recovery commits only when ALL conflict squares resolve; `guess_illegal_move` reconstruction; cleared by take-back match / user resync (logged discontinuity) |
| `f6960f8` | alarm ONLY on occupancy conflicts (`has_occupancy_conflict`) — identity-only misreads (N/B/R gap) never alarm |
| `1fcaf5c` | occupancy-axis fallback: identity mismatch → re-check occupancy-only (identity stripped); occupancy match ⇒ match_ok; occupancy deep-derive ⇒ commit |
| `83a1e88` | `verify_obs_votes` (default 2): every verify outcome (shadow/commit/ghost/overrule) needs N consecutive agreeing observations; different outcome resets |
| `35e3ff3`+`e065051`+`a098c05` | streaming-observer semantics ADAPTED (see below): seq-tagged snapshots, consumers only accept `obs.seq >= candidate.seq`, occlusion freshness bound 3 s, desync counting dedups per seq |
| `d318689` | inference time measured on every observation path |

UI-only commits (`455d066`, `579ef66`, `6c81f34`, `7801e52` banner part) map to
Compose equivalents ONLY where pack 08 already has the surface (alarm banner +
beep in the Tracking screen; skip the hover tooltip — no mouse on the phone).

## Architecture adaptation (decided — do not redesign)

- The Kotlin engine is synchronous-pure (frame in → events out); the safeguard
  is a coroutine worker (`CnnSafeguard`, phase 05). The Spec-11 "free-running
  observer" maps to: `CnnSafeguard` observes continuously while enabled
  (respecting a `observerIntervalMs` config, default 0), each observation
  carries the frame's seq (the engine already stamps frames — find via
  `grep -rn "seq" android/engine/src/main/kotlin`; if absent, add a
  monotonically increasing processed-frame counter to `TrackerEngine`).
- The alarm is engine state (blocks commits/re-anchor inside the engine's
  dispatch), surfaced through `TrackerStatus`/events; the Compose banner +
  one-shot sound (max 1/30 s) lives in the existing Tracking screen status
  area. TalkBack: the banner is a live region.
- Defaults go into the Kotlin `TrackerConfig` mirroring
  `config.TRACK_DEFAULTS` names (`desync_obs_n` → `desyncObsN` etc.).

## Protocol for implementing agents

- Branch: work directly on `android-tracker` (pack 08's branch, fully merged
  into main — continue it). Never commit to `main`; supervisor merges.
- You MAY `git commit` (fable-tier): atomic conventional commits exactly as
  named in your phase's Steps. Stage explicitly, never `git add -A`. No push.
- Trust the Python code/diffs over this spec; record discrepancies in
  `STATUS.md` here.
- Do not touch `src/chesslab/**`, `specs/08-*`, other specs.
- Pack 08 `entry.md` contracts apply verbatim: ktlint/detekt scoped (zero new
  findings, ktlintFormat for style, no @Suppress), version-catalog-only
  dependencies (none expected), memory-constraint contract (targeted gradle
  tests once; `:app:assembleDebug` once at the end of phase 01 only;
  lintDebug is the orchestrator's).
- If blocked, STOP and write the blocker to `STATUS.md`.

## Definition of done (per phase)

Phase acceptance criteria pass, named commits exist, STATUS.md updated.
Orchestrator runs the full gate (`:engine:test :app:testDebugUnitTest
:app:assembleDebug` + ktlint/detekt both modules + `:app:lintDebug`).
