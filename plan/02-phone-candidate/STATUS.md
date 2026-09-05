# STATUS — plan/02-phone-candidate

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-measure.md | todo | |
| 01 | 01-verb.md | todo | |
| 02 | 02-platform.md | todo | |
| 03 | 03-parity.md | todo | |

## Dependencies

00 first, alone (it fixes the rule order and `PHONE_FRAME_OFFSET`). 01 ∥ 02 after 00 is merged into
`feat/phone-candidate`. 03 after both, in the root checkout, after `:desktop:installDist`.

## Manual steps

- Phase 00 runs up to three `replay … label` jobs, one at a time, minutes each, on the user's machine.
- Phase 03 needs `:desktop:installDist` after the 01 merge.

## Notes / discrepancies

- Review 1 (2026-09-06, fresh Opus agent): 17 findings — `video_sync` rows carry no wall clock,
  bundle layouts differ, one bundle has no record, a two-segment record, paired plies share one
  instant, `round(t·fps)` unsafe across segments. Folded in.
- Review 2 (2026-09-06, fresh Opus agent, on the revised pack): the replay ALREADY labels phone
  bundles from the record (`PhoneLog.kt`, `decider phone_log`, pre-roll time rule) — the pack was
  re-based on that: same writer, same decider, `source.crop` kept (read by `realgames.py:546`),
  `gameRecordFor`/`PlyMark.committed`/`videoNsAt` made internal instead of copied, step and job
  kind renamed `phone-record` (`"phone"` is a `ReferenceOrigin`), `chain-run.ts` dispatch and lock
  on the requested step, `videoOf` gains the mirrored top-level video, `chain-run.test.ts` in the
  registry, Phase 00 uses `chesslab.recording.Recording` for the segment walk and measures three
  rules plus the replay's own, the contradictory segment refusal removed, `videoNsAt`'s real type
  (`Double`, `List<Pair<Long, Long>>`) stated.

## Session log

(empty)
