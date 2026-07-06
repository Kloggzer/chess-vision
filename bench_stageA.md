# Stage A — Benchmark

## Baseline (before any changes)

| op | ms |
|---|---|
| aruco full-res | 13.5 |
| aruco half-res | 5.3 |
| warpPerspective | 1.2 |
| gray+blur | 0.1 |
| motion_score | 1.0 |
| buffer_mean (gray, 3 frm) | 4.6 |
| per_square_diff | 0.6 |
| census_full (800²) | 16.2 |
| census band (1 rank) | 8.7 |
| hsv_shadow (1 sq) | 6.6 |
| occlusion gamut build | 10.7 |
| JPEG encode (800²) | 1.2 |
| grid Canny (800²) | 0.8 |


## After Stage A (A1-A4 complete)

| op | ms |
|---|---|
| aruco full-res | 11.1 |
| aruco half-res | 3.9 |
| warpPerspective | 1.0 |
| gray+blur | 0.1 |
| motion_score | 0.7 |
| buffer_mean (gray, 3 frm) | 2.9 |
| per_square_diff | 0.6 |
| census_full (800�) | 11.8 |
| census band (1 rank) | 6.8 |
| hsv_shadow (1 sq) | 3.8 |
| occlusion gamut build | 6.8 |
| JPEG encode (800�) | 1.1 |
| grid Canny (800�) | 0.8 |

