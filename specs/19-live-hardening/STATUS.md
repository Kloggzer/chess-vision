# 19 — Live hardening: STATUS

The only hand-off between agents. Each phase appends **its own** section; never rewrite
another phase's. Record discrepancies against the spec, every measurement including negative
results, and any blocker with file + line + what you tried.

## Phases

| Phase | File | Concern | State | Notes |
|---|---|---|---|---|
| 00 | `00-poisoned-reference.md` | Measure why `f1` stands at z≈15; origin-vs-destination asymmetry | todo | Measures only. Must not edit `src/` or `android/`. |
| 01 | `01-cnn-runtime.md` | ORT session config, XNNPACK, profiling, steady-state number | todo | |
| 02 | `02-frame-allocations.md` | Per-frame buffers, engine hot path, 3 latent bugs | todo | `ClipReplayParityTest` must stay 18/18. |
| 03 | `03-recording.md` | Recording "doesn't work well" — diagnose then fix | todo | Diagnosis commits before the fix. |
| 04 | `04-cnn-activations.md` | `_convert_bn_to_gn` deletes timm's ReLUs | todo | No full retrain. |

All five may run in parallel; file scopes are disjoint.

## Baseline measurements (from the session that produced this pack)

Recorded here so no phase re-derives them, and so a later reader can tell what moved.

**The recording:** 1080×1920, 30 fps, 1975 frames, ArUco visible, standard start position.
Board occupies 630×643 px of the source = **79 px per square**.

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

_todo_

### Phase 01 — CNN runtime

_todo_

### Phase 02 — frame allocations

_todo_

### Phase 03 — recording

_todo_

### Phase 04 — CNN activations

_todo_
