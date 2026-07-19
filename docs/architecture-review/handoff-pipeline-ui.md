# Handoff — web pipeline UI / job runner

Notes for whoever implements the "drive the full training pipeline from the browser"
plan (job runner → parity → Stage 7 correctness fixes). Written 2026-07-19 from the
branch that is currently ahead of `main`.

Read this before starting: several of the files that plan touches were rewritten today,
and two of the changes alter assumptions the plan makes.

---

## 1. Branch first — this is the one that will hurt

The plan's verification section records **"525 passing today"** as the baseline. That is
`main`. The current work sits on **`lens-and-pipeline-hardening`** (three commits,
**526 passing**), and it contains fixes for *silent training-data corruption* in exactly
the files the plan edits:

| commit | what |
|---|---|
| `ab46787` | lens undistortion, track camera controls, dataset/pack hardening |
| `059f391` | safe pack resume (digest), preflight no longer destroys the old dataset |
| `deb1c5b` | un-publish stale pack meta, widen the digest |

**Branch from `lens-and-pipeline-hardening`, not from `main`.** Starting from `main` and
merging later risks silently reverting the corruption fixes, because the conflicts land
in the same functions.

Re-baseline the test count before touching `dataset_build.py` — it is moving (a second
agent is landing lens/profile fixes with new tests as this is written).

---

## 2. Changed assumptions the plan relies on

### `source_manifest` is now a LIST (affects Stage 7.1)

Stage 7.1 is correct that rebuild is broken because `routers/datasets.py` never passes
`source_manifest` back. But the field changed shape today:

```python
# dataset_build.py, persisted into dataset.yaml
"source_manifest": [p.as_posix() for p in srcs],   # was: str
```

`build_dataset(source_manifest=...)` now accepts `Path | str | Sequence[Path | str]` and
concatenates several crop pools. Reading `cfg["source_manifest"]` as a string will either
crash or — worse — iterate it into single characters. Read it as a list and pass it through.

**Also fix the known duplication hole while you are there:** concatenating several pools
does *no* dedup. If a session exists in two pools (easy: `ingest` without `--no-build`
writes both the default pool and the tagged one) every crop enters twice. Labels stay
correct, but `per_cell_cap`, the class ratios and the empty-ratio guard are all computed
on doubled data, and in `load_packed` the duplicate paths collapse to one memmap index.
Exit code 0, wrong statistics. Dedup on `path` (or `(session_id, frame, square, rot)`) and
log how many were dropped.

### A cancelled re-pack leaves the dataset unpacked (affects Stage 3)

`pack_dataset` now unlinks `packed_meta.json` **before** the first write. That was a
deliberate fix: a re-pack rewrites `packed_images.u8` in place, so an interrupted one used
to leave the previous meta published — and its digest still matched, because it describes
the same manifest. Half the rows were the old dataset's pixels under the current labels,
with no sidecar left as a hint.

Consequence for a UI-triggered pack:

- Cancel → the dataset is **temporarily unpacked** and training silently falls back to the
  per-PNG loader, which is ~10× slower on a 2M-crop set. **Surface this in the UI**, or the
  user will just experience mysteriously slow training.
- Re-running the pack **resumes** from `packed_progress.json` (chunks of ~256 MB), so cancel
  and restart is cheap and safe. Say so in the UI.
- The resume signature includes a digest over `path + label + out_size`. It does *not* cover
  pixels changing under an unchanged path — if a job rewrites crops in place, it must force
  a full re-pack.

### `_preflight_disk_check` runs before `rmtree` (affects Stage 7.2)

The check now runs *before* the old dataset is deleted, so a refusal no longer leaves the
caller with neither dataset. If you make the rebuild atomic (temp dir + `os.replace`), the
budget maths changes: both datasets exist simultaneously for a while, so the projection must
add the old dataset's size. Do not just drop the check — it is what stops a build from
filling the disk over an hour.

---

## 3. Already being done — drop from scope

**Stage 7.4 (rotate default mismatch)** is in flight in a parallel change:
`routers/datasets.py:76`, `schemas.py:44`, `Dataset.tsx` default + tooltip, the README line,
and a frontend rebuild. Taking it too means a conflict in the committed
`web/static/` bundle. Coordinate before touching those files.

For reference, the intended shape (already applied in `cli.py`):

```python
rotations = config.DEDUP.rotations_augmented if rotate else config.DEDUP.rotations
```

`DEDUP.rotations` is now `(0,)` — rotation augmentation was a pre-synthetic-data crutch that
contradicts the fixed-camera assumption. `rotations_augmented` is the opt-in.

---

## 4. Hard-won gotchas for the job runner

These cost real hours today. All are directly relevant to running long jobs from a UI.

**Windows `spawn` re-imports the main module.** Any job that uses `multiprocessing` —
`dataset pack` does — needs its entry behind `if __name__ == "__main__":`. Without it every
worker re-runs the whole script. In our case each worker re-loaded a 1.67 GB manifest and
died with `MemoryError`.

**Dead workers keep their commit charge.** Those eight failed workers did not exit; they hung
holding ~8 GB of commit each, ~65 GB total, until killed individually. Free RAM hit 0 and the
machine crawled. A job runner that abandons children instead of reaping them will reproduce
this. Reap explicitly and verify the process group is gone, do not trust `terminate()`.

**The Windows commit limit is a separate ceiling from disk.** Creating a ~106 GB memmap failed
with `WinError 1455 "paging file too small"` while 140 GB of disk was free, because every
worker mapped the whole file. Commit limit here is 104 GB (32 GB RAM + pagefile). Fixed by
allocating with `truncate` and mapping only each worker's slice. If a job reports a
nonsensical out-of-space error, check commit, not disk.

**The Blender-kill risk in the plan is real, not theoretical.** Given the above, an orphaned
Blender holding the GPU is exactly the failure mode to expect. The plan's insistence that this
be *verified* rather than assumed is right.

**Preflight before starting a long job.** A 100 GB pack that dies at minute 40 because the disk
filled is the worst outcome. `_preflight_disk_check` exists for the build path; the UI should
do the equivalent before submitting anything long.

---

## 5. Facts that have moved

- `manifest_cache` never evicting is listed in the plan's Risks as a problem "north of ~1M
  crops". The current dataset is **2.17M crops** — it is live, not hypothetical.
- The synth set now packs to ~100 GB. `val`/`test` are 640k crops each, i.e. **59% of the
  memmap** for data that is barely used. That is the biggest remaining size lever if anyone
  rebuilds it.
- `data/synth_v3_balanced` (60 GB of raw renders) is **deliberately retained** for a planned
  board-based pipeline refactor (store whole labeled boards, crop on the fly, JPEG — roughly
  10× less storage). Do not add a cleanup job that deletes it.
