# 19 — Live hardening: STATUS

The only hand-off between agents. Each phase appends **its own** section; never rewrite
another phase's. Record discrepancies against the spec, every measurement including negative
results, and any blocker with file + line + what you tried.

## Phases

| Phase | File | Concern | State | Notes |
|---|---|---|---|---|
| 00 | `00-poisoned-reference.md` | Measure why `f1` stands at z≈15; origin-vs-destination asymmetry | measured | Root cause: an un-vetoed resting hand, not a stale reference. Origin/destination asymmetry does not exist. |
| 01 | `01-cnn-runtime.md` | ORT session config, XNNPACK, profiling, steady-state number | done, unmeasured | QNN dependency dropped for XNNPACK+NNAPI (option 2). **No device attached — no on-device number.** |
| 02 | `02-frame-allocations.md` | Per-frame buffers, engine hot path, 3 latent bugs | done | Ring + 3 bugs fixed; parity 18/18, zero divergence. **Step 2 (BGR mean): measured, no safe change found** — two rewrites were slower. |
| 03 | `03-recording.md` | Recording "doesn't work well" — diagnose then fix | done | No device attached; diagnosed from the write path. 6 defects fixed, 6 regression tests proven red first. |
| 04 | `04-cnn-activations.md` | `_convert_bn_to_gn` deletes timm's ReLUs | done | 30 activations back, export pinned. **BatchNorm still crashes on ROCm-Windows — workaround stays.** Old groupnorm checkpoints no longer load: implies a retrain (user's call). |

All five may run in parallel; file scopes are disjoint.

## Baseline measurements (from the session that produced this pack)

Recorded here so no phase re-derives them, and so a later reader can tell what moved.

**The recording:** 1080×1920, 30 fps, 1975 frames, ArUco visible, standard start position.
Board occupies 630×643 px of the source = **79 px per square**.

> **CORRECTION (orchestrator, after phase 00).** The score table and the ten-ply move list
> below do **not** reproduce and must not be cited. They came from `scripts/replay_clip.py`
> in **realtime** mode against an auto-regenerated `phone` profile at `board_size = 800`.
> Realtime replay drops frames by machine load, so it is not deterministic; and 800 is not
> the 640 every regression clip uses. Phase 00's deterministic run at 640 measures **8 plies**
> (`d4 d5 Kd2 Nf6 Nf3 Nc6 Nc3 Ne4+`) and scores 20.48 / 19.06 / 8.64 / 24.45 / 24.45 / 37.65 /
> 37.65 / 22.32. The repeated `24.0` below is `2 x 12.0` — the per-square logit clip, i.e.
> saturated. `entry.md`'s claim that every genuine move scores >= 22.0 with margin >= 9.3 is
> therefore **false** (d4 = 20.48, d5 = 19.06 at margin 5.76).
>
> What survives unchanged: the phantom `Kd2` is real, it is the weakest commit in the clip by
> a wide margin in both runs, and its evidence contains no square from a piece that moved.
> Phase 00's Q3 additionally **refutes** the origin-over-destination asymmetry asserted in
> `entry.md` — median z[origin] 13.32 vs z[destination] 17.07, and the geometric explanation
> is excluded directly.

**Python tracker on it** (`d4 d5 Kd2 Nf6 Nc3 Nc6 e4 dxe4 Nxe4 Nxe4+`), score per commit:

| move | cand | best | 2nd | margin |
|---|---|---|---|---|
| d4 | d2d4 | 22.0 | −0.6 | 22.6 |
| d5 | d7d5 | 24.0 | 12.2 | 11.8 |
| **Kd2** | **e1d2** | **8.8** | **6.2** | **2.6** |
| Nf6 | g8f6 | 23.6 | — | ∞ |
| Nc3 | b1c3 | 24.0 | 11.1 | 12.9 |
| dxe4 | d5e4 | 24.0 | — | ∞ |
| Nxe4 | c3e4 | 24.0 | 13.9 | 10.1 |
| Nxe4+ | f6e4 | 24.0 | 14.7 | 9.3 |

**Deterministic sweep** (`scripts/sweep_clip_params.py`, virtual clock, every frame):

- `motion_hold_s` 0.4 vs 0.1 → identical move list, times differ by ~0.3 s.
- `occlusion_keepalive_s` 0.1 vs 1.0 → identical move list, 0 squares vetoed at every commit
  either way.
- State occupancy over the clip: `occluded` 933 frames, `moving` 238, `waiting` 582,
  `move` 222. 907 of 1975 frames carry a live occlusion veto.

**Clip regression** (`pytest -m clips`): 20/20 green at `motion_hold_s = 0.4`; 19/20 at 0.1,
0.2 and 0.3 (`blender-scholars` loses `Qxf7#`).

**Android frame budget on device** (SM8650, after commits `b360843`…`fe38b58`):

```
engine  4– 7 ms -> frame 28–41 ms -> sensor gap 60–71 ms -> fps 17–22
engine 27–35 ms -> frame 62–77 ms -> sensor gap 87–95 ms -> fps 12–13
```

**CNN on device:** `235 ms = 6 prep + 227 session` on QNN-HTP; CPU fp32 was 97 ms as a cold
profiled batch. Preprocessing was 259 ms before commit `4df4ade` (boxed `List<Float>` read
per pixel). First QNN attach compiles the graph in 5 min 26 s; cached as an EPContext it is
0.8 s.

## Session log

_(empty — implementing agents append here)_

### Phase 00 — poisoned reference

**Nothing under `src/`, `android/`, `scripts/` or `tests/` was changed.** This phase's commit
touches `specs/19-live-hardening/STATUS.md` and `.gitignore` only (`scratch/` was not ignored;
the phase file instructs to add it, so it is added here — see "Discrepancies", D6).

#### How it was measured

Throwaway probe `scratch/probe_f1.py` (gitignored, not a deliverable). It does **not** rewrite
`scripts/sweep_clip_params.py` — it reuses the same driver design (`ClipDriver` +
`_VirtualClock` from `scripts/emit_parity_fixtures.py`, every frame, deterministic) and adds
read-only instrumentation by wrapping bound methods on the tracker instance:
`_compute_evidence` (both raw channels + the fused z), `_apply_vetoes`, `_set_ref` (call site
via `traceback`), `_commit_move`, `_commit_sequence`, and the module function
`_baseline_occlusion_and_shadow`.

```
clip     C:/Users/.../scratchpad/live1.mp4   1080x1920, 30 fps, 1975 frames
corners  [[895.15,328.12],[898.86,1095.04],[113.98,1100.99],[118.45,323.58]]
board    board_size 640, detect_scale 0.5 -> det 320 (40 px/cell), overhang 0.25
tracker  stock TRACK_DEFAULTS, cnn_run=None, live_align=False
```

The run reproduces the pack's baseline state occupancy **exactly** — `occluded` 933,
`waiting` 582, `moving` 238, `move` 222; 907 of 1975 frames with a live occlusion veto — and
the phantom's z-map to two decimals (`f1=15.69 g1=11.07 e2=8.08 d2=7.36 e1=7.29`, best 8.64,
second 5.51). It commits **eight plies**, not ten: `d4 d5 Kd2 Nf6 Nf3 Nc6 Nc3 Ne4+`
(6 commit events; plies 4/5 and 6/7 are pair commits through `_commit_sequence`). See D1.

#### Q1 — What is physically on `f1`?

**A hand.** Not a stale reference, not a shadow, not a nudge, not a board shift.

Images (local only, `scratch/` is gitignored; panels are ref | current | absdiff×3, INFERNO):

| image | what it shows |
|---|---|
| `scratch/cellcmp_ply03_Kd2_f1.png` | ref = clean bishop on the light square f1; **current = an opaque dark object filling the cell with a skin specular highlight**; diff is a solid blob, not a crescent |
| `scratch/cellcmp_ply04_pair_f1.png` | the mirror image one decision later: **ref = the dark object, current = the clean bishop** |
| `scratch/cur_ply03_Kd2.png` | the whole warp at the commit frame — the player's fingers are visible on the near edge over `e1/f1/g1` |
| `scratch/absdiff_ply03_Kd2.png` | one hotspot bottom-centre-right; the rest of the board is flat |
| `scratch/cellcmp_ply01_d4_d2.png`, `..._d4.png` | genuine-move control (`d2d4`): compact piece-shaped diffs |

Against the spec's candidate table:

- **Board/camera shift — excluded.** At the commit frame (f397) only `f1 g1 e1 e2 d1 f2 d2`
  carry z ≥ 3; `a1 = 0.00`, `h1 = 2.15`, `b1 = 1.20`, `c1 = 2.45`, `g8 = 0.00`, `d4 = 1.19`,
  `d5 = 1.13`, `a8/h8 ≈ 0`. No rim of diff anywhere else.
- **Cast shadow — excluded.** `census_transform` is invariant to monotone darkening by
  construction, and the census channel reads `z_census(f1) = 15.69` at that frame. The HSV
  shadow test (`hsv_shadow_squares`) vetoed `f2` and did **not** veto `f1`. The pixels are an
  opaque occluder.
- **Nudged piece — excluded.** The bishop is in the same place before and after (compare
  `cellcmp_ply03_Kd2_f1.png` left panel with `cellcmp_ply04_pair_f1.png` right panel).
- **"Base truth captured while something was on/over f1" — true, but it is the *consequence*,
  not the cause.** At the phantom's own decision frame the reference was CLEAN and the CURRENT
  frame was contaminated. The commit then baked the contaminated frame into the reference
  (`_commit_move` → `_set_ref(cur, cur_bgr, from_commit=True)`, `tracker.py:2695`), which is
  what makes `f1` the loudest square of the *next* decision as well.

**Why nothing vetoed the hand — three gates missed it, measured:**

1. `_baseline_occlusion_and_shadow` is called only from the motion branch of `_loop`
   (`tracker.py:1642`, `self.state not in ("waiting","move")`). The hand goes still at f385
   (motion 0.01–0.15, all below `motion_thr = 0.25`) and stays on the board through f397, so
   from f385 onward the classifier is **not called at all**.
2. On the last frames where it *was* called (f380–f384, state `moving`) its candidate gate is
   `om > abs_thr` with `abs_thr = self.motion_px_thr * 4 = 80.0` (`tracker.py:1645`). Measured
   raw cell means on those frames: `f1` peaks at **62.0**, `e1` 34.3, `e2` 27.9, `g1` 27.6.
   `strong` is **empty on every one of them** → nothing occluded, nothing tainted, nothing
   shadow-classified. The occlusion detector's gate is an absolute 80 grey levels; the move
   scorer's gate is a per-square z that rates the same pixels 15.7. The two are on
   incommensurable scales and there is a wide band (mean absdiff ~20–80) that is "certainly a
   change" to one and "nothing at all" to the other.
3. The grid-line gate (`_occluded_by_grid`, `min_grid_line_coverage = 0.5`) never fired either:
   f385–f397 are all state `waiting`. A hand on the near edge hides too few grid lines.
4. `_apply_vetoes` (step 3, `tracker.py:3227`) runs the HSV shadow test on the detection frame
   but **never runs the opaque-occlusion test** — its comment says "Opaque occlusion lives in
   the taint mechanism", i.e. `occlusion_color_squares` only ever runs inside
   `_baseline_occlusion_and_shadow`, behind gate 1 and gate 2 above.

**And what the phantom was actually built from.** `changed` at f397 was
`{d1, d2, e1, e2, f1, g1}` — 6 squares, exactly `max_changed`; `f2` had been shadow-vetoed, one
more and `_generate_hypothesis` would have returned `too_many_changed`. Of those six, five are
hand contamination. The sixth, `d2` — the square the phantom king "arrived" on — is a
**census-channel artefact**: `z_gray(d2) = 0.80` on a normalized grey diff of 2.44, but
`z_census(d2) = 7.36`. `d2`'s census z had been sitting at 5.7–7.4 on every detection frame
since the ply-1 re-anchor emptied it. So `e1d2` was assembled from a hand (origin) and a stale
census reading (destination): **not one square of its evidence came from a piece that moved.**

#### Q2 — When did `f1` become poisoned?

| frame | t | state | raw diff f1 | z_gray f1 | z_census f1 | z fused | what the tracker did |
|---|---|---|---|---|---|---|---|
| 301 | 10.03 | move | 6.19 | 1.50 | 0.0 | 1.50 | `d5` commits; reference set from a clean board |
| 380–384 | 12.67–12.80 | moving | (raw cell 56.8→57.8) | — | — | — | baseline occlusion runs, `strong` empty |
| 385–395 | 12.83–13.17 | waiting | — | — | — | — | hand motionless; classifier not called |
| **396** | **13.20** | waiting | **54.64** | **15.21** | **17.61** | **17.61** | first detection frame after `motion_hold_s` expires (last motion > thr at f383, t 12.77 + 0.4 = 13.17) |
| 397 | 13.23 | move | 55.09 | 15.34 | 15.69 | 15.69 | **`Kd2` commits → `_set_ref(cur, …, from_commit=True)` bakes the hand in** |
| 398–673 | 13.27–22.43 | waiting | 49.7–55.4 | 13.79–15.41 | 17.6 → 1.14 | 13.79–16.38 | poisoned; 96 detection frames, 9.2 s |
| 674 | 22.47 | move | 53.27 | 14.82 | 1.20 | 14.82 | pair `Nf6+Nf3` commits; reference re-anchored from a clean board |
| 703 | 23.43 | waiting | 2.45 | 0.32 | — | 0.32 | healed |

`z['f1']` rises **at frame 396** and never drops below **13.79** for the 96 detection frames of
the span; the capture site is `MoveTracker._commit_move` → `_set_ref(..., from_commit=True)`
(`src/chesslab/move_tracker/tracker.py:2695`).

**Why it cannot recover on its own — three healing paths, all measured dead:**

- `SquareNoise.update(diffs, exclude=changed|shadow_veto)` uses `alpha = 0` for excluded
  squares (`tracker.py:548`). `f1` is in `changed` on every one of the 96 frames, so its noise
  model is **frozen at `mean = 1.32, std = 3.51` for all 96 frames** (verified: the set of
  distinct `(mean, std)` pairs over the span has size 1). A persistently poisoned square can
  never be learned away in the grey channel.
- The census channel *does* heal — `exclude_alpha_scale = 0.125` slow lane takes
  `z_census(f1)` from 17.61 down to 1.14 over ~6 s — but the fused `z = max(z_gray, w·z_census)`
  stays pinned by the frozen grey channel.
- `_maybe_patch_anomaly` (`tracker.py:3463`) never patched anything **anywhere in the clip** (no
  "Reference pulled forward" note on any frame). Its timer for `f1` starts at the first
  detection frame after the commit (f481, t = 16.03) and `nudge_timeout_s = 5.0` makes it
  eligible at t = 21.03 — which falls inside a motion gap (f562–f658, no detection). The next
  detection frames f659–f672 all have `len(changed)` = 9–10 > `max_changed + 2` = 8, so the
  patcher returns at its guard every time, and the real move commits at f674.

The same "hot for a whole inter-commit span with a frozen noise model" scan over the whole clip
finds this signature only once: span f398–f673, squares `f1, g1, e1, e2, f3` (of which `f1` is
the pure case — nothing ever moved to or from `f1` in the whole game). The other persistently
hot squares later in the clip (`e4` over f1090–f1537, `c3` at f1538) are **genuine** physical
evidence of real moves that the desynced game state could not represent — not poisoning.

#### Q3 — Are origins systematically stronger than destinations?

**No. The premise does not reproduce.** Honest negative result.

Baseline run, z at the decision frame, all 8 committed plies (`Kd2` is the phantom):

| ply | san | origin | sq | z | z_gray | z_census | dest | sq | z | z_gray | z_census | best |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | d4 | d2 | dark | 14.45 | 10.30 | 14.45 | d4 | dark | 12.03 | 12.03 | 6.70 | 20.48 |
| 2 | d5 | d7 | light | 10.06 | 10.06 | 9.83 | d5 | light | **19.04** | 19.04 | 8.00 | 19.06 |
| 3 | *Kd2* | e1 | dark | 7.29 | 7.29 | 7.26 | d2 | dark | 7.36 | **0.80** | **7.36** | 8.64 |
| 4 | Nf6 | g8 | light | 14.66 | 14.66 | 5.46 | f6 | dark | 4.85 | 3.50 | 4.85 | 24.45 |
| 5 | Nf3 | g1 | dark | 9.83 | 9.83 | 1.29 | f3 | light | 7.11 | 7.11 | 1.10 | 24.45 |
| 6 | Nc6 | b8 | dark | 5.59 | 2.35 | 5.59 | c6 | light | **17.92** | 17.92 | 9.45 | 37.65 |
| 7 | Nc3 | b1 | light | 14.07 | 14.07 | 2.45 | c3 | dark | **17.41** | 17.41 | 2.40 | 37.65 |
| 8 | Ne4+ | f6 | dark | 13.32 | 4.23 | 13.32 | e4 | light | **17.07** | 17.07 | 1.23 | 22.32 |

7 genuine plies: **origin > destination in 3, destination > origin in 4**. Median z[origin]
13.32 vs median z[destination] **17.07**; mean 11.71 vs **13.63**. If anything the destination
is the stronger square on this clip.

Corroboration on 11 plies: with the hand vetoed (scratch simulation, below) the clip tracks the
whole real game and gives **6 origin > destination, 5 destination > origin**; median z[origin]
14.45 vs z[destination] 15.80. A coin flip.

**The datum the claim was built on is contaminated.** `entry.md`'s example — "real `Nf3`:
`g1 = 9.8, f3 = 7.1`" — is read off the ply-4/5 pair commit at f674, whose reference is the
hand-poisoned f397 frame. `g1`'s reference cell contains the hand; that number measures the
poisoning, not the move.

Classification of the (non-)effect:

- **(a) geometric — excluded, directly.** Recomputed `per_square_diff` at every commit with
  `extend_up = 0.25` (production) and `extend_up = 0.0`. The origin/destination ratio moves by
  ≤ 0.8 and **no ordering flips**; in 6 of 8 commits removing the overhang moves the ratio in
  the direction *opposite* to what (a) predicts (i.e. the overhang helps the destination, not
  the origin). Raw origin/destination ratios, `ov=.25` → `ov=0`: 0.87→0.78, 0.55→0.53,
  4.64→5.64, 3.07→3.01, 1.29→2.05, 0.20→0.15, 0.83→0.66, 0.31→0.29.
- **(b) photometric — the only surviving structure, and it is weak.** In the baseline run the
  two weakest endpoints of the whole clip are `f6` as a *destination* (4.85) and `b8` as an
  *origin* (5.59) — both **black knight on a dark square**. That says the weakness tracks the
  piece/square pair, not the role of the square in the move. But across the 22 endpoints of the
  11-ply corroboration run a naive same-colour/opposite-colour split shows **no difference**
  (median z 14.59 same vs 15.65 opposite), so the crude albedo rule does not generalise either.
- **(c) one clip's lighting — cannot be excluded.** One recording, one lighting setup, 14–22
  endpoint measurements, two of them against a poisoned reference. There is no second clip in
  this experiment to separate (b) from (c).

**Answer as asked:** (a) is excluded by measurement; the asymmetry the question presupposes is
not there, so (b) vs (c) is a question about a non-effect and **the data cannot distinguish
them**.

#### Recommended fix — STATED, NOT IMPLEMENTED

**File:** `src/chesslab/move_tracker/tracker.py`
**Function:** `MoveTracker._apply_vetoes` (step 3 of `_try_detect`, currently line 3227).

Run the *already existing* opaque-occlusion classifier on the detection frame, over the
z-derived `changed` set, instead of leaving it behind the two gates it can never pass:

```python
occl = occlusion_color_squares(cur_bgr, self._ref_gamut, self._det_size,
                               self.profile.white_pov, changed,
                               thr=self.occlusion_color_thr, extend_up=self.overhang)
# dilate by one orthogonal neighbour, exactly as _baseline_occlusion_and_shadow already does
# (tracker.py:457-462), then z[sq] = 0.0 and self._tainted[sq] = now + motion_hold_s
```

No new threshold, no new default, no change to `config.py`. It closes the specific hole
measured above: the classifier is competent here and is simply never handed the squares that
matter, because its only caller gates on an absolute `motion_px_thr * 4` that a resting hand
does not reach, and is not called at all once the hand stops moving.

**Measured, not assumed — the classifier's verdict on this clip.** Running
`occlusion_color_squares(..., changed, thr=1.5)` on every one of the 484 detection frames (a
read-only wrapper, production behaviour untouched) flags **`f1`, on exactly f396 and f397, and
nothing else in the entire clip**. Zero hits on any of the seven genuine commits:

```
f 104 changed=[d1,d2,d4]                    -> []
f 301 changed=[d2,d5,d6,d7]                 -> []
f 396 changed=[d1,d2,e1,e2,f1,f2,g1]        -> ['f1']     <-- the hand
f 397 changed=[d1,d2,e1,e2,f1,f2,g1]        -> ['f1']
f 674 changed=[e1,e2,f1,f3,f6,g1,g7,g8]     -> []
f1089 changed=[a1,b1,b7,b8,c3,c6,e2,e4]     -> []
f1538 changed=[c3,d5,e4,e6,f6]              -> []
```

**Prediction check (scratch simulation only — nothing under `src/` was modified).** With the
veto simulated inside the probe (`SIM_VETO=1`, monkeypatch on the tracker instance), it fires on
**one frame of the clip** (f396, tainting `{e1, f1, f2, g1}` after dilation) and the tracker then
commits the real game end to end:

```
before: d4 d5 Kd2 Nf6 Nf3 Nc6 Nc3 Ne4+                       (8 plies, 1 phantom)
after : d4 d5 Nf3 Nf6 Nc3 Nc6 e4 dxe4 Nxe4 Nxe4 Bb5          (11 plies, no phantom)
```

This is one clip. It is **not** evidence that the change is safe: the gate for any tracker
behaviour change is `pytest -m clips` at 20/20 plus `ClipReplayParityTest`, plus the mirrored
Kotlin `Vetoes.kt`, and neither was run here (phase 00 must not, and must not touch those
files). Treat the above as "the mechanism is understood and one candidate fix is consistent with
it", not as a validated patch.

Secondary findings worth a decision by whoever implements it:

- `loglik_scores` (`tracker.py:560`) documents itself as a likelihood "relative to the
  hypothesis *no move*" in which "hot untouched squares thus automatically penalize all moves
  that don't explain them". **It does not.** The score is `Σ logit(z)` over
  `move_touched_squares` only; `f1` at z = 15.69 contributed exactly 0 to the phantom's 8.64,
  because no legal move touches `f1`. A residual term (subtract the unexplained hot mass) would
  have rejected `Kd2` at −18. But it would also drop the genuine `Ne4+` from 22.32 to ≈2.3
  against `commit_ll_floor = 2.0` — too close to recommend without the clip suite. Recorded, not
  proposed.
- The docstring's claim should be corrected either way; it is what makes the phantom look
  impossible on a reading of the code.
- Commit-time re-anchoring (`_set_ref(..., from_commit=True)`) is the poisoning vector and its
  own comment already says so. The comment's stated mitigations — `_maybe_patch_anomaly` and CNN
  recovery — are both inoperative here: the patcher never fired once in 1975 frames (guard
  `len(changed) > max_changed + 2`), and `cnn_run` is `None` in the replay. If the taint fix
  lands, this becomes moot for hands; if it does not, the patcher's guard is the next thing to
  look at.

#### Discrepancies against the spec

- **D1 — the committed move list.** `entry.md` and the STATUS baseline table say ten plies,
  `d4 d5 Kd2 Nf6 Nc3 Nc6 e4 dxe4 Nxe4 Nxe4+`. The deterministic replay of `live1.mp4` with the
  corners given in `00-poisoned-reference.md`, `board_size = 640` and stock defaults commits
  **eight**: `d4 d5 Kd2 Nf6 Nf3 Nc6 Nc3 Ne4+`. The frame-level state occupancy matches the pack
  exactly (933/582/238/222, 907 veto frames) and the phantom's z-map matches `entry.md` to two
  decimals, so this is the same run family — but the move list is not reproducible as written.
- **D2 — the per-commit scores in the STATUS baseline table** (22.0 / 24.0 / 8.8 / 23.6 / 24.0 /
  24.0 / 24.0 / 24.0) do not reproduce. Measured: 20.48 / 19.06 / **8.64** / 24.45 / 24.45 /
  37.65 / 37.65 / 22.32. The table's repeated 24.0 is `2 × 12.0`, the per-square logit clip in
  `loglik_scores` — it looks like a run with much larger z values (different `detect_scale`,
  `board_size` or `census_z_weight`). Only the phantom's ≈8.6 matches.
- **D3 — `entry.md`: "Every genuine move scored `best ≥ 22.0` with a second-best margin ≥ 9.3".**
  Measured: `d4` 20.48 (margin 9.58) and `d5` 19.06 (margin **5.76**) are both below. The
  phantom is still by far the weakest commit (8.64 / margin 3.13), but the clean separation the
  sentence claims is not in the data.
- **D4 — "all eight commits".** There are **six** commit events producing eight plies; plies 4/5
  and 6/7 come from `_commit_sequence` (fast-play pair commits). `scripts/sweep_clip_params.py`
  reports these twice with an identical z-map because it iterates the growth of
  `board.move_stack`, which is what makes them read as eight separate decisions.
- **D5 — `00-poisoned-reference.md` §Q1 says to dump `mt.ref_gray` "at the frame where `Kd2`
  commits".** `_commit_move` calls `_set_ref` *inside* the commit, so reading `mt.ref_gray` after
  the frame step yields the already-poisoned post-commit reference. It has to be snapshotted at
  the top of `_commit_move` (the probe wraps the bound method). Likewise `mt._last_cur` is
  identical to the `cur` argument at that point.
- **D6 — `scratch/` was not gitignored.** Added to `.gitignore` in this phase's commit, as the
  phase file instructs.
- No blockers. The clip and its corners were both on disk as described.

### Phase 01 — CNN runtime

Commits: `0e7197e` (session config), `3aee855` (profiling), `928a55c` (XNNPACK), this one.

**Steady-state on device: NOT MEASURED. No phone was attached (`adb devices` empty for the
whole phase).** `CnnObserver.logObservation` still emits `CNN observation N ms for 64 crops =
P prep + S session` once a second, and `verify()` now logs a warm-up figure that is not a
profiled batch, so the number is one `adb logcat -s chesslabCnn` away. Deliberately left
blank: a desktop x86 figure for an ARM phone is not a substitute, and this repo has been
burned by exactly that.

#### 1. Session configuration (`OrtSessionRunner.kt`)

The session was `OrtSession.SessionOptions()` and nothing else. Now `SessionTuning` holds the
three values and `applyTo` is the only place they reach ORT: `ALL_OPT`, `SEQUENTIAL`,
`setIntraOpNumThreads(4)` (the SM8650's big cores). `SessionOptions` is write-only — there is
no getter for a thread count or an optimisation level — so, as the spec anticipated, the test
asserts on `SessionTuning` and additionally that the real `SessionOptions` accepts it.
`Ep.CPU` stays a no-op branch on purpose: with XNNPACK sitting above it, CPU is now genuinely
"ORT's own kernels, nothing appended", which is what makes an explicit CPU request a usable
diagnostic.

#### 2. Profiling (`OrtSessionRunner.kt`, `OnnxSquareClassifier.kt`)

`enableProfiling` was unconditional at construction; it is now behind `profile: Boolean =
false` and the attach path is the only caller that passes `true`. `EpVerdict` and the whole
verified-backend machinery are untouched.

`verify()` now runs **two** batches. The first is profiled and produces the verdict; the
second runs after `profiledProvider()` has ended profiling and is the one that is timed. That
is the actual defect behind "every timing on record is a cold batch": the 97 ms figure was one
cold batch with per-kernel tracing across 473 nodes. Cost: one extra 64-crop batch per attach,
once.

**Mutation check (required by the spec): yes, red first.** With the conditional reverted to
the pre-fix unconditional `enableProfiling`, `:app:testDebugUnitTest --tests
"*OrtSessionRunnerTest*"` gave `profilingIsOffForAnObservationSession FAILED,
org.opentest4j.AssertionFailedError at OrtSessionRunnerTest.kt:65` (4 tests, 1 failed) — the
unprofiled session returned `CPUExecutionProvider`, i.e. it had a trace. With the conditional
in place it passes.

#### 3. XNNPACK — **option 2 taken: the QNN dependency is gone**

Measured at the ELF level over `jni/arm64-v8a/libonnxruntime.so` of each AAR (byte-scan for
`xnn_`, `ANeuralNetworks`, `XnnpackExecutionProvider`):

| AAR | `xnn_` | `ANeuralNetworks` | size |
|---|---|---|---|
| `onnxruntime-android-qnn` 1.21.1 (was shipped) | **0** | **0** | 17.8 MB |
| `onnxruntime-android` 1.21.1 (now shipped) | 25 | 90 | 17.9 MB |
| `onnxruntime` 1.21.1 (desktop JVM, win-x64) | 0 | — | 13.0 MB |

Option 1 is therefore not merely unattractive, it is impossible: the symbols are not in the
QNN binary, so a QNN-EP session cannot also `addXnnpack`. Same ORT version on both sides, so
no version bump.

**What it costs.** The app loses the QNN EP entirely. On a device where QNN would work it now
runs the CPU/XNNPACK path instead — `addQnn` throws `OrtException` inside `EpAttempts.open`'s
`runCatching`, which warns and falls through, the path that already existed for an EP that
cannot build. Concretely on this SoC that is not a loss: QNN measured **227 ms** against the
CPU's 97 ms, because the HTP cannot execute the 46 `InstanceNormalization` blocks and
partitions around them (phase 04's root cause, not this phase's).

**What it gains besides XNNPACK.** NNAPI comes back into the binary — with the QNN AAR the
`Ep.NNAPI` rung could never have built either, which nothing had noticed. And the transitive
`com.qualcomm.qti:qnn-runtime:2.31.0` goes away: 84.7 MB of arm64 payload after the excludes
that `app/build.gradle.kts` used to carry (`libQnnHtpPrepare.so` 55.1 MB, `libQnnHtpV75Skel.so`
13.3 MB, `libQnnHtpV79Skel.so` 13.2 MB, `libQnnHtp.so` 2.1 MB, `libQnnSystem.so` 0.3 MB). With
`useLegacyPackaging = true` those are extracted to disk on install, so it is real device
storage, not just download size.

Chain is now `QNN -> NNAPI -> XNNPACK -> CPU` (enum declaration order). `EpRequest` is
unchanged (`settings/` is outside this phase's scope), so `EpRequest.CPU` still means pure CPU
with nothing appended — the diagnostic still works — and AUTO picks up XNNPACK. Adding an
explicit `EpRequest.XNNPACK` would need `settings/` plus 07b's UI.

**One deliberate `EpVerdict` change.** XNNPACK implements none of the InstanceNormalization
blocks and hands them back to the CPU EP, so `dominantProvider` will very likely name
`CPUExecutionProvider` for a perfectly good XNNPACK session. Left alone, `EpAttempts` would
have seen `contradicted` and thrown the session away — the exact opposite of the intent. So
`contradicted` now excludes `requested == XNNPACK && ran == CPU`, and only that pair; an NPU
that never ran is still a contradiction. The reported label still states what actually
dominated (so the debug screen may read "CPU" for an XNNPACK session — honest, if terse).

#### Discrepancies against the spec

- **D01-1.** The spec's step 3 lists `libs.versions.toml`, `app/build.gradle.kts` and
  `OnnxSquareClassifier.kt`. `cnn/EpProfile.kt` also had to change (the `Ep.XNNPACK` provider
  mapping and the contradiction rule above). It is inside the phase's declared directory scope
  (`cnn/**`), just not named in the step.
- **D01-2.** The batch dimension the spec asks to check is **already fixed** — the bundled
  `config.json`/graph is `[64,3,128,128]` per commit `4df4ade`. No asset was touched.
- **D01-3.** `ChesslabApp.kt` still sets `ADSP_LIBRARY_PATH` for the Hexagon skeleton, which is
  now pointing at a library that is no longer packaged. It is wrapped in `runCatching` and only
  logs, so it is inert, but it is dead code and it is outside this phase's scope
  (`tracker/cnn/**`). Left in place — it is what a QNN-capable build would need back.
- **D01-4.** Test count grew beyond the three the spec names: existing tests that pinned the
  old 3-EP chain had to move (`EpRequestChainTest`, `EpProfileTest`,
  `OnnxSquareClassifierContractTest`). The contract test's "QNN and NNAPI must warn" assertion
  is now derived from `epChain(...).size - 1` rather than the literal 2, so it does not need
  touching again the next time the chain changes.

#### Open question, not answered here

ORT's own XNNPACK guidance suggests pairing the XNNPACK EP with `intra_op_num_threads = 1` on
the session and `session.intra_op.allow_spinning = 0`, because XNNPACK brings its own pool.
This graph is mostly operators XNNPACK does NOT take, so the ORT CPU-EP pool still does most
of the work and starving it looked like the worse trade. Both pools are set to 4. **Untested —
it needs a device**, and it is a one-line change in `OrtSessionRunner.options()` if the warm
number disappoints.

#### Gate

Tests: `:app:testDebugUnitTest --tests "*.cnn.*"` — **41 tests, 0 failures** (8 classes).
`:app:ktlintCheck` and `:app:detekt` — clean, no new findings, no `@Suppress` and no baseline
entry added.

Run in an **isolated `git worktree` at my own commit**, not in the shared tree: phase 03's
in-flight `app/src/test/.../record/SessionCaptureTest.kt` had an unresolved reference
(`failedWrites`) and `:app:compileDebugUnitTestKotlin` could not build. No file outside this
phase was edited to go green. `assembleDebug` was **not** run (spec forbids it) — the AAR swap
is therefore verified by dependency resolution and unit tests only; the orchestrator's merged
gate is what will link it.

### Phase 02 — frame allocations

Commits on `spec-19-live-hardening`: `2a339c3` (ring), `966b7ec` (avgFrames), `cf4d4fa`
(scratch), `0465296` (detSize test), plus this entry. **Step 2 produced no commit — see below.**

**`ClipReplayParityTest`: 18/18 clips, 969 frames, zero divergence.** Run once, targeted, at the
end. `ktlintCheck` and `detekt` clean for `:core-engine`, `:core-geometry` and `:app`; no
`@Suppress` and no baseline entry was added.

#### Step 1 — the per-frame byte arrays

`pipeline/PlaneRing.kt` (new) + `pipeline/BoardWarps.kt` + `geometry/Warp.kt`.

`toGrayImage`/`toBgrImage` now take an optional destination — the same shape the two warps
already had with `dst: Mat?`. The ring stays in `:app`, as the phase requires. Depth is
`max(avgFrames(cnnOn = true), avgFrames(cnnOn = false)) + 3`, **derived, not a fixed 5**:
`avgFramesOverride` is a live knob (`ConfigKnobs.kt`, range 1..10), so a constant would be right
only for the defaults.

The tight bound is `window + 1`, and it is worth writing down because it is tight for two
reasons at once. When the ring hands out the plane for frame `N` the engine still holds
`N-1 .. N-window` (the running mean's deque, whose newest element is also `prevGray`), **and**
`PlaneMean.append` reads the evicted plane `N-window` in the same pass as the new one, so those
two must be different arrays as well. The three extra slots are headroom for the window moving
before the ring is told (a settings change, a CNN attach).

**D02-1 — the spec's bounded set is incomplete, and this is the trap the phase warned about in a
place the phase did not look.** `02-frame-allocations.md` names `avgFrames` per running mean +
`prevGray` + `lastCur`/`lastCurBgr`. Two corrections:

- `lastCur`/`lastCurBgr` are **means**, not input planes — they never come from the ring at all,
  so they do not need slots.
- The set is missing an **unbounded** holder. `FramePipeline.emit` hands the very same
  `grayDet`/`bgrDet` seam planes to `CropFrameStore.Pending` whenever the observer asked for a
  frame. `Pending` crosses to the observer thread (`service/CnnCropAdapter.kt:40`), becomes
  `CnnSnapshot.gray`/`.warped`, is held by `state.cnnSnap` for seconds, and on a CNN recovery
  commit `CnnTick.kt:259` → `anchorAtDetSize` adopts it as `refGray`/`refBgr` — i.e. forever.
  No ring depth covers that.

  Fix: `CameraStages.updateCropFrame` **copies** both planes. It costs one 2.5 MB copy on the
  frames the observer asked for (a few per second at most), on the same line as the
  full-resolution bordered warp that frame is already paying for; every other frame copies
  nothing. The acceptance grep still holds — there is no `ByteArray(` on the per-frame path in
  `pipeline/` outside the ring.

Nothing else in `:app` holds a seam plane across frames: `record/**` and `games/**` never see
`GrayImage`/`BgrImage` (grepped), and `EngineHost.tick` passes the `FrameInput` straight into the
engine without retaining it.

**Red-first proof.** `FrameLoopTest.theBufferRingNeverHandsBackAPlaneTheRunningMeanStillHolds`
pushes 20 frames through a ring of the real shape into a `RunningMeanGray` and compares against
an independently stacked mean. It asserts three things: depth `window + 3` is right, depth
`window + 1` is where it becomes right, and **depth 1 is wrong**. Mutation check: forcing the
first call to depth 1 turns the test red (`AssertionFailedError at FrameLoopTest.kt:340`) — and
red is the only signal there is, because a single shared buffer does not throw, it silently
converges the mean on the newest frame.

`app` side: `PlaneRingTest` (4 tests) pins the derived depth, the cycle, plane-size replacement
and that a resize never re-hands an old slot.

#### Step 2 — the BGR running mean: MEASURED, NO SAFE CHANGE FOUND

**Lazy evaluation was rejected on evidence, before it was written.** The phase's precondition was
"if it is only read on a `Detect` outcome". It is not. `curBgr` is read on essentially every
stable frame:

| consumer | when |
|---|---|
| `TrackerEngine.quietOutcome` → `setRef(cur, curBgr)` | the quiet re-anchor — the common case on a still board |
| `Vetoes.applyVetoes(cur, curBgr, hot)` | every detect frame with a hot square |
| `generateHypothesis` / `dispatch` / `commitMove` | every candidate |
| `FrameLoop.stableMeans` → `state.lastCurBgr` | unconditional; `CnnTick.kt:259` reads it later as the fallback commit anchor |

The only frames where the mean is computed and not consumed are the one or two settle frames
after each motion burst, where `grayBuf` is full but `ready` is still false. Deferring
`lastCurBgr` would change what a later `CnnTick` anchors on. Parity outranks speed — abandoned.

**Two rewrites of `PlaneMean` were implemented and measured. Both are slower. Both reverted.**
Measurements are desktop-JVM medians (`EngineProfileTest`, 800×800 = the phone's real detection
plane, 41 reps after 30 warmups) and end-to-end engine time over the 18 committed clips
(`ClipReplayTimingTest`, 969 frames at the fixtures' detSize 320 — this is the `ENGINE` stage, in
the only place it can be measured off-device; `StageTimings` itself lives in `:app` and needs
`android.util.Log`).

| `PlaneMean` variant | gray append | gray mean | **bgr append** | **bgr mean** | clip replay / frame |
|---|---|---|---|---|---|
| **committed (IntArray accumulator)** | 0.220 | 0.166 | **0.562** | **0.519** | **1.302 ms** |
| no accumulator, sum the window in `mean()` | 0.000 | 0.990 | **0.000** | **3.006** | 1.569 ms |
| `ShortArray` accumulator (halves it to 3.8 MB) | 0.255 | 0.141 | **0.762** | **0.475** | 1.301 ms |

The memory-traffic argument for dropping the accumulator is correct and irrelevant: summing the
window moves ~7.7 MB against ~29 MB per stable frame, and is still **2.8× slower** on the BGR
plane. The incremental loops (`sum[i] += a[i] - b[i]`, two arrays in, one out) vectorise; a
per-byte gather across n plane pointers does not. `ShortArray` bought 0.044 ms on `mean` and lost
0.200 ms on `append` — the Short round-trip defeats the same vectorisation — and moved the
end-to-end number by 0.001 ms, i.e. not at all.

**After the phase's other four steps: 1.277 ms/frame** (vs 1.302 before), same
`RunningMeanBgr` numbers (append 0.618, mean 0.507). That difference is noise; the honest
statement is that phase 02 did not move the engine hot path and did not intend to — the ring
removes 77 MB/s of allocation on the **app** side, which is where the garbage was.

Context for whoever picks this up next: the two running means together are ~1.5 ms of a detect
frame at 800×800. `censusTransform` (1.85), `bgrToLab` (2.45, gamut rebuild only) and
`perSquareCensusChange (+codes)` (1.00) are all larger. The running mean is not where the 27–35 ms
lives.

#### Step 3 — `avgFrames` on the CNN attach

`EngineState.kt`, `api/TrackerEngine.kt`, `EngineStateBuffersTest.kt` (new; named so the phase's
`--tests "*EngineState*"` picks it up).

The reported bug is real, and there is a **second spelling of it in `updateConfig`** that the
phase did not name: it compared `config.avgFrames(cnnOn)` against `previous.avgFrames(cnnOn)`
with the NEW `cnnOn` on both sides. With no override, `avgFrames` depends only on `cnnOn`, so the
two sides cancel exactly when the config change is the one that moves the window — switching
`cnnVerify` off left the buffers on the with-CNN window forever.

`EngineState` now tracks `avgWindow` (what the buffers are actually sized for) and
`syncAvgWindow()` reconciles it against `avgFrames`. Called from all three paths that can flip
`cnnOn`: `attachCnn`, `updateConfig`, and once per `onFrame` — the third is for `cnnFailed`,
which the verify path raises mid-game and which neither call site can observe. A window that did
not move costs one integer comparison and drops nothing.

`cnnRun`/`cnnFailed` were moved up to the frame-loop section of `EngineState`, because they are
two of the three inputs to `cnnOn` and the buffers below cannot be sized from a field declared
later (JVM initialisation order). A pointer comment is left at their old home.

Acceptance grep: `avgFrames(cnnOn = false)` no longer appears in the buffer construction. It
still appears twice for `confirmer`/`recoveryConfirmer`, which are out of this phase's scope and
have the same latent defect — **left for a later decision, see below.**

Mutation check: removing `syncAvgWindow()` from `attachCnn` and `updateConfig` turns
`avgFramesFollowsTheCnnAttach` and `avgFramesFollowsCnnVerifyBeingSwitchedOff` red.

#### Step 4 — the file-scope scratch

`BaselineOcclusion.kt`, `Vetoes.kt`, `Commit.kt` — all 11 file-scope buffers found by
`grep "^private va[lr] .*Array("` over `:core-engine/src/main` are exactly the three sites the
phase names. All were **moved onto the instance**; none was left with a "why file scope is
correct" comment, because none of them was.

Three small types (`BaselineScratch`, `ShadowVetoScratch`, `GamutScratch`), one per concern, held
by `EngineState` next to the evidence arrays whose KDoc already promised this policy ("owned per
engine so two engines can never alias each other").

**D02-2 — a linter shaped one signature, and it is the good shape anyway.**
`baselineOcclusionAndShadow` is a top-level function with seven parameters; detekt's
`LongParameterList` threshold is 8, so a scratch parameter would have tripped it and demanded a
parameter object that means nothing. It takes `BaselineScratch` as its **receiver** instead —
which also reads better, since the scratch is the thing that owns the call's working memory. Six
test call sites updated to `BaselineScratch().baselineOcclusionAndShadow(...)`; `EngineProfileTest`
hoists one instance out of the timing loop.

No behaviour change: every buffer was already fully consumed inside a single call. Parity
confirms it.

#### Step 5 — the `detSize` guard

`FrameLoopTest.aDetectionPlaneThatDisagreesWithTheBoxesIsRefused`. Asserts the message names
**both** sizes — that is the guard's entire purpose, to say which of the two `detSize` producers
is off — and that `frameSeq` was not advanced before it fired. Mutation check: relaxing the
`require` to `require(true)` turns it red.

#### Tests run (once each, targeted, as the phase names them)

- `:core-engine:test --tests "*FrameLoop*" --tests "*EngineState*"` → 21 tests, 0 failures
- `:app:testDebugUnitTest --tests "*pipeline*"` → 36 tests, 0 failures (`PlaneRingTest` 4)
- `:core-engine:test --tests "*ClipReplayParityTest*"` → **18/18, zero divergence**
- `EngineProfileTest` / `ClipReplayTimingTest` under `-Pchesslab.profile=true` for the numbers
  above. They assert nothing.

`assembleDebug` and the full test task were **not** run, per the memory-constraint contract.

#### Discrepancies against the spec

- **D02-1** — the bounded set in `02-frame-allocations.md` §1 is wrong in both directions:
  `lastCur`/`lastCurBgr` are means and need no slots, and the CNN crop hand-off is an unbounded
  holder the spec does not mention. See Step 1.
- **D02-2** — detekt's `LongParameterList` forced `baselineOcclusionAndShadow` into receiver form.
  Surfaced as the entry file asks; no parameter object was invented.
- **D02-3** — the spec's line anchors are accurate: `EngineState.kt:94-95`, `Vetoes.kt:10-12`,
  `Commit.kt:63-65`, `BaselineOcclusion.kt:58-63`, `FrameLoop.kt:206-215` (the load-bearing double
  clear, untouched) all matched.
- **D02-4** — the phase asks for `ENGINE`-stage timings from `StageTimings`. `StageTimings` is
  `:app`-only and imports `android.util.Log`, so it cannot run on the desktop clip replay at all.
  `ClipReplayTimingTest` times exactly what the `ENGINE` stage times (`TrackerEngine.onFrame` over
  the same 969 frames) and is what the numbers above come from.

#### Left for a later decision (NOT changed — out of this phase's scope)

- **`confirmer`/`recoveryConfirmer` have the identical defect.** `EngineState.kt` builds both with
  `config.confirmFrames(cnnOn = false)` = 2, and `updateConfig` rebuilds them with the same
  cancelling comparison Step 3 fixed for `avgFrames`. So `confirmFrames` stays at the without-CNN
  value (2) after the CNN attaches, where the live gate (`commitGates` → `state.confirmFrames`)
  reads 1. Unlike the buffers, rebuilding a `Confirmer` **resets its vote count**, so
  reconciling it per frame is a behaviour change on the commit path and needs the clip suite —
  which is a decision for the user, not a drive-by fix.
- **The mean output still allocates.** `PlaneMean.mean()` allocates a fresh 1.92 MB `ByteArray`
  per stable frame and cannot be ringed: the result becomes `refGray`/`refBgr` and
  `PendingVerify.cur/curBgr`, whose lifetime is unbounded. Same invariant 14, other end.

### Phase 03 — recording

#### Step A — what is on disk: NOT AVAILABLE

`adb devices` (and `adb devices -l` after `adb start-server`) returns an empty list — **no phone
is attached to this machine**. The two directories named in `03-recording.md` could not be
pulled, so nothing below rests on them. Everything here is derived from the write path itself
and is provable by unit test on the desktop JVM.

The one thing the spec's directory listing does constrain: `SessionRecorder.<init>`
(`SessionRecorder.kt:75-79`) creates `frames/`, an EMPTY `log.jsonl` and a complete
`session.yaml` before any capture. So a session directory containing `frames/` and a **zero-byte**
`log.jsonl` is producible (see D3 below); a directory with **no** `log.jsonl` file at all is not
producible by any code in `record/`. Either `20260726-171119`'s `log.jsonl` is a zero-byte file
that read as absent in the `ls -R`, or it was not written by this app.

#### Step B — the write path, and what is wrong with it

Six defects, ordered by how much recorded data each one costs.

**D1 — `SequenceCommitted` is dropped by the recorder's driver. `games/GameSessionController.kt:53-59`.**

```kotlin
when (event) {
    is TrackerEvent.MoveCommitted -> onCommitted(event, status)
    is TrackerEvent.ReAnchored -> capture.flush()
    else -> Unit                     // <- SequenceCommitted lands here
}
```

The engine commits plies through **two** events. `TrackerEvent.SequenceCommitted` is emitted by
`Commit.kt:165` (`commitSequence`, decider `diff_pair` — fast play: half-move + reply) and by
`CnnTick.kt:252` (decider `cnn_recovery`). The engine queues a session photo for both
(`Commit.kt:158`, `CnnTick.kt:223`). The app's `GameSessionController` handles only
`MoveCommitted`, so every pair commit and every CNN recovery produces **no `log.jsonl` entry, no
JPEG, and no move in the saved game/PGN**.

This is the single defect with independent corroboration in the tree: **five other consumers of
the same event bus handle `SequenceCommitted`** — `TrackerService.kt:296` (the notification move
counter), `ui/tracking/MoveList.kt:48`, `spectate/SpectatorController.kt:92`,
`speech/MoveAnnouncer.kt:47`, `ui/tracking/StatusUiModel.kt:60`. The recorder's driver is the only
one that does not. The user-visible shape of that is exactly the report: the move list and the
notification count more moves than the game the app saves and than the session it recorded.

**D2 — the deferred photo is taken while a hand is still over the board.
`games/GameSessionController.kt:57`.**

`capture.flush()` runs on *every* `ReAnchored`. Python flushes only when the occlusion set is
empty — `tracker.py:3085-3086`:

```python
self._set_ref(cur, cur_bgr)
if not occluded_set:
    self._flush_session_capture()
```

Kotlin's engine emits `ReAnchored` unconditionally (`TrackerEngine.kt:414`) and the app applies no
occlusion check at the flush site, even though `TrackerStatus.occlusionVetoed` is right there and
is already used for the `clean` decision at `GameSessionController.kt:93`. A frame taken with a
hand over the board is a frame whose 64 crops are labeled as pieces that cannot be seen — the
exact poisoning the deferral exists to prevent, and it is invisible until someone runs
`chesslab slice` weeks later.

**D3 — a cap-blocked start leaves an empty session directory behind. `record/SessionCapture.kt:106`.**

```kotlin
val active = (recorder ?: startRecorder(frame))?.takeUnless(::capReached) ?: return null
```

`startRecorder` → `open(frame)` → `openRecorder` (`service/GameSessionWiring.kt:117-125`) runs
`SessionStore.create(id)` and `SessionRecorder.<init>`, which writes `frames/`, `log.jsonl` and
`session.yaml` to disk — **before** `capReached` is evaluated. When
`existingBytes() >= capBytes` (default 1 GB, `RecordingSettings.kt:8`), the directory is created,
immediately abandoned, and then counts against the next `totalBytes()`. It is the only path in the
app that produces a session directory with a zero-byte `log.jsonl` and no frames.

**D4 — a failed frame write is swallowed whole. `record/SessionRecorder.kt:90`.**

```kotlin
val written = runCatching { writer.write(File(dir, rel)) }.getOrDefault(0L)
if (written <= 0L) return null
```

No counter, no reason, no log. Python's equivalent logs (`tracker.py:2878-2879`:
`log.warning("session record capture failed: %s", e)`). `SessionCapture.kt:107` has already
cleared `pending` by then (this ordering matches Python `tracker.py:2874` and is left alone), so
the photo is neither written nor retried — and `SessionCaptureController.reason` stays `null`, so
the UI goes on showing a healthy recording session. This is literally the mechanism by which
"recording doesn't work well" is all the user could say.

**D5 — `RecordingGates.reason` is never cleared. `record/RecordingGates.kt:64-85`.**

`geometrySuspends` and `inventorySkips` set `reason`; nothing ever resets it. `SessionCapture.kt:70`
(`reason = stoppedReason ?: gates.reason`) therefore reports a stale skip forever after a single
transient geometry blip, which makes the one diagnostic the UI does show (`GamesScreen.kt:132`)
untrustworthy.

**D6 — nothing anywhere reports frames written. `games/GameSessionController.kt:10-15`.**

`GameSessionState` carries `recordingSessionId` and `recordingReason` but no count.
`ui/games/RecordingPanel.kt` shows only the on-disk total from a snapshot refreshed on screen
entry (`GamesViewModel.kt:43-46`). A recorder that has written zero frames for ten minutes is
indistinguishable from one that is working.

#### Step B — the questions the spec asked, answered

- **What triggers a capture?** A committed move → `GameSessionController.onCommitted` →
  `SessionCaptureController.queue`. Written immediately when the board is clean, otherwise
  deferred to the next `ReAnchored`. Not a timer. The gate is not "rarely true" — but see D1
  (a whole event class never reaches it) and D3/D4 (two silent declines).
- **Which thread writes?** Not the analyzer thread. `attachGameSession`
  (`GameSessionWiring.kt:86-92`) collects on the service's `lifecycleScope`; the JPEG encode is in
  `LiveCaptureSource.grab()` on that same collector. Correct as designed — no change needed.
- **Service death?** `TrackerService.onDestroy:180` calls `games.endAndSave()`. Nothing is lost on
  a hard kill either: `log.jsonl` is appended per capture (`SessionRecorder.kt:95`) and
  `session.yaml` is written in `<init>`; `finish()` only rewrites the yaml. A killed session is
  truncated, never corrupt.
- **Is `auto_record` leaking sessions (MEMORY `auto-record-session-leak`)?** No. A recorder is
  opened only from `startRecorder` (`SessionCapture.kt:124-127`), which requires `prefs().enabled`,
  and only on the first actual capture. `GameSessionDriverTest` already pins that a start/stop
  cycle with the shipped default (recording off) writes nothing. The Android equivalent of the
  Python leak does not exist. **Negative result, confirmed.**

#### Observations recorded but NOT acted on (out of phase-03 scope)

- `EngineState.pendingCapture` is dead state in the Kotlin port: `flushSessionCapture()`'s return
  value is discarded at `TrackerEngine.kt:413` and `Commit.kt:237`, and `:app` keeps its own copy
  in `SessionCaptureController`. Faithful-port artefact; `:core-engine` is phase 02's / frozen.
- Related divergence in the same dead code: `Commit.kt:237` and `TrackerEngine.kt:413` gate on
  `tainted`, where Python gates on `_motion_occluded_squares` / `occluded_set`
  (`tracker.py:2853`, `3086`). No behaviour today because the value is dropped; a latent trap for
  whoever revives it.
- `existingBytes` (`GameSessionWiring.kt:105`) is snapshotted once at service start, so deleting
  sessions does not lift the size cap until the service is restarted.
- **Cannot be determined without the device:** which decline path (D3, a geometry suspension from
  a profile calibrated at a different resolution than the camera now delivers, or the size cap)
  produced the two specific directories. All three are silent today, which is why D4/D5/D6 are
  fixed rather than guessed between.

#### Step C/D — result

Commits on `spec-19-live-hardening`:

| Commit | What |
|---|---|
| `490ff89` | `docs(specs): 19 phase 03 — what the recorder actually does` (diagnosis, before the fix) |
| `ccce33d` | `fix(android-record): record the plies a SequenceCommitted carries, and stop losing frames silently` (D1–D5) |
| `a164c05` | `feat(android-record): surface frames written and the last recorder error` (D6) |

What changed, per defect:

- **D1** `GameSessionController.onEvent` now routes `SequenceCommitted` into the same
  `onCommitted` as `MoveCommitted`. `LiveGame.onCommitted` takes `(ucis, sans, fenAfter, ts,
  decision)`; a sequence's intermediate positions are replayed with chesslib (already a `games/`
  dependency) because the event carries only the final FEN and `LiveGame.onFen` compares against
  the intermediate one to spot an undo. Provenance rides on the LAST ply, matching
  `Commit.kt:157`. **One photo per commit, not per ply** — that is what `queueSessionCapture(sans.last())`
  does, so a pair yields two moves and one frame.
- **D2** the `ReAnchored` flush is gated on `isClean(status)` — the same predicate the commit path
  already used, extracted so both sites share it.
- **D3** `capReached()` is evaluated **before** the recorder is opened and no longer takes the
  recorder as a parameter, so a cap-blocked start opens nothing and writes nothing.
- **D4** `SessionRecorder.capture` deletes the partial file, and `SessionCaptureController`
  counts the failure (`failedWrites`) and reports it through `reason`.
- **D5** `RecordingGates.blocks` clears `reason` before re-evaluating, so a skip stops being
  reported once it no longer applies.
- **D6** `GameSessionState.recordedFrames`; `RecordingPanel` gained a live line
  ("Recording <id> · N frames written", or the reason in `Danger`). Its on-disk-total line moved
  from `Accent` to `OnSurfaceMuted` so the live line is the one that reads as current.

**Mutation check.** All six new tests were run against the unfixed code first and **all six
failed on assertions, not on symbols** (the one new API, `failedWrites`, was added as a bare
declaration for that run so the failure would be behavioural):

```
GameSessionControllerTest > aFastPlayPairIsRecordedAsTwoMovesAndOnePhoto()        FAILED  :147
GameSessionControllerTest > anUndoAfterAPairDropsOnlyItsLastPly()                 FAILED  :162
GameSessionControllerTest > aReAnchorWithSquaresStillOccludedDoesNotTakeThePhoto() FAILED :180
SessionCaptureTest        > aCapBlockedStartCreatesNoSessionDirectory()           FAILED  :153
SessionCaptureTest        > aFailedFrameWriteIsReported()                         FAILED  :168
SessionCaptureTest        > theSkipReasonClearsWhenTheGateOpensAgain()            FAILED  :187
56 tests completed, 6 failed
```

After the fix: `GameSessionControllerTest` 7/7, `SessionCaptureTest` 13/13, `SessionRecorderTest`
5/5, `RecordingGatesTest` 6/6, `GameSessionDriverTest` 3/3, `GameStoreTest` 5/5,
`SessionExporterTest` 2/2 — 0 failures. `:app:ktlintCheck` and `:app:detekt` clean.

**Negative results, recorded as such:**

- `aFinishedSessionHasOneLogLinePerFrameFile` — the acceptance criterion "as many `frames/*.jpg`
  as `log.jsonl` entries" was **already true** and passed on the first, unfixed run.
  `SessionRecorder` writes the frame and its log line together and `undoLast` removes both; that
  invariant was never the problem. The test is kept as a regression pin, not as a fix.
- **Threading was not the problem.** The write path is already off the analyzer thread
  (`GameSessionWiring.kt:86-92`). No test was written for it and nothing was changed.
- **No `auto_record` leak on Android.** The Python defect in MEMORY `auto-record-session-leak` has
  no Android equivalent; `GameSessionDriverTest` already pinned it.
- Whether these six defects are *the* mechanism behind the two directories on the phone is
  **unproven** — see Step A. D1 and D2 lose data on every affected commit and are certain; D3–D5
  are the reason nobody could tell which decline fired.

#### Discrepancies against the spec

- **`03-recording.md` Step A assumes a device.** None was attached. Step A was answered from the
  code instead; the ONE-frame and missing-`log.jsonl` shapes were reasoned about, not measured.
- **`ui/games/**` is in no phase's row of the ownership registry**, but `03-recording.md` names
  `ui/games/RecordingPanel.kt` as the surface for Step D. Changing its signature forced one line
  in `ui/games/GamesScreen.kt:88` (its only call site). Both are in commit `a164c05`.
- **`03-recording.md` Step C's ranked guesses were all wrong in detail.** "The capture gate never
  opens" and "frames written but the manifest is not" describe neither D1 nor D2. The evidence
  pointed at an entire event class the driver ignored — a gap in the *port*, not in the gate.
- `03-recording.md` line 41 lists `record/RecordingGates.kt` etc. by name; all exist. Line
  numbers in the original spec were not used.
- **Detekt shaped one line:** `SessionCaptureController.capture` hit `ReturnCount` (limit 3) with
  the natural four-guard form, so the cap guard is written as
  `val active = if (capReached()) null else (recorder ?: startRecorder(frame))`. Slightly less
  direct than four early returns; no wrapper type was invented.

#### Left for the user to decide (not changed)

- `existingBytes` (`service/GameSessionWiring.kt:105`) is snapshotted once at service start, so
  deleting sessions does not lift the size cap until the service restarts. Fixing it means walking
  the sessions tree from the capture path or invalidating the snapshot from the games screen —
  a design call, not a bug fix.
- `EngineState.pendingCapture` is dead state in the Kotlin port (`TrackerEngine.kt:413`,
  `Commit.kt:237` discard `flushSessionCapture()`'s value), and gates on `tainted` where Python
  gates on the occlusion set. `:core-engine` is frozen for this pack.

### Phase 04 — CNN activations

Commits: `e71d0c7` (model fix), `e9a3418` (tests), this one. Scope kept to
`src/chesslab/training/model.py` + `tests/test_training.py`; nothing under `android/` was
touched (the shipped `model.onnx` was only *read*).

#### Shape chosen: **(a) `nn.Sequential(GroupNorm, drop, act)`**

`_gn_replacement(bn)` builds the GroupNorm and appends whatever the replaced module did
*after* normalising. A plain `nn.BatchNorm2d` has neither `.drop` nor `.act`, so it is
still replaced one-for-one — that path is unchanged and pinned by its own test.

(b) was considered and rejected: timm's `BatchNormAct2d.forward` calls `F.batch_norm`
directly, so "mutate in place" means either a `__class__` swap or a forward monkey-patch.
That is clever where (a) is obvious. It has exactly one advantage — see the checkpoint
consequence below — and it buys it by making a real behaviour change silent.

#### Before / after

`mobilenetv4_conv_small_035` (the shipped backbone), `num_classes=0`, 46 `BatchNormAct2d`
(30 with a `ReLU`, 16 with an `Identity`):

| | `nn.ReLU` after conversion | ONNX `Relu` nodes |
|---|---|---|
| before | **0** (of 30) | **0** |
| after | **30** (of 30) | **30** |

Cross-check `mobilenetv3_small_100`: 33 activations (19 `Hardswish`, 14 `ReLU`) → 10 before
the fix, 33 after. The fix is activation-class agnostic; the test asserts on `nn.ReLU`
because the shipped backbone uses `ReLU`.

Shipped asset, for reference only (read-only, untouched): 473 nodes, zero `Relu`, of which
276 are the GroupNorm decomposition (`Reshape` 92, `InstanceNormalization` 46, `Shape` 46,
`Mul` 46, `Add` 46). Its `config.json` is `backbone mobilenetv4_conv_small_035, norm
groupnorm, head combined, classes [empty, occupied]` — i.e. the occupancy model of
`specs/18` is exactly the crippled architecture.

#### Mutation check — the tests were red first

With `_gn_replacement` reverted to the old inline `nn.GroupNorm(...)` and nothing else
changed:

```
FAILED tests/test_training.py::test_convert_bn_to_gn_keeps_the_activation
FAILED tests/test_training.py::test_the_exported_graph_contains_activations
  AssertionError: assert 'Relu' in ['Identity', 'Identity', ...]
2 failed, 1 passed, 19 deselected
```

`test_convert_bn_to_gn_still_handles_a_plain_batchnorm` passes either way **by design** — it
is the guard that the plain-`BatchNorm2d` path did not change, not a bug detector.

Fixed: `22 passed` (`.venv/Scripts/python.exe -m pytest tests/test_training.py -q`, run once).
`ruff check src/chesslab/training tests` clean. Full `pytest` and `pytest -m clips` not run
(orchestrator's job).

#### ROCm BatchNorm probe: **NO — it still crashes. The GroupNorm workaround stays.**

`mobilenetv4_conv_small_035`, `norm="batchnorm"`, batch 8, 128×128, on `cuda` (gfx1100,
RX 7900 XT, torch 2.9.1+rocm7.2.1). It dies in the **first forward**, 1.2 s in, at
`timm/layers/norm_act.py:136 → F.batch_norm`:

```
MIOpen(HIP): Error [Compile] 'hiprtcCompileProgram(...)' MIOpenBatchNormFwdTrainSpatialHIP.cpp:
             HIPRTC_ERROR_COMPILATION (6)
miopen_type_traits.hpp:151:10: fatal error: 'type_traits' file not found
1 error generated when compiling for gfx1100.
MIOpen Error: .../hipoc_program.cpp:299: Code object build failed.
RuntimeError: miopenStatusUnknownError
```

Two things worth knowing beyond the yes/no:

- **It is a hipRTC include-path failure, not a GPU/kernel limitation.** MIOpen ships the
  batch-norm kernel as *source* and compiles it at runtime; the runtime compiler cannot find
  `<type_traits>`. That smells like a fixable ROCm-Windows install/header packaging problem.
  If someone fixes the include path, BatchNorm becomes available and with it Conv+BN folding
  (~276 nodes gone) and a QNN-executable graph. **Not attempted here** — it is an SDK change,
  not a training change.
- **A single `nn.BatchNorm2d(32)` on an 8×32×32×32 tensor works** (forward 0.4 s, backward
  0.6 s). Only configurations that need a *fresh* compile fail; the ones already in
  `~/.miopen/cache/…/gfx1100_42.ukdb` run. So "BatchNorm works" is not a safe conclusion from
  a small hand-written probe — it has to be the real backbone's shapes.
- Cost note: the first, uninstrumented run of this probe sat at 100 % of one core for 19
  minutes (MIOpen's find phase, which does write `~/.miopen/db/…ufdb.txt`) before I killed it;
  the instrumented rerun then failed in 1.2 s using that find result. Nothing was left running.

#### Consequence that needs your decision: old groupnorm checkpoints no longer load

The `Sequential` inserts an index, so **92 of 140 state-dict keys are renamed**
(`blocks.0.0.bn1.weight` → `blocks.0.0.bn1.0.weight`). `training/evaluate.py:28`
(`load_run`) loads **strictly**, so every run trained on this Windows box — where
`train.py:234` defaults `norm` to `groupnorm` — now fails to load for eval / export / serve,
and `train.py:272`'s warm start adopts the convs but re-initialises those 92 norm tensors.

This is not fixable within shape (a), and the alternative is worse: an `nn.GroupNorm`
subclass carrying `drop`/`act` would keep the key names and let those checkpoints load
**silently** into an architecture that now has 30 nonlinearities it did not have during
training — serving a model whose own `eval_test.json` no longer describes it. A hard failure
is the honest state of the world: those weights were fitted for a network without
activations.

**The fix therefore implies a retrain.** Not started — heavy-compute contract, and the spec
puts it out of scope. Nothing in `android/app/src/main/assets/cnn_model/` was touched, so the
device keeps running the old model until you decide.

#### Negative results

- **Short CPU convergence probe** (150 steps, batch 8, 16 random 128×128 images with random
  labels, one worker, 4 threads, ~6 s per variant): crippled 9.92 → 0.000, fixed 6.65 → 0.001,
  **both memorise 16/16**. The probe cannot discriminate — it shows the rewired module trains,
  nothing more. Any accuracy claim needs the real retrain plus the clip harness.
- **"The `Identity` `drop`/`act` tails will bloat the exported graph" — wrong, measured.**
  Skipping them changes the exported node count by exactly **0** (580 either way): `nn.Identity`
  traces to no ONNX node at all, and the 70 `Identity` nodes in the graph come from elsewhere.
  The special case was written, measured, disproved and removed again; the committed code has
  no such branch.
- `specs/18-occupancy-model/` numbers (incl. the 0.9422 whole-board occupancy) were measured on
  the crippled network and are **suspect**. Deliberately not rewritten — that is a
  re-evaluation, not an edit.

#### Discrepancies against the spec

- **D04-1** — `04-cnn-activations.md` cites `model.py:32-41`; the function is now
  `model.py:32-55` (split into `_gn_replacement` + `_convert_bn_to_gn`). The `model.py:24,32-35`
  anchor for the ROCm rationale was correct.
- **D04-2** — "~286 of 337 graph nodes are the GroupNorm decomposition". Measured on the
  shipped asset: **276 of 473**. 337 ≈ 473 minus the 138 `Constant` initialiser nodes; the
  argument is unaffected.
- **D04-3** — the spec's op-set listing for the shipped `model.onnx` reproduces exactly
  (`Add, Constant, Conv, Flatten, Gemm, GlobalAveragePool, InstanceNormalization, Mul, Reshape,
  Shape`, zero `Relu`), and "30 activations gone" is exact.
- **D04-4** — the phase names `tests/test_training*.py`; the grep resolves to
  `tests/test_training.py` (and `tests/test_serving.py`, which uses `norm="batchnorm"` only and
  needed no change).
- No blockers.
