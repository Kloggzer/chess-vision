# Session packs — one memmap per session, many memmaps per training run

## What this is

Today a dataset IS a memmap: `build_dataset` selects rows from the crop pool and `pack_dataset`
decodes them into `data/datasets/<name>/packed_images.u8`. Every recipe experiment re-packs the
corpus, so `data/datasets/` holds many copies of the same pixels; `link_pack` only helps when one
manifest is a subset of another.

After this pack: a **session pack** `data/packs/<pack>/` holds the session's crops once (memmap +
`mm://` manifest — the format the Kotlin `labeled-video-pack`/`turntable-pack` already write); a
dataset built `--from-packs` is only `manifest.jsonl` + `split.json` pointing into packs; the
loader opens one memmap per pack. `data/crops/<tag>/` (128 px, labeling UI) is untouched.

| Phase | File | Concern | Depends on | Runs |
|---|---|---|---|---|
| 00 | 00-contract.md | `training/packs.py`: layout, `PackRef`, `MultiPack`, `resolve_packs` | — | **alone, first** |
| 01 | 01-writer.md | `chesslab session pack` + `pack import` (Kotlin packs) | 00 | parallel with 02, 03 |
| 02 | 02-loader.md | `PackedSquareDataset`/`PackedBoardDataset`, `resolve_dataset_packs` | 00 | parallel with 01, 03 |
| 03 | 03-builder.md | `dataset build --from-packs`, `pack_dataset` refusal | 00 | parallel with 01, 02 |
| 04 | 04-parity.md | end-to-end on one real session, docs, README | 01, 02, 03 | last, alone |

Phase 00 is the contract provider: it lands and is merged before 01–03 start. 01–03 import
`training/packs.py` and never write to it. 04 is the only phase that trains.

## Protocol

- Read this file completely, then only your phase file. `AGENTS.md` and `CLAUDE.md` apply
  verbatim; this pack supersedes where they differ.
- Trust the code over the spec. A discrepancy is recorded in `STATUS.md` → Notes, never
  silently patched into the spec. Blocked → STOP, write the blocker in `STATUS.md`.
- Integration branch `feat/session-packs`. One branch AND worktree per phase:
  `git worktree add .claude/worktrees/sp-0N -b feat/sp-0N feat/session-packs` (git refuses two
  checkouts of one branch). The orchestrator merges each `feat/sp-0N` into `feat/session-packs`;
  never merge yourself. Commit exactly as your Steps name them,
  conventional prefix, stage files explicitly. Never `git add -A`, `--no-verify`, amend, force,
  `reset --hard`. Last line of every commit message: `Spec: plan/01-session-packs/0N-*.md`.
- Language: code, comments, docs, commit bodies in English. Comments ≤ 5 lines, say *why*
  (`tests/test_comment_budget.py`, LIMIT 5 — hard for new files). Existing files carry a
  budget in `tests/comment_budget.txt` that must EQUAL the file's worst block (`labeling.py` 11,
  `torch_data.py` 33, `pack.py` 15, `train.py` 13, `evaluate.py` 12, `config.py` 16, `cli.py` 10,
  `dataset_build.py` 21). If your edit changes a file's worst block, lower its entry (never
  raise) and say so in `STATUS.md`.

## Memory and compute contract

- `uv run` does NOT work inside a worktree: `wheels/` is git-ignored, `uv sync` fails on the
  local ROCm wheel and starts building a fresh environment. Use the root checkout's interpreter
  with your worktree on the path, from inside your worktree:
  `PYTHONPATH=src <root>/.venv/Scripts/python.exe -m pytest -q tests/<your file>.py`,
  `<root>/.venv/Scripts/python.exe -m ruff check <files>`,
  `<root>/.venv/Scripts/python.exe -m vulture src tests --min-confidence 80`.
  Verify once that `chesslab.__file__` resolves into your worktree. (Phase 04 runs from the root
  checkout after the merge, where `uv run` works.)
- Tests: run ONCE, targeted. Never the full suite, never `chesslab train` on real data (Phase 04
  excepted: one session, `--num-workers 1`, one epoch, the default backbone). No renders, no
  re-slicing the corpus.
- Lint, scoped: `ruff check` on the files you touched. There is no formatter in this repo —
  match the surrounding hand style, do not run `ruff format`. Zero new `vulture` findings.
  No `# noqa` additions to go green.
- Orchestrator runs the full gate after merge: `uv run pytest -q`, `ruff`, `vulture`,
  `tests/test_comment_budget.py`.

## Ownership registry — overrides any phase file that disagrees

| File | Created by | May be written by | Notes |
|---|---|---|---|
| `src/chesslab/training/packs.py` | 00 | 00 only | frozen after 00; 01–03 import, never edit |
| `src/chesslab/config.py` | exists | 00 only (`Paths.packs`) | |
| `src/chesslab/labeling.py` | exists | 01 only | crop generator seam |
| `src/chesslab/training/pack_session.py` | 01 | 01 only | the writer, kept out of `packs.py` |
| `src/chesslab/cli.py` | exists | 01 (`session pack`, `pack import`, ~:253), 03 (`dataset build`, ~:1292/:1342) | shared, hunks 1000+ lines apart |
| `src/chesslab/training/pack.py` | exists | 02 (`load_packed` region ~:332-352), 03 (`pack_dataset` head ~:160-170) | shared, disjoint regions |
| `src/chesslab/training/torch_data.py` | exists | 02 only | |
| `src/chesslab/training/train.py`, `evaluate.py` | exist | 02 only | |
| `src/chesslab/dataset_build.py` | exists | 03 only | |
| `src/chesslab/training/gradcam.py`, `scripts/*.py` (except below) | exist | nobody | see "Known non-goal" |
| `docs/data-pipeline.md`, `README.md`, `TODO.md` | exist | 04 only | durable facts land here |
| `scripts/pack_parity.py`, `tests/test_packs_integration.py` | 04 | 04 only | the 02↔03 seam test |
| `tests/test_packs.py` | 00 | 02 (append) | |
| `tests/test_session_pack.py` | 01 | — | |
| `tests/test_dataset_build.py`, `tests/test_pack.py` | exist | 03 (append) | |
| `tests/comment_budget.txt` | exists | any phase, entries only lowered | say so in `STATUS.md` |
| `plan/01-session-packs/STATUS.md` | exists | every phase: its own row + Notes + Session log | |

## Artifact and schema authority

- Pack layout and `packed_meta.json` are owned by Phase 00 and are a strict SUBSET of what
  `LabeledVideoPack.kt` emits today (`android/desktop/src/main/kotlin/com/chesslab/desktop/`,
  `manifestRow` :530, meta writer :220-228). Required keys: `n`, `h`, `w`, `digest`, `paths`;
  extra keys (Kotlin's `source`, `session_id`, `every`, …) are ignored, never required.
  `crop_fingerprint` is a CROP-FILE guard from `pack.py` — a pack has no files, so it is NOT in
  this schema. A consumer needing a missing key records a gap in `STATUS.md`; it never invents one.
- **Naming invariant:** the pack directory name equals the first `mm://` segment of its rows.
  Python writes `mm://<session_id>-<W>/…` into `data/packs/<session_id>-<W>/`; Kotlin writes
  `mm://<session_id>/…`, so an imported Kotlin pack lands at `data/packs/<session_id>/`.
  `read_pack` enforces this; nothing renames a Kotlin pack.
- Shared constants live in `training/packs.py` and nowhere else: `DEFAULT_PACK_SIDE = 80`
  (the crop side every default uses), `PACKS_KEY = "packs"` (the `dataset.yaml` key Phase 03
  writes and Phase 02 reads). Never retype the literal.
- `pack_size` everywhere means `(W, H)`, the order `--pack-size` and `_out_size` use
  (`cli.py:859`); `packed_meta.json` stores `h`, `w`. Compare `(w, h) == pack_size`.
- The ONE digest: `training.pack._manifest_digest` (`path\0label\0out_size\n` per row). Kotlin
  reproduces its byte stream (`LabeledVideoPack.kt:200-205`, verified); the Python writer calls it.
- Pixel order in every memmap: `(N, H, W, 3)` uint8 **RGB** (the loader does `Image.fromarray`;
  Kotlin calls `bgrToRgbInPlace`). A writer that reads with OpenCV converts.
- Crop geometry per pack is frozen: `out_size`, `pad_side`, `pad_up` sit on every manifest row;
  all packs in one dataset must agree on `(h, w)`.

## Known non-goal (record it, do not fix it)

`gradcam.py:39` and eight `scripts/*.py` unpack `load_packed`'s legacy 3-tuple positionally and
index by crop path — that cannot work across several memmaps. They stay unchanged; Phase 02 makes
`load_packed` refuse a pack-built dataset with a message that names the reason, Phase 04 writes
the limitation into `docs/data-pipeline.md`.

## Debt this pack pays down — and what it defers

Paid down, inside the phases, because the feature forces it: the ONE index-resolution site
(`_pack_index`, 02, replaces two copies), the union accessor `packed_shape` (00) so nothing
unpacks a positional tuple again, the cut/write seam in `_slice_session` (01), and the
"`mm://` means fused synth" conflation, which becomes false the moment packs exist (02, 03).

Deferred, recorded by Phase 04 as ONE line each in `TODO.md` (its Design names them) — do not
fix them here: `load_packed`'s bare-tuple return with ten positional readers; the eight
`scripts/*.py` that copy `index = p2i or {r["path"]: r["_packed_idx"] …}` verbatim; two `mm://`
formats with no shared builder (`synth_build._virtual_path` vs the Kotlin writers);
`packed_meta.json` hand-written at four Python sites with no reader/writer pair.

## Parallel hazards

- The shared branch will not compile mid-phase. Gate in your own worktree; never touch another
  phase's file to go green; report which files you gated. The orchestrator re-runs the gate.
- Typed seams: everything crossing a module boundary is `PackRef`, `MultiPack`, `np.ndarray` or
  a scalar. Two exceptions: a **manifest row** (a `dict` repo-wide, keys fixed by
  `labeling.py:541-563`) and a CLI result dict that the CLI command of the SAME phase prints
  (`dataset_pack_cmd` does this today, `cli.py:1444-1449`). No other dict crosses a boundary.
- `pack.py` must import from `packs.py` INSIDE functions (`packs.py` imports
  `pack._manifest_digest` at module level; the repo style is the local import, `pack.py:159`,
  `train.py:47`). A module-level `from .packs import …` in `pack.py` is a circular import.
- Every module boundary has one test against the real implementation, named in the phase.

## Definition of done (per phase)

Steps committed as named, phase tests green once, scoped ruff/vulture clean, `STATUS.md` row
updated with date, commits, test counts and the exact next step.
