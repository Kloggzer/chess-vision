# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | todo | |
| 01 | 01-writer.md | todo | |
| 02 | 02-loader.md | todo | |
| 03 | 03-builder.md | todo | |
| 04 | 04-parity.md | todo | |

## Dependencies

00 first, alone. 01 ∥ 02 ∥ 03 after 00 is merged into `feat/session-packs`. 04 after all three.
Shared files: `cli.py` (01 + 03) and `pack.py` (02 + 03), disjoint regions named in entry.md.

## Manual steps

- Phase 04 trains on real data: one session, `--num-workers 1`, one epoch, on the user's machine.
- Phase 01 step 1 needs baseline hashes measured on `main` BEFORE the seam — record them here.

## Notes / discrepancies

- Pack reviewed and revised 2026-09-05 against the repo. Corrections carried in: the crop loop
  is in `_slice_session`, not `slice_session`; the session resolver is `sessions.session_dir`;
  `synth_build.mm_path` does not exist (`_virtual_path`); `crop_fingerprint` is not part of the
  pack schema; Kotlin packs carry `mm://<session_id>/…` without a size suffix; `pack_dataset`
  already refuses `mm://` rows as "fused synth"; `dataset build` takes `--classes`, `train`
  takes `--backbone`; `README.md` has no CLI table.
- `load_packed` is read positionally at ten sites; only `train.py` and `evaluate.py` are in
  scope. `gradcam.py` and eight `scripts/*.py` will refuse pack-built datasets by design.

## Session log

(empty)
