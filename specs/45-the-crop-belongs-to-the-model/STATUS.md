# 45 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-03; agent NOT yet dispatched (user is pacing token spend) |

## Measured before the pack was written

| Fact | Value | How |
|---|---|---|
| `pad_side` of every real session | **0.05** — `default` 9 sessions, `phone` 14 | `session.yaml` per session, profile YAML |
| Android default `padSide` | **0.10** in `CalibrationProfile.kt:45` and `core-geometry/Corners.kt:65` | source |
| Global Python default `config.CROP.pad_side` | **0.10** | `config.py:98` |
| Crop fields in the 7 bundled model configs | none — only `out_size` and `infer_size` | `assets/cnn_model/*/config.json` |
| Disagreement caused by 0.10 vs 0.05 on an untouched start position | a7 / c7 / b8 / h8 | specs/41 |

## Not measured

- What the DEVICE serves after a real calibration. The stored profile was unreadable on
  2026-08-03 (app data wiped that morning, no calibration since).
- What the difference costs in phantoms and misses. Nobody has ever run it.
