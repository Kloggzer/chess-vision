# Session packs — one memmap per session, many memmaps per training run

## What this is

Today a dataset IS a memmap: `dataset_build.build_dataset` selects rows from the crop pool and
`training.pack.pack_dataset` decodes them into `data/datasets/<name>/packed_images.u8`. Every
recipe experiment re-packs the corpus, so `data/datasets/` holds many copies of the same pixels.
`link_pack` only helps when one manifest is a subset of another.

After this pack: a **session pack** `data/packs/<session_id>-<W>/` holds the session's crops once
(memmap + `mm://` manifest, the format the Kotlin `labeled-video-pack`/`turntable-pack` already
write); a dataset built `--from-packs` is only `manifest.jsonl` + `split.json` whose rows point
into packs; the training loader opens one memmap per pack. `data/crops/<tag>/` (128 px for the
labeling UI) is untouched.

| Phase | File | Concern | Depends on | Runs |
|---|---|---|---|---|
| 00 | 00-contract.md | `training/packs.py`: pack layout, `PackRef`, `MultiPack`, `resolve_packs` | — | **alone, first** |
| 01 | 01-writer.md | `chesslab session pack` + `pack import` (Kotlin packs) | 00 | parallel with 02, 03 |
| 02 | 02-loader.md | `PackedSquareDataset`/`PackedBoardDataset`/`load_packed` on `MultiPack` | 00 | parallel with 01, 03 |
| 03 | 03-builder.md | `dataset build --from-packs`, `pack_dataset` refusal | 00 | parallel with 01, 02 |
| 04 | 04-parity.md | end-to-end on one real session, docs, README | 01, 02, 03 | last, alone |

Phase 00 is the contract provider: it lands and is merged before 01–03 start. 01–03 import
`training/packs.py` and never edit the same FUNCTION; where two phases touch one file the
registry names the function each owns and the orchestrator merges. 04 is the only phase that trains.

## Protocol

- Read this file completely, then only your phase file. `AGENTS.md` and `CLAUDE.md` apply
  verbatim; this pack supersedes where they differ.
- Trust the code over the spec. A discrepancy is recorded in `STATUS.md` → Notes, never
  silently patched into the spec. Blocked → STOP, write the blocker in `STATUS.md`.
- Branch `feat/session-packs` off `main`; one worktree per phase
  (`git worktree add ../sp-0N feat/session-packs`). Commit exactly as your Steps name them,
  conventional prefix, stage files explicitly. Never `git add -A`, `--no-verify`, amend, force,
  `reset --hard`. Last line of every commit message: `Spec: plan/01-session-packs/0N-*.md`.
- Language: code, comments, docs, commit bodies in English. Comments ≤ 5 lines, say *why*
  (`tests/test_comment_budget.py`, LIMIT 5 — hard for new files).

## Memory and compute contract

- Tests: run ONCE, targeted: `uv run pytest -q tests/<your file>.py`. Never the full suite,
  never `chesslab train` on real data (Phase 04 excepted: one session, `--num-workers 1`,
  one epoch, smallest model). No renders, no re-slicing the corpus.
- Lint, scoped: `uv run ruff check <files>`; `uv run ruff format <files>` (formatter, not by
  hand). Zero new `vulture` findings (`uv run vulture src --min-confidence 80`). No `# noqa`
  additions to go green.
- Orchestrator runs the full gate after merge: `uv run pytest -q`, `ruff`, `vulture`,
  `tests/test_comment_budget.py`.

## Ownership registry — overrides any phase file that disagrees

| File | Created by | May be extended by | Notes |
|---|---|---|---|
| `src/chesslab/training/packs.py` | 00 | nobody | contract types frozen after 00 |
| `src/chesslab/training/pack_writer.py` | 01 | — | `write_session_pack`, `import_pack` |
| `src/chesslab/config.py` | exists | 00 only (`Paths.packs`) | |
| `src/chesslab/labeling.py` | exists | 01 only | `_slice_session` seam |
| `src/chesslab/cli.py` | exists | 01 (`session pack`, new `pack_app`), 03 (`dataset build` options only) | different functions |
| `src/chesslab/training/pack.py` | exists | 02 (`_load_packed`), 03 (`pack_dataset`) | different functions |
| `src/chesslab/training/torch_data.py` | exists | 02 only | |
| `src/chesslab/training/train.py`, `evaluate.py`, `gradcam.py` | exist | 02 only | every `load_packed` consumer in `src/` |
| `scripts/*.py` (11 `load_packed` callers) | exist | nobody | legacy datasets only; a pack-built dataset raises the `MultiPack.__iter__` message |
| `src/chesslab/dataset_build.py` | exists | 03 only | |
| `scripts/pack_parity.py` | 04 | — | |
| `docs/data-pipeline.md`, `README.md`, `TODO.md` | exist | 04 only | durable facts land here |
| `tests/test_packs.py` | 00 | 02 (append) | |
| `tests/test_session_pack.py` | 01 | — | |
| `tests/test_dataset_build.py`, `tests/test_pack.py` | exist | 03 (append) | |

## Artifact and schema authority

- The pack directory layout and the REQUIRED `packed_meta.json` keys are owned by Phase 00.
  `LabeledVideoPack.kt` (`manifestRow` :530, meta writer :219-225) emits a superset with extra
  keys and no `crop_fingerprint`; Phase 00 lists what is required, everything else is optional.
  A consumer needing a key the meta does not carry records a gap in `STATUS.md`; never invents one.
- **Invariant:** the pack directory name equals the first `mm://` segment of every row it holds
  (`pack_name_of(row["path"]) == dir.name`). Kotlin writes `mm://$id/…` with its `id=` option, so
  a Kotlin pack is imported under that id; Python names its packs `<session_id>-<W>`.
- The ONE digest: `training.pack._manifest_digest` (path, label, out_size per row). The Kotlin
  writer reproduces its byte stream; the Python writer calls it.
- Pixel order in every memmap: `(N, H, W, 3)` uint8 **RGB** (the loader does
  `Image.fromarray`; Kotlin calls `bgrToRgbInPlace`). A writer that reads with OpenCV converts.
- Crop geometry per pack is frozen: `out_size`, `pad_side`, `pad_up` sit on every manifest row
  (`labeling.py` slice row) and all packs in one dataset must agree on `(h, w)`.

## Parallel hazards

- The shared branch will not compile mid-phase. Gate in your own worktree; never touch another
  phase's file to go green; report which files you gated.
- Per-agent green lights come from partial trees. The orchestrator re-runs the gate.
- No untyped seam for NEW types: 01–03 pass `PackRef`/`MultiPack`/`np.ndarray`. Manifest rows
  stay the repo-wide `dict` with the slice keys (`labeling.py:541-563`); CLI result dicts are
  consumed inside the phase that returns them.
- Every module boundary has one test against the real implementation, named in the phase.

## Definition of done (per phase)

Steps committed as named, phase tests green once, scoped ruff/vulture clean, `STATUS.md` row
updated with date, commits, test counts and the exact next step.
