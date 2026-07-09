# HANDOVER — session 2026-07-09 → next fable instance

Branch `android-tracker`, everything committed, working tree clean. Two workstreams
ran interleaved this session: (A) the Android spec-pack execution, (B) a live-debug
rework of the **Python** detection algorithm. Read this file, then `STATUS.md`, then
`entry.md` — in that order.

## Where things stand

### A. Android pack (specs/08-android-tracker/)
- Phases **00–04 and 06 are done and merged** (see STATUS.md table). Full gate
  `./gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug :engine:ktlintCheck
  :app:ktlintCheck :engine:detekt :app:detekt` was green at the 04 merge; 06 (spectate)
  passed its scoped gate after that and is committed (2cbf488).
- **Phase 05 (CNN safeguard, YOUR first task)**: the agent died on the session limit
  before doing anything (worktree empty, no commits). Relaunch it as a fresh worktree
  agent. Key extra context to include in its prompt beyond `05-cnn.md`:
  - Code against the REAL `OccupancySafeguard`/`VerifyVerdict` interface in
    `android/engine/.../api/Safeguard.kt` (phase 01 shaped it; STATUS discrepancy #10).
  - Extension seam is `service/ExtensionPoints.kt` + `TrackerService.safeguard`; do NOT
    edit existing `ui/` files.
  - ONNX export now uses a batch-2 example (`evaluate.py`) → handle dynamic batch (64
    crops per run).
- **Phase 07 (recording/PGN)**: not started; run via
  `codewhale --model deepseek-v4-flash exec --auto "..."` (model flag BEFORE exec) in
  the main worktree. Forbid git commands and STATUS.md edits (supervisor commits);
  commit everything first (codewhale reverts out-of-scope changes on exit); no second
  codewhale in parallel.
- After 05+07: orchestrator full gate (both modules + `:app:lintDebug`) + Python gates,
  then the pack is complete.

### B. Python detection rework (the user's live issue — ACTIVE, not yet live-validated)
Commits `b3d3825, c3c2315, 7e085c8, 8c30888` on this branch. What was built, in order:
1. **Census evidence fusion** (dark-on-dark fix): census change is a second evidence
   channel, own `SquareNoise`, fused `z_eff = max(z_gray, census_z_weight·z_census)`.
   New live-tunables `census_z_weight=1.0`, `occl_census_thr=24.0` (config, CLI,
   `/api/settings`, debug card `struct_vals`).
2. **Occlusion-vs-shadow classifier** in `_baseline_occlusion_and_shadow`: strong
   absdiff classified by WHAT changed (census structure → occluded; chroma outlier vs
   gamut → occluded (flat hand); flat+darker+chroma-consistent → shadow). Gamut is now
   actually built in `_set_ref` at quiet re-anchors (was dead code);
   `occlusion_color_thr` default 1.5→3.0 (1.5 was "tuned" while the veto was dead).
3. **Live regressions found by the user and fixed same-day**:
   - census is NOT translation-invariant → wobble fired 62 squares → median
     normalization + channel guard (> max_changed+2 hot ⇒ drop channel this frame,
     learn it into the model).
   - flat/empty squares (b1/b8) census-fragile (tie-flip sensor noise + CLAHE) →
     census noise init_std 8.0 + SLOW LANE (`exclude_alpha_scale=0.125`, census channel
     ONLY — the gray channel keeps full exclusion, that invariant is regression-tested).
     `census_transform(eps)` exists but MUST stay eps=0 (deadband breaks monotone
     shadow invariance; tests prove it).
   - occluded-state gate now counts the RAW occluded core (`_occl_core_expiry`), not
     the dilated set — a single strong square (knight arrival) used to lock state
     "occluded" for ~10 s (until periodic CNN check) because `_try_detect`/CNN
     arbitration never ran.
- **Next step for B:** the user validates live. If still noisy, tuning order:
  `census_z_weight` down (0.7) before touching `z_thr`; watch `struct_vals` vs
  `changed_vals` in the debug card to see which channel fires. Clip regression tests
  (`pytest -m clips`, local data/testclips/) were red before the rework and are not a
  gate; realtime=True is mandatory for replays.
- **Port debt:** the Kotlin engine (phase 01) predates ALL of B. Once B is
  live-validated, spec a follow-up phase (08) porting: census fusion + median norm +
  channel guard + slow lane + raw-core gate + gamut-in-classifier. Memory
  `tracker-detection-pipeline` is up to date on these facts.

## Protocol reminders (bind you too)
- Git hygiene / static analysis / dependency rules: `entry.md`. ktlintFormat, never
  manual style fixes. Python gate: `.venv/Scripts/python.exe -m pytest -q` (386 green
  at handover) + `ruff check src tests synth`.
- Verify agents' gates yourself before committing their work; watch for stray
  `engine/bin/` IDE output (bit us once — now gitignored).
- STATUS.md is the single hand-off ledger — keep updating it.
