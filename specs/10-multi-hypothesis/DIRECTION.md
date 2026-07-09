# DIRECTION — 10 multi-hypothesis tracking (beam search over game states)

> Approved direction, NOT yet a spec pack. Spec it only after pack 09
> (illegal-move referee) is implemented AND live-validated — 09 reduces how
> often branching is needed, and its regression clips become this pack's test
> set. Origin: user idea, session 2026-07-09 ("on uncertainty open branches
> until we are certain again — one branch finally aligns with the current
> state, even 5 turns into the future").

## The idea, validated

This is multiple-hypothesis tracking / beam search over game states (HMM-style
smoothing). Instead of committing or stalling on ambiguity, keep K candidate
boards ("branches"), score each frame's evidence against each branch's legal
moves, prune branches whose evidence stays unexplained, merge branches that
reach the same position, and commit (collapse to one branch) only when a single
branch dominates — possibly several plies later. It subsumes today's ad-hoc
pair look-ahead (`_pair_candidate`, `tracker.py:2371`) and endpoint candidate
(`_single_endpoint_candidate`, `tracker.py:2415`), and turns the ambiguity
dead-end (`_generate_hypothesis` "ambiguous change — please move cleanly",
`tracker.py:2361-2368`) into deferred resolution instead of a user prompt.

Verdict from the design discussion: **not nonsense — worth doing**, but it is
a structural rework of `_try_detect` steps 6–9, not a patch.

## What it does and does not fix

- Fixes: ambiguity between LEGAL lines (fast play, low-contrast moves,
  temporarily occluded confirmations). A branch that "aligns with the current
  state 5 turns later" wins retroactively; its whole line commits at once.
- Does NOT fix illegal moves: no branch contains an illegal move. The pack-09
  alarm remains the answer there and must keep working unchanged — do not sell
  branching as a replacement.

## Design constraints (decided in discussion — carry into the spec)

1. **Bounded:** K ≤ 4 live branches, divergence depth ≤ 4 plies, evidence
   filter for branching = the existing `z >= z_thr/2` soft gate (keeps the
   branching factor tiny). Branches reaching the same FEN merge (keep the
   higher accumulated LL).
2. **Shared base truth:** branches diverge in FEN, share the reference image.
   Evidence (z-scores vs reference) is interpreted per branch via its own
   `legal_moves` from its own FEN. Accumulated LL per branch decides.
3. **Re-anchor only on consensus:** the quiet-board re-anchor
   (`tracker.py:2118-2126`) may run ONLY when every live branch agrees the
   board is quiet w.r.t. its own state — otherwise one branch's uncommitted
   move gets baked into everyone's reference. (Same shape as the pack-09
   alarm re-anchor block.)
4. **Noise learning exclusion = union** of all branches' candidate squares
   (slightly less learning, correct).
5. **CNN is the arbiter:** an identity observation (`board_matches_identity`,
   `cnn_recovery.py:216`) scores every branch's FEN; a clear winner collapses
   the beam and commits the winning line atomically (reuse the atomic
   sequence-commit pattern from `_cnn_tick`, `tracker.py:1461-1495`).
   Recovery's deep search (`derive_moves_deep`) becomes branch seeding, not a
   separate mechanism.
6. **UX must be honest:** the UI shows "2 candidate lines" (SANs + LL) instead
   of a single note while the beam is open; history only extends on collapse.
   Spectator server gets the same additive status field.
7. **Interaction with pack 09:** while the illegal-move alarm is active the
   beam is frozen (no branching, no collapse) — alarm resolution first.
8. **Kotlin port debt:** this rework lands in the Python reference first;
   `android/engine` (specs/08) must be ported in the same follow-up phase that
   ports pack 09.

## Open questions to resolve before speccing

- Commit semantics for feedback/recording: session recording and good/bad
  feedback (`_record_decision`) assume one move per commit — define how a
  multi-ply retroactive commit records provenance per ply.
- Confirmer (`_confirmer`) role: per-branch confirmers vs one beam-level
  confirmer.
- Undo across a collapsed multi-ply line.
- Memory/CPU: per-branch state is tiny (FEN + LL + pending SANs), but the
  per-frame scoring loop runs per branch — measure `_diff_ms` impact at K=4.

## When ready

Spec as a phase pack (`specs/10-multi-hypothesis/entry.md` + phases), model
assignment: the beam core is algorithmic-risk (fable or opus), UI/status
surfacing is delegable (opencode/DeepSeek).
