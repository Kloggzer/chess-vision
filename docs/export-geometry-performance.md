# Export geometry optimization, 2026-09-08

The board exporter already composes mesh, homography and optional lens distortion into
one cubic remap. It does **not** run a perspective warp followed by mesh straightening.
The expensive repeated work was constructing the dense mesh coordinates in NumPy.

`calibration._crop_mesh_coordinates` now caches the normalized float64 coordinates by
board size, border and all mesh values. The homography and lens are still applied for
each frame, so changing corners remain effective. Arrays are read-only; two cache
entries retain about 30 MB at 952 x 952 per process. The operation order, interpolation
and WebP quality are unchanged. There is no persistent cache to invalidate on disk.

`alignment._notch_centre` solves the shoulder baseline analytically using symmetric,
centered coordinates instead of a general `polyfit` solver. This preserves the linear
least-squares model; floating-point rounding can differ. Other robust fits retain their
existing solvers because their weights and design matrices vary.

## Measurements

Session `2026-08-30-16-20-19`, 262 frozen log rows, unchanged pooled mesh and rotation.
The comparison uses copies of the same input rows and writes only to temporary outputs.

| Measurement | Previous code | Optimized |
| --- | ---: | ---: |
| Full board phase, one process / four writer threads | 40.035 s | 10.774 s |
| Full board phase, four processes | not measured in this comparison | 9.105 s |
| 12 real-frame line scans | 0.227 s | 0.179 s |
| 12 complete grid fits, identical input geometry | 2.108 s | 1.905 s |

All 262 encoded boards, row fields and statistics matched exactly in both optimized
board paths. The twelve complete fit results also matched exactly. Intermediate line
positions differed by at most 1.14e-13 pixels. Randomized regression tests compare
3,000 noisy/sloped/occluded profiles against the original polyfit detector, and warp
tests compare pixels while changing corners, border, mesh values and lens distortion.

A first board-phase pair measured 34.479 s versus 9.940 s while tests were also running;
the table uses the repeat without concurrent tests. These are phase measurements, not
a new end-to-end export benchmark; previous cold/warm export totals are not comparable.

OpenCL was available and enabled. A warmed cubic remap of a real frame, with resident
maps and upload/download on every invocation, averaged 10.647 ms versus 2.138 ms on CPU
over 30 iterations. GPU timing included synchronization. Pixels matched, but this path
was slower, so no OpenCL dependency or global backend change was introduced.

## Reproduce the board comparison

Run from the repository using the existing environment:

```powershell
$env:PYTHONPATH = 'src'
.venv/Scripts/python.exe scripts/benchmark_export_warp.py 2026-08-30-16-20-19
```

The script compares cached and uncached construction with one process and the normal
writer pool, and verifies encoded hashes, rows and statistics. `--limit 12` is a quick
smoke check. Session files are read only; temporary encoded boards are cleaned up.
