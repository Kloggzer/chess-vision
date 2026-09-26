"""`chesslab realgames` — tracker recordings: confirm, export, read, retime and audit."""

from __future__ import annotations

from pathlib import Path

import typer

from .. import config
from .. import hand_flags as hand_flags_mod
from ..ioutil import write_json
from ..session_store.names import log_path
from ._common import (
    LOOKUP_ERRORS,
    _each_recording,
    _exit_on_bulk_failures,
    _one_or_all,
    csv_list,
    fail_on,
)

realgames_app = typer.Typer(
    help="Real games recorded by the tracker: confirm a candidate against the game that was played.",
    no_args_is_help=True)


@realgames_app.command("confirm")
def realgames_confirm(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    yes: bool = typer.Option(False, "--yes",
                             help="Unprompted: keep every matched ply, drop every unmatched one."),
) -> None:
    """Check a candidate's move list against its `reference.pgn` and record the human's verdict.

    The tracker cannot vouch for its own move list — the Kotlin writer stamps `confirmed: false`
    — and every crop label downstream rests on it. The LCS does the mechanical part; the human
    only decides the candidate-only plies, each printed with the review PNG that shows the
    board at that frame.
    """
    from ..realgames import confirm as rg_confirm

    def ask(move: dict) -> bool:
        return typer.confirm(f"  keep candidate ply {move['ply']} {move['san']}?", default=False)

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        r = rg_confirm.confirm(name, yes=yes, ask=None if yes else ask)
    print(f"[OK] {r['path']} — confirmed, {len(r['reviewed'])} reviewed plies "
          f"({len(r['kept'])} unmatched kept)")


@realgames_app.command("scan-video")
def realgames_scan_video(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    stride: int = typer.Option(0, "--stride", help="Scan every Nth frame (0 = the measured 3)."),
    rescan: bool = typer.Option(False, "--rescan", help="Redo a scan that is already on disk."),
    gate: str = typer.Option("", "--gate", help="Welcher Hand-Gate unter data/models/ misst."),
) -> None:
    """Measure every Nth frame of the recording before anything is picked from it.

    The old export planned first and flagged afterwards, so a flagged slot simply went missing:
    20 % of positions kept their 8 clean boards. Measuring first takes that to 93 %, because the
    clean frames were always there — they were sorted wrong (`docs/frame-scan.md`).
    """
    from .. import framescan

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        r = framescan.scan_video(name, stride=stride or framescan.SCAN_STRIDE, resume=not rescan,
                                 tag=gate)
    if r.get("resumed"):
        print(f"[--] {r['frames']} frames already scanned -> {r['path']} (--rescan to redo)")
        return
    print(f"[OK] {r['frames']} frames measured, {r['hands']} with a hand -> {r['path']}")


@realgames_app.command("export-session")
def realgames_export_session(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    quiet_margin_s: float = typer.Option(1.0, "--quiet-margin-s",
                                         help="Declared hand margin around each commit."),
    dirty: bool = typer.Option(True, "--dirty/--no-dirty",
                               help="Also export the commit windows, flagged `dirty: true`."),
    every: int = typer.Option(3, "--every",
                              help="Sample every Nth source frame of a HAND window. Only with "
                                   "--no-scan; the scan picks per measured frame."),
    per_position: int = typer.Option(8, "--per-position",
                                     help="Clean boards per position (0 = fall back to --every, "
                                          "which only exists with --no-scan). The corpus is short "
                                          "of positions, not of frames."),
    dirty_per_position: int = typer.Option(8, "--dirty-per-position",
                                          help="Boards per position for the dirty pile, "
                                               "withdrawal after the commit first."),
    fit: bool = typer.Option(True, "--fit/--no-fit",
                             help="Fit every written frame's quad to the board's own grid."),
    report_only: bool = typer.Option(False, "--report-only",
                                     help="Compute the yield table, write nothing."),
    no_scan: bool = typer.Option(
        False, "--no-scan",
        help="Ausdruecklich nach Margin-Fenstern planen, ohne Frame-Scan. Der Notausgang, kein "
             "Rueckfall: gemessen laesst dieser Weg 23 % Haende in den Korpus "
             "(`docs/frame-scan.md`). Sonst zieht der Export den Scan selbst, bevor er waehlt."),
    workers: int = typer.Option(4, "--workers",
                                help="Processes for the frame phases. 1 runs everything in this "
                                     "one — the path the equivalence tests measure against."),
    drop_verdicts: bool = typer.Option(
        False, "--drop-verdicts",
        help="Menschliche `unusable`-Urteile auf Frames, die der Export nicht mehr waehlt, "
             "ausdruecklich verwerfen (bleiben nur in der `.bak`). Ohne: der Export verweigert."),
) -> None:
    """Cut a CONFIRMED candidate into its own folder `data/recordings/<name>/` for `chesslab slice`.

    The night-light domain and every occlusion window exist only in the recorded videos, and
    nothing extracted them. A reviewed ply's `fen_after` is the known position from its commit
    to the next one; the margin cuts the hand out of that interval, and `--dirty` keeps those
    cut-out windows as flagged rows for the occluded-class work (specs/53-02/03).

    Every written frame is fitted to the board's own grid on the way out (`--no-fit` to skip),
    so an export lands where `session scan` + `autofix` used to have to drag it afterwards.
    """
    from ..realgames import export as rg_export

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        r = rg_export.export_session(name, quiet_margin_s=quiet_margin_s, every=every,
                                         per_position=per_position or None,
                                         dirty_per_position=dirty_per_position,
                                         dirty=dirty, fit=fit, report_only=report_only,
                                         no_scan=no_scan, workers=workers,
                                         drop_verdicts=drop_verdicts)
    where = "report only, nothing written" if r["report_only"] else str(r["session_dir"])
    print(f"[OK] {len(r['rows'])} rows over {r['segments']} reviewed intervals "
          f"(margin {r['margin_frames']} frames) — {where}")


@realgames_app.command("fit-stored")
def realgames_fit_stored(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_bundles: bool = typer.Option(False, "--all",
                                     help="Every bundle with a stored session, one after the other."),
) -> None:
    """Re-fit an Android Stored session's logged quad and write `files/sessions/<id>/quad-fit.json`.

    The recorder logs the raw MARKER quad and everything downstream assumes one constant outset
    for it, while the best one varies per session — measured 2026-08-15 at up to 14 px, an eighth
    of a cell, in the crops that go into training AND into labelling. The board's own grid says
    where the playing field really is; this writes that as the field quad (margin 0) the pack and
    the review viewer prefer. A frame the fit cannot read is listed in `failed`, never patched.
    """
    from ..realgames import stored as rg_stored

    _one_or_all(name, all_bundles)
    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        done = rg_stored.fit_stored_all() if all_bundles else rg_stored.fit_stored(name)
    failed = sum(len(d["failed"]) for d in done)
    print(f"[OK] {len(done)} stored session(s), {sum(d['fitted'] for d in done)} frames fitted, "
          f"{failed} left to their logged quad")


@realgames_app.command("model-read")
def realgames_model_read(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    model: str = typer.Option(..., "--model", help="Run dir of a model that did NOT train on "
                                                   "this session (refused if it did)."),
    device: str = typer.Option("cpu", "--device", help="cpu | cuda."),
    weights: str | None = typer.Option(None, "--weights",
                                       help="Checkpoint inside the run instead of its default: "
                                            "swa.pt, best_piece.pt. A run holds several and the "
                                            "training picks no winner among them."),
    out: str | None = typer.Option(None, "--out",
                                   help="Write beside model-reads.jsonl instead of over it, e.g. "
                                        "model-reads.p4a-80-clahe.jsonl. Needed for a side "
                                        "measurement: the canonical file feeds the labeling lane."),
) -> None:
    """Read every square of a session with a model into `model-reads.jsonl`.

    This is what `propose-occluded` produced as a side effect while hunting occlusion. SAM 3
    measures occlusion now, so the reads travel alone — and over EVERY board, not just the
    dirty ones, because a wrong piece on a clean board is what the p8 stock trains on.
    """
    from .. import occluded_model

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        res = occluded_model.read_session(name, Path(model), device=device, weights=weights,
                                          out=out)
    print(f"[OK] {res['cells']} Zellen aus {res['boards']} Brettern "
          f"({Path(res['model']).name}) -> {res['path']}")


@realgames_app.command("retime")
def realgames_retime(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    model: str = typer.Option("data/models/p4a-80-clahe", "--model",
                              help="Run dir whose reads place the plies on the video."),
    device: str = typer.Option("cpu", "--device", help="cpu | cuda."),
    stride: int = typer.Option(3, "--stride", help="Read every n-th frame."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report, write nothing."),
    json_out: str | None = typer.Option(None, "--json", help="Also dump the result (plies, agreement) as JSON here."),
) -> None:
    """Move every ply to the frame its position first stood on — read off the video, not the phone.

    The phone commits late when hands are fast (16-20-19: ply 7 timed onto a board that already
    showed ply 9). A position no frame ever showed keeps zero frames and collapses into the next.
    """
    from .. import retime as rt

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        res = rt.retime(name, Path(model), device=device, stride=stride, write=not dry_run)
    if json_out:
        Path(json_out).parent.mkdir(parents=True, exist_ok=True)
        write_json(Path(json_out), res)
    if res.get("refused"):
        print(f"refused: {res['refused']}")
        raise typer.Exit(1)
    moved = ", ".join(f"{p['ply']}:{p['frame_phone']}->{p['frame']}" for p in res["plies"] if p["frame"] != p["frame_phone"])
    print(f"[OK] {res['frames_read']} Frames gelesen, Übereinstimmung {res['agreement']:.2f}, "
          f"{res['moved']} Plies verschoben ({moved or '-'}), ohne Frames: {res['collapsed'] or '-'}"
          f", Bild mit Hand: {res['covered_pictures'] or '-'}"
          f", Intervall widerspricht: {res['disputed'] or '-'}"
          + (f", {res.get('boards', 0)} Review-Bretter" if res['written'] else " (dry run)"))


@realgames_app.command("adopt-dirty")
def realgames_adopt_dirty(
    name: str = typer.Argument(None, help="Recording name under data/recordings/."),
    all_recordings: bool = typer.Option(False, "--all", help="Every recording with a log."),
) -> None:
    """Take the hands a human reported into `log.jsonl` — the matte can start without a re-export.

    A reported frame only reaches the pile through `export-session` otherwise, which re-plans the
    whole recording. This marks the stored rows `occluded`, which is also what makes the coming
    matte RESCUE them: measured coverage on a row still classed `clean` condemns it instead.
    """
    from ..realgames import export as rg_export

    _one_or_all(name, all_recordings)
    names = [p.name for p in sorted(config.DATA.recordings.glob("*")) if log_path(p).exists()]
    total = 0

    def say(target: str, res: dict) -> None:
        nonlocal total
        total += res["set"]
        if res["changed"]:
            print(f"[OK] {target}: {res['set']} von {res['reported']} gemeldeten Frames auf "
                  f"`occluded` gesetzt, {res['retracted']} widerrufene Meldungen zurueckgenommen "
                  f"(Backup {res['backup']})")

    failed = _each_recording(names if all_recordings else [name], rg_export.adopt_reported_dirty,
                             say)
    status = "FAIL" if failed else "OK"
    print(f"[{status}] {total} neu gemeldete Frames warten jetzt auf die Matte — "
          "`chesslab occluders alpha-worker`")
    _exit_on_bulk_failures(failed)


def _per_session(counts: dict[str, int], suffix: str = "") -> None:
    for sid, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {sid:34} {n}{suffix}")


@realgames_app.command("audit-corrections")
def realgames_audit_corrections() -> None:
    """Check the correction ledger against the rules of chess — the audit that PROVES.

    `audit-flags` asks a model and skips every cell a human ruled on, so a wrong correction is
    invisible to it by construction. This one applies the ledger to each frame's FEN and reports
    the boards that then break a rule no occlusion can explain (two kings, nine pawns, 33 pieces).
    """
    from .. import label_audit

    r = label_audit.audit_corrections()
    path = label_audit.write_report(r["rows"], config.DATA.reports / "correction-violations.jsonl")
    print(f"[OK] {r['frames']} frames break a rule after their corrections "
          f"({r['cells']} correction cells of {r['corrections_total']}) -> {path}")
    for rule, n in sorted(r["per_rule"].items(), key=lambda kv: -kv[1]):
        print(f"  {rule:28} {n}")
    _per_session(r["per_session"], " frames")


@realgames_app.command("hand-flags")
def realgames_hand_flags(
    cut: float = typer.Option(hand_flags_mod.DEFAULT_CUT, "--cut",
                              help="Ab dieser Coverage-Vorhersage legt der Occlusion-Kopf eine "
                                   "Verdeckung vor. Tief, weil ein verpasster Handframe 64 Labels "
                                   "verdirbt und ein Fehlalarm einen Blick kostet."),
) -> None:
    """Wo das Modell eine Hand sieht und die Matte keine — die Vorlage der `Hand?`-Lane.

    Braucht `model-reads.jsonl` aus einem Lauf MIT Occlusion-Kopf (`realgames model-read`);
    ein Lauf ohne den Kopf schreibt kein `cov` und wird uebersprungen statt geraten.
    """
    r = hand_flags_mod.hand_flags(cut=cut)
    print(f"[OK] {r['flags']} Zellen in {r['frames']} Frames -> {r['path']}")
    _per_session(r["per_session"])
    if r["without_coverage"]:
        print(f"  ! ohne `cov` uebersprungen ({len(r['without_coverage'])}): "
              f"{', '.join(r['without_coverage'][:6])} — `model-read` dort neu laufen lassen, "
              f"mit einem Lauf MIT Occlusion-Kopf")


@realgames_app.command("frame-hands")
def realgames_frame_hands() -> None:
    """Welche exportierten Frames eine Hand am Brett tragen — die Marke auf jeder Karte.

    Liest `scan.jsonl` (Hand-Gate, 97,7 % Uebereinstimmung mit SAMs Matte auf 9 049 Frames) und
    dekodiert nichts neu. Eine Aufnahme ohne Scan wird uebersprungen statt handfrei geraten.
    """
    from .. import frame_hands as frame_hands_mod

    r = frame_hands_mod.frame_hands()
    print(f"[OK] {r['frames']} Frames mit Hand aus {r['sessions']} Aufnahmen -> {r['path']}")
    _per_session(r["per_session"])
    if r["without_scan"]:
        print(f"  ! ohne scan.jsonl uebersprungen ({len(r['without_scan'])}): "
              f"{', '.join(r['without_scan'][:6])} — `chesslab realgames scan <name>`")
    if r["unscanned_frames"]:
        total = sum(r["unscanned_frames"].values())
        print(f"  ! {total} exportierte Frames ohne Scan-Zeile in "
              f"{len(r['unscanned_frames'])} Aufnahmen — dort heisst keine Zeile UNGEMESSEN, "
              "nicht handfrei")
    if r["export_interrupted"]:
        print(f"[WARN] Export abgebrochen, uebersprungen: {', '.join(r['export_interrupted'])}")


@realgames_app.command("position-flags")
def realgames_position_flags() -> None:
    """Zellen, deren Bild von der Stellung ihres Intervalls abweicht — die Vorlage der Lane.

    Braucht `settle_dev` aus `chesslab session settle-scan`; ohne Messung ist eine Zelle nicht
    unstrittig, sondern ungemessen, und sie wird uebersprungen statt geraten.
    """
    from .. import position_flags as position_flags_mod

    r = position_flags_mod.position_flags()
    print(f"[OK] {r['flags']} Zellen in {r['frames']} Frames -> {r['path']}")
    if r["stale_temporal"]:
        print(f"[WARN] Temporal scans need refreshing: {', '.join(r['stale_temporal'])}")
    if r["unmeasured"]:
        print("[WARN] ohne `session settle-scan`, null Flags heisst hier ungemessen: "
              f"{', '.join(r['unmeasured'])}")
    if r["export_interrupted"]:
        print(f"[WARN] Export abgebrochen, uebersprungen: {', '.join(r['export_interrupted'])}")
    _per_session(r["per_session"])
    i = position_flags_mod.interval_flags()
    print(f"[OK] {i['plies']} Plies geprueft, {i['unseen']} ohne sichtbaren Zug -> {i['path']}")


@realgames_app.command("audit-flags")
def realgames_audit_flags(
    occupancy: bool = typer.Option(False, "--occupancy/--all",
                                   help="Only flags disputing whether the square is OCCUPIED. Use "
                                        "it whenever the proposer comes from another domain: a "
                                        "model that never saw this piece set reads shapes badly, "
                                        "and its type flags are its own gap, not your labels."),
    visible: bool = typer.Option(False, "--visible/--any-coverage",
                                 help="Drop the cells the loss would not learn from anyway: von "
                                      "der Matte als verdeckt gemessen ODER unter "
                                      "`CELL_DARK_MIN` (die Zelle traegt dann kein Signal, ein "
                                      "Widerspruch misst das Licht). Ein Urteil dort erreicht "
                                      "kein Modell."),
    skip: str | None = typer.Option(
        None, "--skip",
        help="Sessions (kommagetrennt) ganz auslassen. Fuer Aufnahmen, deren Karten kein "
             "Label-Problem sind: auf 21-01-04 und 20-48-55 sind die geflaggten Felder halb so "
             "hell wie der Rest, das Modell raet dort auf 3-5 von 255 Graustufen."),
    include_judged: bool = typer.Option(
        False, "--include-judged",
        help="Auch Zellen pruefen, ueber die schon ein Mensch geurteilt hat. Ohne das ist eine "
             "FALSCHE Handkorrektur unfindbar: ihr Urteil nimmt sie aus dem Lauf. Solche Karten "
             "tragen `judged` mit dem Wort des Menschen."),
) -> None:
    """Question every FEN label with the models the proposals already ran — confident learning.

    Per session and class, `t_j` is the mean self-confidence over the cells labelled `j`
    (Northcutt Eqn. 2) and a cell is flagged when the argmax over the classes reaching their own
    threshold is not its label (Eqn. 1), ranked by normalized margin. DERIVED: the run rewrites
    `audit-flags.jsonl` whole, so it is never a ledger — human verdicts live in `corrections.jsonl`.
    """
    from .. import audit_flags as audit_mod

    r = audit_mod.audit_flags(occupancy_only=occupancy, visible_only=visible,
                              include_judged=include_judged, skip=tuple(csv_list(skip)))
    rate = r["flags"] / r["cells_scanned"] if r["cells_scanned"] else 0.0
    for s in r["skipped"]:
        print(f"[SKIP] {s['session']}: {s['reason']}")
    if r["dropped_by_scope"]:
        print(f"[i] scope={r['scope']}: {r['dropped_by_scope']} type/colour flags left out")
    if r["dropped_as_covered"]:
        print(f"[i] coverage={r['coverage_scope']}: {r['dropped_as_covered']} covered cells left out")
    if r["without_matte"]:
        print(f"  ! {len(r['without_matte'])} Aufnahmen ohne matte.jsonl: "
              f"{', '.join(r['without_matte'][:6])} — deren Zellen sind nicht sichtbar GEMESSEN, "
              "nur ungefiltert")
    if r["flags_on_judged"]:
        print(f"[i] {r['flags_on_judged']} davon auf Zellen, die ein Mensch schon beurteilt hat "
              "— dort widerspricht das Modell dem Urteil, nicht der FEN.")
    print(f"[OK] {r['flags']} flags over {r['cells_scanned']} cells ({rate:.1%}) "
          f"in {len(r['sessions'])} sessions -> {r['path']}")
