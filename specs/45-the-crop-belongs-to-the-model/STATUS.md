# 45 — Status

| Phase | State | Note |
|---|---|---|
| 1 — measure | `open` | PREPARED, not run: the two numbers below need the phone and the GPU |
| 2 — the model declares its crop | `done` | shipped 2026-08-06, branch `worktree-agent-a324b7606dab743f4` |
| 3 — `ModelSpec` reads it, the geometry takes it | `done` | `withCropSizeOf` → `withCropOf` |
| 4 — a legacy model says so LOUDLY | `done` | exporter, `run_start` row, debug panel, Settings help |
| 5 — Python agrees | `done` | `config.CROP.pad_side` 0.10 → **0.05** (blast radius below) |

## Measured before the pack was written

| Fact | Value | How |
|---|---|---|
| `pad_side` of every real session | **0.05** — `default` 9 sessions, `phone` 14 | `session.yaml` per session, profile YAML |
| Android default `padSide` | **0.10** in `CalibrationProfile.kt` and `core-geometry/Corners.kt` | source |
| Global Python default `config.CROP.pad_side` | **0.10** | `config.py` |
| Crop fields in the 7 bundled model configs | none — only `out_size` and `infer_size` | `assets/cnn_model/*/config.json` |
| Disagreement caused by 0.10 vs 0.05 on an untouched start position | a7 / c7 / b8 / h8 | specs/41 |

## What shipped

**A crop now says how it was cut.** Every writer of the crop pool records `pad_side`/`pad_up`
beside `out_size`: `labeling.slice_session`, `synth_build._rows_for_entry`, `track_feedback`. This
had to come first — see "Where the pack was wrong" below.

**A run declares its crop.** `train` derives the pads from ALL rows of its dataset and writes them
into `config.json`; `run_export` does the same for a run trained earlier, through the same reader
(`training.data.crop_of_rows`). Unanimity or nothing: rows that predate the fields, or a dataset
whose sessions were sliced under different profiles, produce **no declaration** and a `[LEGACY]`
line naming the dataset. An existing declaration is never removed by an export — a value
established by hand outranks a dataset that has since been rebuilt.

**Serving crops to what the model declares, on both platforms.**

| | before | after |
|---|---|---|
| Python `serving.crops_for_model` | size from the model, **box from the caller's profile** | both from the model (`RunSpec.pad_side/pad_up`), profile only when the run declares none |
| Android `BoardGeometry.withCropSizeOf` | `outW`/`outH` only | `withCropOf`: `outW`/`outH` + `padSide`/`padUp`; `boardSize`/`margin` stay the board's |

`TrackerService.geometry` applies it in its **setter**, so the three call sites cannot forget it —
the previous KDoc asked readers to `git grep` for the three, which is a convention, not a
mechanism. (It is also what keeps detekt's `TooManyFunctions` satisfied: a funnel *method* made the
class 16 functions against a threshold of 15.)

**A model without the fields is legacy, in four places:**

| Where | What it says |
|---|---|
| `run_export` | `[LEGACY] <run> declares NO crop: dataset '<ds>' does not record pad_side/pad_up …` |
| device `run_start` row | `declaredPads: null` beside `servedPads: "side=0.100 up=0.000"` |
| debug screen, CNN panel | `id35-80 @ 80x80 · crop side=0.100 up=0.000 (LEGACY: the model declares no crop)` |
| Settings → CNN model help | says the crops follow the model's padding, and that the panel marks a model that declares none |

Half a declaration is refused outright (`ModelSpec.parse` throws): the missing half would be filled
from the profile, composing a box nobody chose.

**All seven bundled models back-filled** to `pad_side 0.05` / `pad_up 0.0` — see the evidence
chain below. `ModelSpecTest.everyBundledModelDeclaresItsCrop` pins that a shipped model ANSWERS the
question; it deliberately does not pin the value, which is a property of the corpus.

**`scripts/sweep_infer_size.py --pad-side 0.05,0.10`** repeats path A per pad and labels each row
`<run>@pad<value>`, so step 1's two rows can come from one invocation. Not run (below).

## The decision on `config.CROP.pad_side`

**It does not survive as 0.10. It is 0.05.** Every crop this project has ever trained on was cut at
0.05; a default no corpus uses is a trap for whatever is built next, and it had already sprung
twice — in the clip harness (specs/41) and in the Android runtime default. specs/18's DATA-QUALITY
note had named the same 9 % mismatch and proposed closing it the other way round, towards 0.10; the
corpus and every shipped model went 0.05, so the default follows them rather than the note.

Blast radius, stated because a silent default change is the class of bug this pack is about:

| Reached by the change | Effect |
|---|---|
| `CropParams.default` → `calibration.ensure_profile`, `profile_from_frame` | a NEW profile is created at 0.05 — the point of the change |
| `ingest.ingestion_profile` → synth ingest and `dataset build-synth` | future synth crops are 1.10 cells, matching the real corpus. Existing synth datasets are files on disk and do not move |
| `emit_parity_fixtures.ClipDriver` for clips with no `crop` key (all 20 Blender clips) | their CNN crops only. The committed parity fixtures are diff-path (`cnn_run=None`) and cannot move; `crop_border_px` does not move either, because `max(0.1, pad_side + pad_up)` is 0.1 on both sides of the change |
| Android `BoardGeometry.padSide`, `CropParams.padSide` | the fallback when no model declares a crop. **A profile STORED before today still says 0.10** and keeps saying it — only the model's declaration overrides that, which is why step 3 and not step 5 is the real fix |
| `CropBoxTest.default geometry crop boxes` | updated: the default box is −10…210 of a 200 px cell, and `cropBorderPx` stays 20 because the 0.1 floor decides it |
| Existing datasets, existing crops on disk | nothing. They were cut at 0.05 already |

## Where the pack was wrong against the tree

**"Both are known at build time because the dataset records them" — it did not.** A manifest row
has carried `out_size`, `geometry` and `photometry` since the rework and never a pad. The crop's
composition lived in exactly one place, the calibration profile, which is mutable, unversioned and
had already changed under some rows. So step 2 needed a step 2a: record the pads where the crop is
written. Consequence for the datasets on disk: **occ-real3, occ-real5nd, occ-warm and
occ-warm-13c-hn all read as legacy** to `run_export` until their sessions are re-sliced.

**"specs/41 gave a clip entry a `crop`" — in the Python harness only.** The Kotlin
`SimClip`/`ClipPipeline` never had one; its geometry came from `labels.json` (`board_size`,
`margin`) with `padSide` at the Kotlin default. It now takes the model's declaration through
`withCropOf`, like every other consumer.

**"Settings names the model" — it names it, but only as a directory string.** The `Choice` picker
renders `BUNDLED_MODELS` and has no access to the assets, so a per-option "legacy" badge would mean
reading seven `config.json` files inside a composition. Since all seven now declare a crop there is
no legacy case left to badge; the loud path is the debug panel line and the `run_start` row, and
the picker's help text points at both. If a model without a declaration is ever sideloaded, the
panel is where it shows.

## Judgement calls

**The bundled configs were back-filled from the PROFILES, not from the crops.** Chain: all 23 real
sessions (incl. the archived ones in `data/sessions_archive`) name profile `default` or `phone`;
both YAMLs and both `.bak` copies read `pad_up 0.0` / `pad_side 0.05`; specs/18's DATA-QUALITY table
recorded 0.05 for both in July and asked for a change that was never made; specs/22's crop-box
arithmetic (110 px = 800/8 × 1.10) independently confirms 0.05 on the rig. The four datasets behind
the seven models are built from those sessions and no others. **The gap:** a `slice --pad-side`
override at some point would leave no trace anywhere, because the rows did not record it. Nothing
on record suggests one was used, and the fix ends the ambiguity for every future crop.

**`declaredPads` / `servedPads`, not `declaredCrop`.** `DiagnosticsLogTest.noPixelsReachTheFile`
forbids the substring `crop` anywhere in a diagnostics file, and that guard is right — it exists so
the crop TAP's pixels can never end up in an exported log. Two floats describing a box are the
opposite of that payload, so the fields were named for what they carry rather than the guard
loosened.

**The pads are applied to a COPY of the profile** (`labeling.effective_profile`, promoted from
`_effective_profile`). A serving call must not mutate the caller's calibration profile; the test
asserts it does not.

**`run_export` writes the crop as well as `train`**, which is two writers for one key. They call
the same reader over the same dataset, and the export path is the only way an already-trained run
can acquire the field — the seven bundled models are exactly that case.

## Open

**Step 1, number 1 — what `padSide` the DEVICE serves after a real calibration.** Needs the phone.
The procedure is now a read rather than a reverse-engineering job:

```
1. Calibrate the board on the phone (Settings → Board → Board calibration).
2. Start tracking for a few seconds, so the CNN attach resolves and the run header is written.
3. Read it on the device: Settings → Advanced → Developer → debug panels → CNN.
   The model line reads e.g.  id35-80 @ 80x80 · crop side=0.050 up=0.000
   and appends "(LEGACY: the model declares no crop)" if the model declared none.
4. Or pull the header (do NOT reinstall first — an install wipes files/):
   adb exec-out run-as com.chesslab.tracker cat files/diagnostics/diag-0.ndjson | head -1
   -> the `model` block carries `declaredPads` and `servedPads`.
```

With the shipped assets back-filled, `servedPads` must now read `side=0.050`. What it read BEFORE
this pack — the actual open question, i.e. whether the stored profile said 0.10 — can still be
recovered from a profile written before today:

```
adb exec-out run-as com.chesslab.tracker cat files/datastore/calibration.preferences_pb | strings | grep padSide
```

**Step 1, number 2 — phantoms and misses at 0.05 against 0.10.** NOT run: this machine also runs
the user's games. One invocation, both rows, one profile:

```
.venv/Scripts/python.exe scripts/sweep_infer_size.py --paths a \
    --runs occ-v10bn35-13c-hn,occ-v9bn-wide \
    --dataset occ-warm-13c-hn \
    --sizes 80 \
    --pad-side 0.05,0.10 \
    --log data/_perf/spec45-pad-side.log
```

Why these: `occ-v10bn35-13c-hn` is `id35-80`, the model the device actually runs, and
`occ-v9bn-wide` is `bn100-80`, the 2-class champion — the two `RUNS` defaults, both bundled and
both known to read 0/3 at their operating point, so a change is attributable to the pad alone.
`--sizes 80` because that is the shipped `infer_size` and a trained scale for both; adding sizes
multiplies the run time and answers a question specs/22 already answered. `--paths a` because path
B resizes the crops on disk and cannot see a pad at all.

**Two caveats on that measurement, both load-bearing:**

- The runs in `data/models/` do NOT yet declare a crop (their datasets predate the row fields), so
  their `config.json` differs from the bundled asset by exactly the two keys this pack added. The
  sweep's docstring claims the two are byte-identical; that is no longer true until the runs are
  re-exported. The `--pad-side` override makes the measurement independent of it.
- Every path-A row on record was cut at the profile's 0.05, so the 0.10 row is genuinely new and
  the 0.05 row should reproduce the known 0 phantoms / 3 misses. If it does not, the profile moved
  and neither row is comparable to anything older.

**Not established: whether the corpus should be re-sliced now.** The crops on disk are already at
0.05 and correct; only their manifest rows are silent. Re-slicing all 23 sessions would make every
dataset self-describing and let `run_export` write the keys instead of a human, but it re-cuts
73 k crops and invalidates nothing that is currently true. Left for the user to schedule.

**Not done: `data/models/*/config.json` back-fill.** The assets carry the declaration; the run
directories do not, and `data/` is gitignored, so this pack did not touch them. Either re-slice and
re-export, or add the two keys by hand to keep the "asset is byte-identical to its run" property
that `sweep_infer_size.py` documents.
