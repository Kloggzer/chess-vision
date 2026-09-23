"""`chesslab occluders` — hands and arms: composites, SAM mattes, coverage, the hand gate."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Annotated

import typer

from .. import composite as composite_mod
from .. import config, locks
from ..ioutil import write_json
from ._common import (
    LOOKUP_ERRORS,
    _exit_on_bulk_failures,
    _one_or_all,
    _out_size,
    _rg_recordings,
    fail_on,
)

occluders_app = typer.Typer(help="Occluders — hands and arms cut free for 2.5D compositing.",
                            no_args_is_help=True)


@occluders_app.command("composite")
def occluders_composite(
    video: str = typer.Option(..., "--video", help="Board clip (ArUco per frame)."),
    fen: str = typer.Option(..., "--fen", help="The position the board holds for the whole clip."),
    occluders: str = typer.Option(str(config.DATA.occluders), "--occluders", help="RGBA tiles."),
    tag: str = typer.Option("comp", "--tag", help="Crop pool `data/crops/<tag>/` + manifest."),
    stride: int = typer.Option(composite_mod.STRIDE, "--stride",
                               help="Frames between two boards. On the turntable that is an "
                                    "ANGLE: 0.43 deg per frame, so 8 is ~3.4 deg."),
    board_size: int = typer.Option(0, "--board-size",
                                   help="Warp-Aufloesung in px. 0 = aus dem Quad der Quelle "
                                        "gemessen, was der Clip wirklich hergibt (`measured_board_"
                                        "size`). Fest 1280 rechnete 1080p-Clips um 1,93x hoch."),
    out_size: str = typer.Option("128x128", "--out-size",
                                 help="Crop size WxH. 128 wie der echte Export: bei 80 liegt der "
                                      "Crop schon auf der Modellgroesse und hat keine Reserve, "
                                      "waehrend echte Crops noch Detail uebrig haben."),
    clean: bool = typer.Option(False, "--clean",
                               help="GAR KEINE Verdecker auflegen. Dann ist der Drehteller "
                                    "Blickwinkel-Material statt Verdeckungs-Material, und die "
                                    "Coverage 0 ist die Wahrheit, keine fehlende Messung."),
    angle_buckets: int = typer.Option(0, "--angle-buckets",
                                      help="Pseudo-Sessions nach WINKEL statt nach Position im "
                                           "Clip. Bei 3,1 Umdrehungen ist ein fortlaufendes "
                                           "Zwoelftel 92 Grad breit; modulo einer Umdrehung sind "
                                           "12 Eimer wirklich 30 Grad."),
    pad_side: float = typer.Option(None, "--pad-side",
                                   help="Randbreite je Seite als Bruchteil der Zelle. Default: aus "
                                        "dem Profil (0,05). Muss zu dem passen, womit die ECHTEN "
                                        "Crops geschnitten wurden — sonst sieht das Modell im "
                                        "Training zwei Rahmungen."),
    seed: int = typer.Option(42, "--seed"),
) -> None:
    """Lay occluders over a board clip and cut crops with an EXACT coverage per cell.

    The second target replaces the hand-marked `occluded` class: coverage is a fraction the
    composite knows, not a yes/no somebody had to judge (docs/occluder-plates.md)."""
    with fail_on(RuntimeError), locks.pool_lock(config.DATA.crops / tag,
                                                f"composite {Path(video).name}"):
        res = composite_mod.build_from_video(
            video=Path(video), plate_dir=Path(occluders),
            out_root=config.DATA.crops / tag,
            manifest=config.DATA.crops / tag / "manifest.jsonl",
            fen=fen, board_size=board_size, out_size=_out_size(out_size),
            stride=stride, seed=seed, clean=clean, angle_buckets=angle_buckets,
            pad_side=pad_side)
    if res.get("error"):
        print(f"[FAIL] {res['error']}")
        raise typer.Exit(1)
    print(f"[OK] {res['crops']} Kacheln aus {res['frames']} Brettern "
          f"({res['skipped']} ohne Marker uebersprungen), "
          f"{res['covered_over_half']} ueber 50% verdeckt ({res['share']:.1%}).")


@occluders_app.command("extract")
def occluders_extract(
    src: str = typer.Option(str(config.DATA.footage / "occluders"), "--in",
                            help="Folder of clips shot over a backdrop."),
    out: str = typer.Option(str(config.DATA.occluders), "--out", help="Where the RGBA tiles land."),
    stride: int = typer.Option(2, "--stride", help="Take every Nth frame before novelty filtering."),
    max_iou: float = typer.Option(0.85, "--max-iou",
                                  help="Overlap above which a pose counts as one already kept."),
    min_cover: float = typer.Option(0.02, "--min-cover",
                                    help="Skip frames covering less than this share of the stage."),
) -> None:
    """Cut hands/arms free of their backdrop into RGBA tiles (alpha = exact coverage).

    No green screen and no clean plate needed: the backdrop is the clip's own temporal median, and
    the matte keys on chroma against it. Shadow is treated as background on purpose — a shaded
    square stays readable, and counting it would rebuild the over-flagging this replaces."""
    from .. import occluders as occ

    clips = sorted(Path(src).glob("*.mp4"))
    if not clips:
        print(f"[FAIL] no .mp4 in {src}")
        raise typer.Exit(1)
    total, summaries, failed = 0, [], []
    for clip in clips:
        s = occ.extract(clip, Path(out), stride=stride, max_iou=max_iou, min_cover=min_cover)
        summaries.append(s)
        total += s.get("written", 0)
        if s.get("error"):
            failed.append(f"{s['video']}: {s['error']}")
        print(f"  {s['video']:<28} {s.get('written', 0):>4} Kacheln  "
              f"(dünn {s.get('skipped_thin', 0)}, doppelt {s.get('skipped_duplicate', 0)})")
    write_json(Path(out) / "occluders.json", summaries)
    # Ein Clip, aus dem kein Frame kam, ist ein gescheiterter Schritt und kein Lauf mit 0 Kacheln.
    if failed:
        print(f"[FAIL] {len(failed)} Clip(s) nicht gelesen: {', '.join(failed)}")
        raise typer.Exit(1)
    print(f"[OK] {total} Kacheln in {out}")


@occluders_app.command("recut")
def occluders_recut(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
) -> None:
    """Recompute coverage for every frame whose alpha a human corrected in the matte view.

    The paint tool writes pixels (`mattes/<stem>.fixed.webp`); the numbers come from here, through
    the same `crops_for_frame` cut the training image goes through. One cut, one truth.
    """
    from .. import matte as matte_mod

    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        res = matte_mod.recut_fixed(name)
    print(f"[OK] {res['recut']} korrigierte Alphas neu geschnitten "
          f"({res['frames']} Zeilen) -> {res['path']}")


@occluders_app.command("recut-coverage")
def occluders_recut_coverage(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session that has a matte.jsonl."),
) -> None:
    """Die `coverage` aus den Alphas neu schneiden, mit der HEUTIGEN Geometrie.

    Die gespeicherte Zahl ist ein Schnappschuss vom Matten; `crop_square` schneidet mit den Ecken
    der aktuellen Log-Zeile. Ein Re-Export verschiebt die Ecken und laesst die Zahl stehen —
    gemessen 2026-09-16 bei 13 von 24 Aufnahmen. SAM laeuft nicht, das ist reine Arithmetik.
    """
    from .. import matte as matte_mod

    _one_or_all(name, all_sessions)
    names = _rg_recordings() if all_sessions else [name]
    total = crossed = failed = 0
    for one in names:
        try:
            res = matte_mod.recut_coverage(one, progress=len(names) == 1)
        except LOOKUP_ERRORS as e:
            print(f"[ERR] {one}: {e}")
            failed += 1
            continue
        total += res["recut"]
        crossed += res["crossed"]
        if res["recut"]:
            print(f"[OK] {one}: {res['recut']} von {res['frames']} Zeilen neu geschnitten, "
                  f"{res['crossed']} Zellen ueber PIECE_VISIBLE_MAX gekippt")
    print(f"[OK] {total} Zeilen neu geschnitten, {crossed} Zellen haben die Schwelle gewechselt "
          f"({len(names) - failed} von {len(names)} Aufnahmen)")
    # Wie `close-seams`: eine uebersprungene Aufnahme traegt ihre Drift weiter, und ein Exit 0
    # sagt das Gegenteil.
    _exit_on_bulk_failures(failed)


@occluders_app.command("close-seams")
def occluders_close_seams(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session that has a matte.jsonl."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report only, touch nothing."),
) -> None:
    """Close the hairline the concept UNION leaves in alphas already on disk, and recut coverage.

    Watch and arm come from two SAM concepts and meet on a line neither covers. `alpha_sam3` does
    this for every new matte; this is the one-off for the ones cut before it did.
    """
    from .. import matte as matte_mod

    _one_or_all(name, all_sessions)
    names = _rg_recordings() if all_sessions else [name]
    total = {"closed": 0, "frames": 0, "crossed": 0}
    failed = 0
    for one in names:
        try:
            res = matte_mod.close_seams(one, dry_run=dry_run, progress=not all_sessions)
        except (*LOOKUP_ERRORS, OSError) as e:
            print(f"[ERR] {one}: {e}")
            failed += 1
            continue
        for k in total:
            total[k] += res[k]
        if res["closed"]:
            print(f"[OK] {one}: {res['closed']}/{res['frames']} Alphas geschlossen, "
                  f"+{res['px']} px, {res['crossed']} Zellen wechseln die Schwelle"
                  f"{' (dry-run)' if dry_run else ''}")
    if len(names) > 1:
        print(f"[OK] gesamt {total['closed']}/{total['frames']} Alphas, "
              f"{total['crossed']} Zellen wechseln PIECE_VISIBLE_MAX")
    _exit_on_bulk_failures(failed)


@occluders_app.command("gate-train")
def occluders_gate_train(
    backbone: str = typer.Option(
        "mobilenetv3_small_100", "--backbone",
        help="timm-Name. `mobilenet_v3_small` ist KEINER — diese Vorgabe war bis 2026-09-16 falsch und liess jeden Lauf ohne --backbone sterben."),
    size: int = typer.Option(320, "--size", help="Kantenlaenge, in der der Kopf das Brett sieht."),
    epochs: int = typer.Option(8, "--epochs"),
    holdout: int = typer.Option(4, "--holdout", help="GANZE Sessions, die nur geprueft werden."),
    pin: Annotated[list[str] | None, typer.Option(
        "--holdout-session", help="Holdout beim NAMEN nennen (mehrfach). Ohne das waehlt --holdout "
                                  "jede n-te und der Satz wandert, sobald der Korpus waechst — "
                                  "zwei Karten sind dann nicht vergleichbar.")] = None,
    batch: int = typer.Option(32, "--batch"),
    workers: int = typer.Option(4, "--workers", help="Loader-Prozesse; 8 ist die Obergrenze."),
    lr: float = typer.Option(3e-4, "--lr"),
    tag: str = typer.Option(..., "--tag", help="Ordner unter data/models/ als `hand-gate-bn-<tag>`. "
                                               "Pflicht: ohne ihn waere der Lauf unadressierbar."),
) -> None:
    """Den Hand-Gate auf SAM 3s Urteil trainieren — das Ja/Nein, das kein Alpha braucht.

    SAM ist der Lehrer UND der Pruefer: die zurueckgehaltenen Sessions werden gegen sein Urteil
    gemessen, nicht gegen ein Frame-Sample derselben Beleuchtung.
    """
    from .. import hand_gate

    r = hand_gate.train_gate(backbone=backbone, size=size, epochs=epochs, holdout=holdout,
                             batch=batch, workers=workers, lr=lr, tag=tag, pinned_holdout=pin)
    c = r["chosen"]
    print(f"[OK] {r['train_boards']} Bretter trainiert, {r['val_boards']} geprueft "
          f"({r['val_hands']} mit Hand) -> {r['path']}")
    cov = r["coverage"]
    print(f"     Veto {c['thr']}: recall {c['recall']}, {c['false_pos']} saubere Bretter verworfen "
          f"({100 * c['clean_lost']:.1f} %)")
    print(f"     Felder > 0.15: recall {cov['recall']} praezision {cov['precision']}, "
          f"MAE {cov['mae']} | {r['ms_per_board']} ms je Brett")


@occluders_app.command("gate-scan")
def occluders_gate_scan(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all", help="Jede Session mit gespeicherten Brettern."),
    tag: str = typer.Option("", "--tag", help="Welcher Lauf unter data/models/ gelesen wird."),
) -> None:
    """Den Hand-Gate ueber eine Session laufen lassen -> `gate.jsonl` neben `matte.jsonl`.

    Getrennte Datei mit Absicht: SAMs Messung und die des Schuelers duerfen nie in derselben Zeile
    stehen, sonst weiss spaeter niemand, wessen Zahl in den Trainingssatz gelaufen ist.
    """
    from .. import hand_gate
    from ..realgames import bundles_with_stored

    names = bundles_with_stored() if all_sessions else [name]
    if not names or names == [None]:
        raise typer.BadParameter("Name oder --all angeben.")
    for one in names:
        r = hand_gate.gate_scan(one, tag=tag)
        lost = f", {r['unreadable']} Bretter NICHT lesbar" if r["unreadable"] else ""
        print(f"[OK] {one}: {r['frames']} Bretter, {r['veto']} mit Veto{lost} -> {r['path']}",
              flush=True)


@occluders_app.command("status")
def occluders_status(
    name: str | None = typer.Argument(None, help="Recording name; ohne Argument alle."),
) -> None:
    """Luecken und Waisen je Aufnahme: dirty-Frames ohne Matte, Matten ohne Frame.

    Der Export waehlt die Frames, `matte.jsonl` haengt nur an — niemand gleicht beide ab, und eine
    fehlende Matte sieht im Training aus wie ein freies Feld (CLAUDE.md, "Coverage Matte Trap").
    """
    from .. import matte as matte_mod

    names = [name] if name else _rg_recordings()
    gaps = other = orphans = failed = 0
    for n in names:
        try:
            res = matte_mod.matte_status(n)
        except Exception as exc:  # noqa: BLE001
            # Laut und im Exit-Code: ungezaehlt ist nicht null, und die Summe darunter las eine
            # unlesbare Aufnahme bisher als "keine Luecken" (wie `recut-coverage` es nicht tut).
            print(f"[FAIL] {n}: {exc}")
            failed += 1
            continue
        gaps += len(res["missing"])
        other += len(res["missing_other"])
        orphans += len(res["orphans"])
        if res["missing"] or res["orphans"]:
            rest = f", {len(res['missing_other'])} nur mit --reason all" if res["missing_other"] else ""
            print(f"[!!] {n}: {res['matted']}/{res['dirty']} gemattet, "
                  f"{len(res['missing'])} fehlen{rest}, {len(res['orphans'])} Waisen")
    tail = f", {other} nur mit --reason all" if other else ""
    print(f"[{'!!' if failed else 'OK'}] {len(names) - failed} von {len(names)} Aufnahmen "
          f"gemessen: {gaps} fehlende Matten{tail}, {orphans} Waisen")
    _exit_on_bulk_failures(failed)


@occluders_app.command("alpha-worker")
def occluders_alpha_worker(
    names: Annotated[list[str] | None, typer.Argument(
        help="Recording names under data/recordings/. Mehrere laufen in EINEM Prozess.")] = None,
    all_sessions: bool = typer.Option(False, "--all",
                                      help="Every exported session in ONE process — the weights "
                                           "load once instead of per session (6-10 min each)."),
    limit: int = typer.Option(0, "--limit",
                              help="Target mattes per session (0 = all). Counts what is already "
                                   "there, so a second round only fills the gap."),
    reason: str = typer.Option("occluded", "--reason",
                               help="Which dirty rows to matte: `occluded` (FEN still valid, the "
                                    "labelable ones) or `all`."),
    reported: bool = typer.Option(False, "--reported",
                                  help="Re-measure exactly the frames a human reported dirty in "
                                       "the labeling stream. Overrides --limit and any matte "
                                       "already there — the report is a verdict on that matte."),
    wanted: bool = typer.Option(False, "--wanted",
                                help="Genau die strittigen Frames, die ein Mensch in der "
                                     "Frame-Lane zur Matte geschickt hat (`matte-wanted`). "
                                     "Sie liegen auf dem dirty-Stapel, aber nicht als "
                                     "`occluded` — der Stapel-Lauf sieht sie nie."),
    temporal: bool = typer.Option(False, "--temporal",
                                  help="Exactly the frames `session temporal-adopt` wrote; SAM's "
                                       "row then lands behind ours and wins in read_matte."),
) -> None:
    """Cut the hand out of a session's dirty pile with SAM 3: alpha per frame, coverage per square.

    Runs long by design (1,87 s a frame, gemessen 2026-09-14) and appends every row as it lands, so it can be stopped
    and resumed at any point. The pile itself was chosen by the frame scan (`docs/frame-scan.md`).
    """
    from .. import matte as matte_mod

    config.cap_blas_threads()          # GPU path: the BLAS arenas are 3.2 GB of dead reservation
    matte_mod.exit_with_parent()

    wanted_names = list(names or ())
    _one_or_all(wanted_names, all_sessions, "names")
    flags = {"reported": reported, "wanted": wanted, "temporal": temporal}
    if all_sessions:
        wanted_names = _rg_recordings()
    if len(wanted_names) > 1:
        # EIN Prozess: die Gewichte kosten 7-9 min, die Arbeit danach Sekunden je Frame.
        resolver = (lambda n: matte_mod.flagged_frames(n, **flags)) if any(flags.values()) else None
        res = matte_mod.alpha_worker_all(wanted_names, limit=limit or None, reason=reason,
                                         frames_for=resolver)
        # `[OK]` neben stundenlangen Ausfaellen war der dritte Fund derselben Form: der
        # Ausstiegscode ist das einzige, was eine Automation von diesem Lauf liest.
        for bad in res["failed"]:
            print(f"[ERR] {bad['session']}: {bad['error']}", flush=True)
        state = "OK" if not res["failed"] else "TEIL"
        print(f"[{state}] {res['alphas']} Alphas ueber {res['sessions']} Sessions "
              f"({res['already']} lagen schon vor, {len(res['failed'])} gescheitert)", flush=True)
        sys.stdout.flush()
        os._exit(1 if res["failed"] else 0)
    name = wanted_names[0]
    frames = matte_mod.flagged_frames(name, **flags)
    if any(flags.values()):
        if not frames:
            print(f"[OK] {name}: nichts zu messen fuer diese Auswahl")
            raise typer.Exit(0)
        print(f"[i] {len(frames)} frames selected, measuring those")
    with fail_on(*LOOKUP_ERRORS, tag="ERR"):
        res = matte_mod.alpha_worker(name, limit=limit or None, reason=reason, frames=frames)
    skipped = ", ".join(f"{k}: {v}" for k, v in sorted(res["skipped"].items())) or "keine"
    print(f"[OK] {res['alphas']} Alphas aus {res['frames']} Frames "
          f"({res['already']} lagen schon vor) -> {res['path']}", flush=True)
    print(f"     uebersprungen — {skipped}", flush=True)
    # Measured twice on 2026-08-19: the run finishes its frames, writes them, and then never
    # exits — the ROCm teardown wedges. Everything is on disk (each row is appended and flushed),
    # so leave without unwinding — but drop the weights first, like the `--all` path: a wedge
    # BEFORE `os._exit` left the worker alive holding its VRAM (measured 2026-08-21).
    matte_mod.unload_models()
    sys.stdout.flush()
    os._exit(0)
