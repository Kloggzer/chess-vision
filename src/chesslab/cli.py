"""Typer entrypoint. One CLI `chesslab`; each stage adds its own subcommands."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import typer

from . import calibration as calibration_mod
from . import collect as collect_mod
from . import config
from . import dataset as dataset_mod
from . import doctor as doctor_mod
from . import labeling as labeling_mod

app = typer.Typer(
    name="chesslab",
    help="Build an auto-labeled chess-piece dataset and train a per-square model.",
    no_args_is_help=True,
    add_completion=False,
)

calibrate_app = typer.Typer(help="Stufe 1 — Kamera/Brett-Geometrie kalibrieren.", no_args_is_help=True)
app.add_typer(calibrate_app, name="calibrate")

collect_app = typer.Typer(help="Stufe 3 — Stellungen aufnehmen (Rohframe + FEN ins Session-Log).", no_args_is_help=True)
app.add_typer(collect_app, name="collect")

dataset_app = typer.Typer(help="Stufe 4 — Datensatz-Konsistenz.", no_args_is_help=True)
app.add_typer(dataset_app, name="dataset")

experiment_app = typer.Typer(help="Stufe 7 — Geometrie×Photometrie Bake-Off.", no_args_is_help=True)
app.add_typer(experiment_app, name="experiment")

synth_app = typer.Typer(help="Synthetische Daten-Pipeline (Blender-Renderer).", no_args_is_help=True)
app.add_typer(synth_app, name="synth")


@app.callback()
def _root() -> None:
    """chesslab — staged tool; each stage adds subcommands. See `chesslab --help`."""


@app.command()
def doctor(
    gpu: bool = typer.Option(False, "--gpu", help="Zusätzlich die ROCm/PyTorch-GPU-Validierung (Pflicht vor Training)."),
    camera: int | None = typer.Option(None, "--camera", help="Kamera-Check für Index N (öffnen + ein Frame lesen)."),
    json_out: bool = typer.Option(False, "--json", help="Maschinenlesbaren JSON-Report zusätzlich ausgeben."),
) -> None:
    """Pre-flight: Python, App-Deps, optional GPU (ROCm) und Kamera validieren."""
    code = doctor_mod.run(gpu=gpu, camera=camera, json_out=json_out)
    raise typer.Exit(code)


@calibrate_app.command("check")
def calibrate_check(
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile", help="Profilname."),
    camera: int = typer.Option(0, "--camera", help="Kamera-Index."),
) -> None:
    """Live-Overlay des 8x8-Rasters auf das Kamerabild zur Sichtkontrolle."""
    raise typer.Exit(calibration_mod.calibrate_check(camera=camera, profile=profile))


@calibrate_app.command("list")
def calibrate_list() -> None:
    """Vorhandene Kalibrierungsprofile anzeigen."""
    raise typer.Exit(calibration_mod.calibrate_list())


@calibrate_app.command("markers")
def calibrate_markers(
    out: str = typer.Option("data/calibration/markers.png", "--out", help="Ziel-PNG des Marker-Blatts."),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict", help="ArUco-Dictionary."),
    marker_px: int = typer.Option(300, "--marker-px"),
) -> None:
    """Druckbares ArUco-Marker-Blatt erzeugen (an a8/h8/h1/a1 kleben)."""
    p = calibration_mod.generate_markers(out, dict_name=dict_name, marker_px=marker_px)
    print(f"[OK] Marker-Blatt: {p} — ausdrucken, ausschneiden, je einen Marker mittig auf die "
          "Ecken a8/h8/h1/a1 kleben. Dann `chesslab calibrate auto`.")


@calibrate_app.command("auto")
def calibrate_auto(
    camera: int = typer.Option(0, "--camera"),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    board_size: int = typer.Option(config.DEFAULT_BOARD_SIZE, "--board-size"),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict"),
    margin: float = typer.Option(0.06, "--margin", help="Anteil, um den die Marker AUSSERHALB des Spielfelds sitzen (im --preview live mit w/e justieren)."),
    min_markers: int = typer.Option(4, "--min-markers", help="Pflicht-Marker (4 = robust; 2/3 nur bei top-down Kamera sinnvoll)."),
    preview: bool = typer.Option(False, "--preview", help="Marker-Box + Spielfeld-Box live zeigen (w/e justieren, s=save)."),
) -> None:
    """Automatisch über ArUco-Marker kalibrieren (Marker außen, Spielfeld eingerückt; kein Klicken)."""
    raise typer.Exit(calibration_mod.calibrate_auto(camera=camera, profile=profile, board_size=board_size,
                                                    dict_name=dict_name, margin=margin, preview=preview,
                                                    min_markers=min_markers))


@collect_app.command("pgn")
def collect_pgn(
    pgn: str = typer.Option(..., "--pgn", help="PGN-Datei."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    every: int = typer.Option(1, "--every", help="nur jeden N-ten Halbzug aufnehmen."),
    session: str = typer.Option(None, "--session", help="Session-ID (Default: Timestamp)."),
    ui: bool = typer.Option(False, "--ui", help="Live-Dashboard (Stufe 6) anzeigen."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target", help="Ziel-Samples je Klasse (UI)."),
) -> None:
    """PGN-Replay: Partie physisch nachstellen, nach jedem Halbzug aufnehmen."""
    raise typer.Exit(collect_mod.collect_pgn(pgn=pgn, profile=profile, camera=camera, every=every,
                                             session=session, ui=ui, target=target))


@collect_app.command("live")
def collect_live(
    start_fen: str = typer.Option(None, "--start-fen", help="Startstellung als FEN (sonst Grundstellung)."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    session: str = typer.Option(None, "--session"),
    ui: bool = typer.Option(False, "--ui", help="Live-Dashboard (Stufe 6) anzeigen."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target", help="Ziel-Samples je Klasse (UI)."),
) -> None:
    """Freies Spiel: Zug eintippen (SAN/UCI), dann aufnehmen."""
    raise typer.Exit(collect_mod.collect_live(start_fen=start_fen, profile=profile, camera=camera,
                                              session=session, ui=ui, target=target))


@collect_app.command("play")
def collect_play(
    strategy: str = typer.Option("random", "--strategy", help="random | stockfish | coverage | sweep"),
    max_plies: int = typer.Option(40, "--max-plies", help="max. Halbzüge der generierten Partie (random/stockfish)."),
    seed: int = typer.Option(config.SEED, "--seed", help="Seed für strategy=random."),
    stockfish_path: str = typer.Option(None, "--stockfish-path", help="Pfad zum UCI-Binary (für stockfish)."),
    start_fen: str = typer.Option(None, "--start-fen", help="Startstellung (sonst Grundstellung)."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    session: str = typer.Option(None, "--session"),
    ui: bool = typer.Option(False, "--ui", help="Live-Dashboard (Stufe 6) anzeigen."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target"),
    sets: int = typer.Option(1, "--sets", help="Anzahl physischer Figurensätze (coverage/sweep): ×N je Klasse."),
    count: int = typer.Option(20, "--count", help="Anzahl dichter Aufbauten (nur strategy=coverage)."),
    passes: int = typer.Option(1, "--passes", help="sweep: Wiederholungen je Farbe (je Pass 8 Fotos)."),
    pieces: str = typer.Option("special", "--pieces", help="sweep: special | pawn | all."),
    together: bool = typer.Option(False, "--together", help="sweep: beide Farben gleichzeitig (halbe Fotozahl)."),
    offset: int = typer.Option(0, "--offset", help="sweep: Linien→Figur-Zuordnung verschieben (0..7)."),
    auto_offset: bool = typer.Option(False, "--auto-offset", help="sweep: Offset automatisch (zyklisch über Sessions)."),
) -> None:
    """Engine spielt die Partie (random/stockfish), coverage: dichte Aufbauten gegen seltene Klassen,
    oder sweep: Figurenreihe wandert systematisch übers Brett. Du stellst nach und fotografierst."""
    raise typer.Exit(collect_mod.collect_play(strategy=strategy, max_plies=max_plies, seed=seed,
                                              stockfish_path=stockfish_path, start_fen=start_fen,
                                              profile=profile, camera=camera, session=session,
                                              ui=ui, target=target, sets=sets, count=count,
                                              passes=passes, pieces=pieces, together=together,
                                              offset=offset, auto_offset=auto_offset))


@app.command("ui")
def ui_cmd(
    sessions: str = typer.Option(None, "--sessions", help="Sessions-Verzeichnis (Default: data/sessions)."),
    manifest: str = typer.Option(None, "--manifest", help="optionales Manifest (nur informativ)."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target"),
) -> None:
    """Stufe 6 — Trainingsdaten-Dashboard standalone (ohne laufende Aufnahme)."""
    from .collect_ui import run_ui

    raise typer.Exit(run_ui(sessions_dir=sessions, manifest=manifest, target_per_class=target))


@app.command("slice")
def slice_cmd(
    session: str = typer.Option(None, "--session", help="Session-ID slicen."),
    all_sessions: bool = typer.Option(False, "--all", help="alle Sessions slicen."),
    profile: str = typer.Option(None, "--profile", help="Profil überschreiben (Default: aus session.yaml)."),
    pad_up: float = typer.Option(None, "--pad-up", help="Crop-Höhe nach oben überschreiben."),
    pad_side: float = typer.Option(None, "--pad-side", help="seitliche Crop-Erweiterung überschreiben."),
    out_size: str = typer.Option(None, "--out-size", help="Crop-Größe WxH, z.B. 96x128."),
    preview: str = typer.Option(None, "--preview", help="Session-ID: Label vs. Crop visuell prüfen."),
    geometry: str = typer.Option("warp", "--geometry", help="Crop-Geometrie: warp | box3d."),
    photometry: str = typer.Option("none", "--photometry", help="Filter: none | clahe | grayworld | gamma."),
    piece_height: float = typer.Option(config.EXP_PIECE_HEIGHT_CELLS, "--piece-height",
                                       help="box3d: Extrusionshöhe in Zellen."),
    variant_tag: str = typer.Option(None, "--variant-tag",
                                    help="Crops/Manifest variantengetaggt ablegen (squares__<tag>/)."),
) -> None:
    """Session-Logs -> 64 gelabelte Square-Crops je Stellung + Manifest."""
    raise typer.Exit(labeling_mod.run_slice(
        session=session, slice_all=all_sessions, profile=profile,
        pad_up=pad_up, pad_side=pad_side, out_size=out_size, preview=preview,
        geometry_mode=geometry, photometry=photometry, piece_height_cells=piece_height,
        variant_tag=variant_tag,
    ))


def _csv_list(s: str) -> list[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


@experiment_app.command("run")
def experiment_run(
    sessions: str = typer.Option(..., "--sessions", help="Komma-getrennte Session-IDs."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries", help="z.B. warp,box3d."),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries",
                                     help="z.B. none,clahe,grayworld,gamma."),
    heads: str = typer.Option("combined", "--heads", help="Modell-Köpfe: combined,factored,twostage."),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    seed: int = typer.Option(config.SEED, "--seed"),
    backbone: str = typer.Option(config.DEFAULT_BACKBONE, "--backbone"),
    eval_split: str = typer.Option("test", "--eval-split", help="Metrik-Split: test | val (bei <3 Sessions val)."),
    force: bool = typer.Option(False, "--force", help="alle Stages neu (sonst fertige überspringen)."),
) -> None:
    """Volles Grid Geometrie×Photometrie×Kopf trainieren + Vergleichstabelle nach Board-Accuracy."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.run_experiment(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads),
        epochs=epochs, seed=seed, backbone=backbone, eval_split=eval_split, force=force))


@experiment_app.command("table")
def experiment_table(
    sessions: str = typer.Option(..., "--sessions", help="Komma-getrennte Session-IDs."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries"),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries"),
    heads: str = typer.Option("combined", "--heads"),
    eval_split: str = typer.Option("test", "--eval-split"),
) -> None:
    """Vergleichstabelle aus bereits trainierten Runs neu schreiben (kein Re-Training)."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.rebuild_table(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads),
        eval_split=eval_split))


@experiment_app.command("list")
def experiment_list(
    sessions: str = typer.Option("", "--sessions", help="(optional, für die Tabellen-Spalten irrelevant)."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries"),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries"),
    heads: str = typer.Option("combined", "--heads"),
) -> None:
    """Status je Variante: sliced / dataset / train / eval."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.variant_status(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads)))


@app.command("stats")
def stats_cmd(
    manifest: str = typer.Option(None, "--manifest", help="Manifest-Pfad (Default: data/manifests/squares.jsonl)."),
    json_out: bool = typer.Option(False, "--json"),
) -> None:
    """Datensatz-Report: 13-Klassen-Verteilung + Hell/Dunkel-Abdeckung + Warnungen."""
    raise typer.Exit(dataset_mod.run_stats(manifest=manifest, json_out=json_out))


@app.command("split")
def split_cmd(
    val_frac: float = typer.Option(config.DEFAULT_VAL_FRAC, "--val-frac"),
    test_frac: float = typer.Option(config.DEFAULT_TEST_FRAC, "--test-frac"),
    max_empty_ratio: float = typer.Option(config.DEFAULT_MAX_EMPTY_RATIO, "--max-empty-ratio"),
    max_class_ratio: float | None = typer.Option(None, "--max-class-ratio", help="Jede Figurenklasse auf R * kleinste Figurenklasse deckeln (balanciert Bauern herunter; nur train)."),
    seed: int = typer.Option(config.SEED, "--seed"),
    allow_degenerate: bool = typer.Option(False, "--allow-degenerate", help="Degenerierten Split zulassen (Klasse nur in einer Session o.ä.)."),
) -> None:
    """Sessionbasierter Split (gegen Data Leakage) + Klassen-Balancing (nur train) -> split.json."""
    raise typer.Exit(dataset_mod.run_split(val_frac=val_frac, test_frac=test_frac,
                                           max_empty_ratio=max_empty_ratio, seed=seed,
                                           max_class_ratio=max_class_ratio,
                                           allow_degenerate=allow_degenerate))


@dataset_app.command("verify")
def dataset_verify() -> None:
    """Konsistenz-Checks: Dateien existieren/ladbar, out_size, Labels, Split-Disjunktheit."""
    raise typer.Exit(dataset_mod.run_verify())


@app.command("ingest")
def ingest_cmd(
    adapter: str = typer.Argument(..., help="chesscog | chessred | synthetic (externer/synthetischer Datensatz)."),
    root: str = typer.Argument(..., help="Pfad zum lokal entpackten Datensatz."),
    tag: str | None = typer.Option(None, "--tag", help="Name für Sessions/Datensatz (Default: pretrain-<adapter>)."),
    geometry: str = typer.Option("warp", "--geometry", help="warp (empfohlen, keine Intrinsics) | box3d."),
    photometry: str = typer.Option("none", "--photometry", help="none | clahe | grayworld | gamma — muss zum Finetune-Datensatz passen."),
    board_size: int = typer.Option(900, "--board-size", help="Warp-Auflösung (px). Moderat halten (Handy-Quelle), sonst Hochskalier-Unschärfe."),
    limit: int | None = typer.Option(None, "--limit", help="Nur die ersten N Bilder (Schnelltest)."),
    debug_overlay: int = typer.Option(0, "--debug-overlay", help="N Frames warpen + FEN-Labels einblenden (Sichtprüfung gegen Label-Vertauschung)."),
    no_build: bool = typer.Option(False, "--no-build", help="Nur slicen, keinen Datensatz bauen."),
) -> None:
    """Externen Datensatz (chesscog/ChessReD2K) in unser Crop-Format ingestieren → Pretrain-Datensatz.

    Danach: `chesslab train --dataset <tag> --head twostage --backbone mobilenet_v3_small`, dann auf
    den eigenen Sessions `train --dataset <deine> --resume <pretrain-run>`. WICHTIG: vor dem großen
    Lauf mit `--debug-overlay 8` die Orientierung prüfen (falsche Ecken vertauschen alle Labels still)."""
    from . import ingest as ingest_mod

    t = tag or f"pretrain-{adapter.lower()}"
    try:
        summary = ingest_mod.run_ingest(
            adapter, root, tag=t, geometry=geometry, photometry=photometry, board_size=board_size,
            limit=limit, debug_overlay_n=debug_overlay, build=not no_build)
    except (ValueError, FileNotFoundError) as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1)
    print(f"[OK] {summary['adapter']}: {summary['items']} Bilder, {summary['sessions']} Sessions, "
          f"{summary['crops']} Crops -> {summary['manifest']}")
    if summary.get("overlays"):
        print(f"[OK] Sichtprüfung: {len(summary['overlays'])} Overlay-PNGs in "
              f"{Path(summary['overlays'][0]).parent} — bitte ansehen, BEVOR du das große Pretrain startest.")
    if summary.get("dataset"):
        print(f"[OK] Datensatz '{summary['dataset']}' gebaut: {summary.get('dataset_counts')}")
    raise typer.Exit(0)


@dataset_app.command("build")
def dataset_build_cmd(
    name: str = typer.Argument(..., help="Name des Datensatzes."),
    sessions: str = typer.Option(..., "--sessions", help="Komma-getrennte Session-IDs."),
    per_cell_cap: int = typer.Option(config.DEDUP.per_cell_cap, "--cap", help="max. Crops je (Session,Feld,Figur)."),
    no_phash: bool = typer.Option(False, "--no-phash", help="Perceptual-Hash-Dedup abschalten."),
    hamming: int = typer.Option(config.DEDUP.phash_hamming, "--hamming"),
    rotate: bool = typer.Option(True, "--rotate/--no-rotate", help="90/180/270°-Augmentation (Default an)."),
    allow_degenerate: bool = typer.Option(False, "--allow-degenerate", help="Degenerierten Datensatz zulassen (Klasse nur in einer Session o.ä.)."),
) -> None:
    """Benannten Datensatz aus einer Session-Auswahl bauen (filtern -> dedup -> rotation -> split)."""
    from . import dataset_build as db

    sids = [s.strip() for s in sessions.split(",") if s.strip()]
    try:
        res = db.build_dataset(name, sids, per_cell_cap=per_cell_cap, phash_enabled=not no_phash,
                               phash_hamming=hamming, rotations=(config.DEDUP.rotations if rotate else (0,)),
                               allow_degenerate=allow_degenerate)
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1)
    c = res["counts"]
    print(f"[OK] Datensatz '{res['name']}': roh {c['raw']} -> dedup {c['after_dedup']} -> "
          f"final {c['final']}. Split: {res['split_counts']}.")
    for w in res["warnings"]:
        print(f"  ! {w}")


@dataset_app.command("list")
def dataset_list_cmd() -> None:
    """Vorhandene Datensätze auflisten."""
    from . import dataset_build as db

    for d in db.list_datasets():
        print(f"{d['name']}: {d['n_sessions']} Sessions, {d['counts'].get('final', '?')} Crops, "
              f"split {d.get('split_counts', {})}")


@dataset_app.command("delete")
def dataset_delete_cmd(name: str = typer.Argument(...)) -> None:
    """Datensatz löschen (Rohmaterial/Sessions bleiben)."""
    from . import dataset_build as db

    db.delete_dataset(name)
    print(f"[OK] Datensatz '{name}' gelöscht.")


@app.command("train")
def train_cmd(
    backbone: str = typer.Option(config.DEFAULT_BACKBONE, "--backbone", help="smallcnn | mobilenet_v3_small"),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    batch_size: int = typer.Option(config.DEFAULT_BATCH_SIZE, "--batch-size"),
    lr: float = typer.Option(config.DEFAULT_LR, "--lr"),
    no_amp: bool = typer.Option(False, "--no-amp", help="AMP/autocast abschalten."),
    seed: int = typer.Option(config.SEED, "--seed"),
    out: str = typer.Option(None, "--out", help="Run-Verzeichnis (Default: data/models/run-<ts>)."),
    patience: int = typer.Option(config.DEFAULT_PATIENCE, "--patience", help="Early-Stopping-Geduld."),
    num_workers: int | None = typer.Option(None, "--num-workers", help="DataLoader-Worker (Default: 0 auf Windows, 4 sonst)."),
    norm: str | None = typer.Option(None, "--norm", help="batchnorm | groupnorm | none (Default: groupnorm auf Windows, sonst batchnorm)."),
    dataset: str | None = typer.Option(None, "--dataset", help="Benannter Datensatz (sonst globales Manifest/Split)."),
    resume: str | None = typer.Option(None, "--resume", help="Run-Name, dessen Gewichte als Warm-Start geladen werden (weiter-trainieren)."),
    head: str = typer.Option("combined", "--head", help="combined | factored | twostage (zweistufig Occupancy→Piece)."),
) -> None:
    """Per-Square-CNN auf der ROCm-GPU trainieren (Board-Accuracy = Checkpoint-Metrik)."""
    from .training.train import run_train

    raise typer.Exit(run_train(backbone=backbone, epochs=epochs, batch_size=batch_size, lr=lr,
                               no_amp=no_amp, seed=seed, out=out, patience=patience,
                               num_workers=num_workers, norm=norm, dataset=dataset, resume=resume,
                               head=head))


@app.command("eval")
def eval_cmd(
    run: str = typer.Option(..., "--run", help="Run-Verzeichnis aus `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test"),
) -> None:
    """Board-Accuracy, Per-Klassen-Recall und Confusion-Matrix (Text + PNG)."""
    from .training.evaluate import run_eval

    raise typer.Exit(run_eval(run=run, split_name=split))


@app.command("export")
def export_cmd(
    run: str = typer.Option(..., "--run", help="Run-Verzeichnis aus `train`."),
    fmt: str = typer.Option("torchscript", "--format", help="torchscript | onnx | all"),
) -> None:
    """best.pt nach TorchScript/ONNX exportieren + model_card.json (Übergabe an die Inferenz-App)."""
    from .training.evaluate import run_export

    raise typer.Exit(run_export(run=run, fmt=fmt))


@app.command("web")
def web_cmd(
    host: str = typer.Option(config.DEFAULT_WEB_HOST, "--host"),
    port: int = typer.Option(config.DEFAULT_WEB_PORT, "--port"),
    source: str | None = typer.Option(
        None, "--source",
        help="Kameraquelle als URL statt lokalem Index (z.B. IP-/Handy-Cam "
             "https://host:4444/video/m.jpeg). Überschreibt den UI-Index für ALLE Kamera-Pfade. "
             "Für flüssige Vorschau den MJPEG-Stream nehmen."),
    capture_source: str | None = typer.Option(
        None, "--capture-source",
        help="Optionale HOCHAUFLÖSENDE Snapshot-URL fürs Speichern (z.B. "
             "https://host:4444/video/snapshot). Vorschau bleibt am flüssigen --source-Stream, "
             "gespeicherte Frames kommen scharf vom Snapshot (Ecken werden darauf neu erkannt)."),
) -> None:
    """Lokale Web-UI: Datensatz einsehen, relabeln, Training steuern (braucht `--extra web`)."""
    import os

    from .web.camera import CAMERA_CAPTURE_ENV, CAMERA_SOURCE_ENV

    if source:
        os.environ[CAMERA_SOURCE_ENV] = source   # vom Web-Kamera-Pfad (effective_source) gelesen
        print(f"Kameraquelle (Vorschau): {source}")
    if capture_source:
        os.environ[CAMERA_CAPTURE_ENV] = capture_source
        print(f"Capture-Quelle (Speichern, hochauflösend): {capture_source}")

    from .web.app import run as run_web

    raise typer.Exit(run_web(host=host, port=port))


@app.command("track")
def track_cmd(
    profile: str = typer.Option("phone", "--profile", help="chesslab-Kalibrierprofil."),
    source: str = typer.Option("0", "--source", help="Kamera: 0=Webcam, URL=IP-Cam."),
    host: str = typer.Option(config.DEFAULT_TRACK_HOST, "--host"),
    port: int = typer.Option(config.DEFAULT_TRACK_PORT, "--port"),
    motion_thr: float = typer.Option(config.TRACK_DEFAULTS["motion_thr"], "--motion-thr",
                                     help="Bewegungs-Schwelle für Motion-Gating."),
    z_thr: float = typer.Option(config.TRACK_DEFAULTS["z_thr"], "--z-thr",
                                help="z-Score-Schwelle, ab der ein Feld als geändert gilt."),
    ambiguity_margin_ll: float = typer.Option(config.TRACK_DEFAULTS["ambiguity_margin_ll"],
                                              "--ambiguity-margin",
                                              help="Mindestabstand best−second (LL-Einheiten)."),
    reanchor_ll_floor: float = typer.Option(config.TRACK_DEFAULTS["reanchor_ll_floor"],
                                            "--reanchor-floor",
                                            help="Re-Anchor nur, wenn beste Zug-LL darunter liegt."),
    nudge_timeout_s: float = typer.Option(config.TRACK_DEFAULTS["nudge_timeout_s"], "--nudge-timeout",
                                          help="Sekunden bis Nudge-Referenz-Patch (ohne CNN)."),
    drift_window_s: float = typer.Option(config.TRACK_DEFAULTS["drift_window_s"], "--drift-window",
                                         help="Sekunden bis Drift-Patch leerer Felder (ohne CNN)."),
    no_prior: bool = typer.Option(False, "--no-prior",
                                  help="Heuristik-Prior als Ambiguitäts-Tie-Break deaktivieren."),
    change_thr: float | None = typer.Option(None, "--change-thr", hidden=True,
                                            help="DEPRECATED: ersetzt durch --z-thr."),
    confirm_frames: int | None = typer.Option(None, "--confirm-frames",
                                              help="Bestätigungs-Frames pro Zug (Default: 1 mit CNN, sonst 2)."),
    settle_frames: int | None = typer.Option(None, "--settle-frames",
                                             help="Ruhige Frames vor Erkennung (Default: 2 mit CNN, sonst 4)."),
    max_changed: int = typer.Option(config.TRACK_DEFAULTS["max_changed"], "--max-changed",
                                    help="Maximal geänderte Felder (Gate)."),
    avg_frames: int | None = typer.Option(None, "--avg-frames",
                                          help="Gleitendes Mittel über N ruhige Frames (Default: 2 mit CNN, sonst 3)."),
    no_live_align: bool = typer.Option(False, "--no-live-align", help="Marker-Nachführung deaktivieren."),
    motion_margin: float = typer.Option(config.TRACK_DEFAULTS["motion_margin"], "--motion-margin",
                                        help="Motion-ROI über den Brettrand hinaus (Anteil Brettkante)."),
    overhang: float = typer.Option(config.TRACK_DEFAULTS["overhang"], "--overhang",
                                   help="Diff-Zellen Richtung hintere Reihe erweitern (Anteil Zelle)."),
    cnn_run: str = typer.Option(config.default_tracker_run() or "", "--cnn-run",
                                help="Modell-Run für CNN-Verifikation/-Recovery ('' = aus)."),
    cnn_conf_thr: float = typer.Option(config.TRACK_DEFAULTS["cnn_conf_thr"], "--cnn-conf-thr",
                                       help="Konfidenz-Schwelle, ab der ein CNN-Feld als belastbar gilt."),
    census_thr: float = typer.Option(config.TRACK_DEFAULTS["census_thr"], "--census-thr",
                                     help="Schwelle für STRUKTURELLE Änderung (Census); < = Schatten-Kandidat."),
    cnn_verify: bool = typer.Option(True, "--cnn-verify/--no-cnn-verify",
                                    help="Jeden Zug per CNN-Identität prüfen (Default an, nicht blockierend)."),
    verify_window: int = typer.Option(config.TRACK_DEFAULTS["verify_window"], "--verify-window",
                                      help="Max. CNN-Frames pro Pre-Commit-Verify."),
    cnn_min_agreement: float = typer.Option(config.TRACK_DEFAULTS["cnn_min_agreement"],
                                            "--cnn-min-agreement",
                                            help="Agreement-Schwelle für Recovery/Verify."),
    cnn_margin_squares: int = typer.Option(config.TRACK_DEFAULTS["cnn_margin_squares"],
                                           "--cnn-margin-squares",
                                           help="Recovery-Margin in Feldern."),
    min_confident_board: int = typer.Option(config.TRACK_DEFAULTS["min_confident_board"],
                                            "--min-confident-board",
                                            help="Belastbare Felder für Whole-Board-Match."),
    min_confident_recovery: int = typer.Option(config.TRACK_DEFAULTS["min_confident_recovery"],
                                               "--min-confident-recovery",
                                               help="Belastbare Felder für Recovery."),
    cnn_cooldown_s: float = typer.Option(config.TRACK_DEFAULTS["cnn_cooldown_s"], "--cnn-cooldown",
                                         help="Mindestabstand (s) zwischen Recovery-Beobachtungen."),
    cnn_check_interval_s: float = typer.Option(config.TRACK_DEFAULTS["cnn_check_interval_s"],
                                               "--cnn-check-interval",
                                               help="Intervall (s) der periodischen CNN-Kontrolle."),
    device: str = typer.Option("auto", "--device", help="Torch-Device für das CNN: auto|cpu|cuda."),
) -> None:
    """Move-Tracker: Brett-Digitalisierung per Frame-Differenz + CNN-Verifikation (Web-UI)."""
    from .move_tracker.app import run as run_track

    if change_thr is not None:
        print("Hinweis: --change-thr ist deprecated (Spec 10) — bitte --z-thr verwenden.")
    tracker_kwargs = {
        "motion_thr": motion_thr, "z_thr": z_thr,
        "ambiguity_margin_ll": ambiguity_margin_ll, "reanchor_ll_floor": reanchor_ll_floor,
        "nudge_timeout_s": nudge_timeout_s, "drift_window_s": drift_window_s,
        "use_prior": not no_prior,
        "confirm_frames": confirm_frames, "settle_frames": settle_frames,
        "max_changed": max_changed, "avg_frames": avg_frames,
        "live_align": not no_live_align,
        "motion_margin": motion_margin, "overhang": overhang,
        "cnn_run": (cnn_run or None),   # '' oder fehlender Run auf Platte ⇒ Feature still aus
        "cnn_conf_thr": cnn_conf_thr, "device": device, "census_thr": census_thr,
        "cnn_verify": cnn_verify, "verify_window": verify_window,
        "cnn_min_agreement": cnn_min_agreement, "cnn_margin_squares": cnn_margin_squares,
        "min_confident_board": min_confident_board, "min_confident_recovery": min_confident_recovery,
        "cnn_cooldown_s": cnn_cooldown_s, "cnn_check_interval_s": cnn_check_interval_s,
    }
    raise typer.Exit(run_track(host=host, port=port, default_profile=profile,
                               default_source=source, tracker_kwargs=tracker_kwargs))


@synth_app.command("render")
def synth_render(
    out: str = typer.Option(..., "--out", help="Zielverzeichnis (Pflicht)."),
    blend: str = typer.Option(None, "--blend", help="Blender-Szene (Default: synth_assets/Chess Scene.blend)."),
    pieces_dir: str = typer.Option(None, "--pieces-dir", help="Gescannte Figuren-Vorlagen (Default: synth_pieces/)."),
    board_texture: str | None = typer.Option(None, "--board-texture",
                                             help="Rektifizierte Brett-Foto-Textur (Default: synth_pieces/board_texture.png"
                                                  " falls vorhanden, sonst prozedurales Holz)."),
    n: int = typer.Option(200, "--n", help="Anzahl zu rendernder Stellungen."),
    seed: int = typer.Option(42, "--seed"),
    fens: str | None = typer.Option(None, "--fens", help="FEN-Liste (sonst Fallback Grundstellung)."),
    res: int = typer.Option(1024, "--res", help="Render-Auflösung (px)."),
    views_per_scene: int = typer.Option(1, "--views-per-scene",
                                        help="Views (Kamera+Licht) pro Figurenaufstellung. >1 = Szenen-Reuse: "
                                             "gleiche Szene mehrfach rendern → deutlich schneller."),
    samples: int = typer.Option(24, "--samples", help="EEVEE TAA-Render-Samples (niedriger = schneller)."),
    max_obliqueness: float = typer.Option(0.20, "--max-obliqueness",
                                          help="Max. Kamera-Schräglage (Offset/Höhe). An echte ~0.06-Top-Down-Kamera "
                                               "gematcht; Bild wird beim Ingest per Homographie auf Top-Down reprojiziert."),
    blender: str | None = typer.Option(None, "--blender", help="Blender-Executable (Default: blender, via CHESSLAB_BLENDER)."),
) -> None:
    """Synthetische Brett-Renderings mit Blender/EEVEE erzeugen (v2: Brett-Textur + prozeduraler Fallback)."""
    import subprocess

    from .config import SYNTH, build_blender_cmd

    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "synth" / "render_board_v2.py"

    b = Path(blend) if blend else SYNTH.blend
    p = Path(pieces_dir) if pieces_dir else SYNTH.pieces_dir if SYNTH.pieces_dir.exists() else None
    o = Path(out).resolve()
    fe = Path(fens).resolve() if fens else None
    bl = blender or SYNTH.blender_cmd()

    # Board-Textur: explizites --board-texture > Default-Pfad (falls vorhanden) > None (= prozedural)
    bt: Path | None = None
    if board_texture:
        bt = Path(board_texture).resolve()
    elif SYNTH.board_texture.exists():
        bt = SYNTH.board_texture

    cmd = build_blender_cmd(bl, b, script, o, n=n, seed=seed, fens=fe, pieces=p, res=res,
                            board_texture=bt, views_per_scene=views_per_scene,
                            samples=samples, max_obliqueness=max_obliqueness)

    print(" ".join(cmd))
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        print("[FAIL] Blender-Render fehlgeschlagen.")
        raise typer.Exit(1)
    except FileNotFoundError:
        print(f"[FAIL] Blender nicht gefunden ('{bl}'). Pfad prüfen oder CHESSLAB_BLENDER setzen.")
        raise typer.Exit(1)
    print(f"[OK] synth render: {o}")


@synth_app.command("prepare")
def synth_prepare_cmd(
    in_dir: str = typer.Option(..., "--in", help="Scans: je Unterordner <Figur>/ mit .obj/.glb + Textur."),
    out_dir: str = typer.Option(None, "--out", help="Zielverzeichnis (Default: synth_pieces/)."),
    target_tris: int = typer.Option(20000, "--target-tris", help="Ziel-Dreieckszahl (0 = keine Dezimierung)."),
    smooth_iters: int = typer.Option(10, "--smooth-iters", help="Glättungs-Iterationen (0 = keine)."),
    fill_holes: bool = typer.Option(True, "--fill-holes/--no-fill-holes",
                                    help="Offene Ränder/Basis schließen."),
) -> None:
    """Gescannte Figuren batch-vorbereiten: aufrichten, dezimieren, Qualitäts-Report + Preview.

    Läuft komplett in-process (Open3D + PyMeshLab) — kein Blender nötig.
    Danach `<out>/<Figur>_preview.png` ansehen und die [WARN]-Hinweise prüfen."""
    from .config import SYNTH
    from .meshprep import prepare_scan
    from .scan_discover import assess_report, discover_scans

    out = Path(out_dir).resolve() if out_dir else SYNTH.pieces_dir

    items, warnings = discover_scans(Path(in_dir))
    for w in warnings:
        print(f"[WARN] {w}")
    if not items:
        print("[FAIL] keine Scans gefunden (erwartet: <in>/<Figur>/*.glb/.obj + Textur).")
        raise typer.Exit(1)

    results: list[tuple[str, str, list[str]]] = []
    for item in items:
        pid = f"{item.name}/{item.variant}"
        print(f"--- {pid}: {item.obj.name}" + (f" + {item.tex.name}" if item.tex else " (Textur eingebettet)"))
        try:
            report = prepare_scan(item, out, make_preview=True)
        except Exception as e:
            results.append((pid, "fail", [str(e)]))
            continue
        level, msgs = assess_report(report)
        results.append((pid, level, msgs))
        print(f"    {report.get('tris', '?')} Dreiecke, "
              f"Löcher/offen: {report.get('boundary_edges', '?')}, height_ratio: {report.get('height_ratio', '?')}")

    print("\nZusammenfassung:")
    for pid, level, msgs in results:
        glyph = {"ok": "[OK]  ", "warn": "[WARN]", "fail": "[FAIL]"}[level]
        print(f"{glyph} {pid}" + ("" if not msgs else " — " + "; ".join(msgs)))
    print(f"\nPreviews ansehen: {out}\\<Figur>\\<Variante>_preview.png — dann `chesslab synth render …`")
    raise typer.Exit(1 if any(lv == "fail" for _, lv, _ in results) else 0)


@synth_app.command("board-texture")
def synth_board_texture(
    image: str = typer.Option(..., "--image", help="Brett-Foto (JPG/PNG) mit 4 ArUco-Markern an den Ecken."),
    out: str = typer.Option(None, "--out", help="Ziel-Pfad (Default: synth_pieces/board_texture.png)."),
    size: int = typer.Option(1024, "--size", help="Quadratische Ausgabegröße (px)."),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict", help="ArUco-Dictionary."),
    margin: float = typer.Option(0.04, "--margin", help="Marker-zu-Raster-Einzug (Fraction)."),
) -> None:
    """Brett-Foto zu rektifizierter quadratischer Textur entzerren (für `synth render --board-texture`)."""
    import sys as _sys

    from .config import _REPO_ROOT, SYNTH

    # synth/ liegt im Repo-Root (kein installiertes Paket) — für den CLI-Aufruf nachrüsten.
    if str(_REPO_ROOT) not in _sys.path:
        _sys.path.insert(0, str(_REPO_ROOT))
    from synth.board_texture import rectify

    out_path = Path(out) if out else SYNTH.board_texture
    try:
        result = rectify(image, str(out_path), size=size, dict_name=dict_name, margin=margin)
        print(f"[OK] board-texture: {result}")
    except SystemExit as e:
        raise typer.Exit(e.code)


@synth_app.command("preview")
def synth_preview(
    obj: str = typer.Option(..., "--obj", help="Vorbereitete Figur (.obj, Z-up aus `synth prepare`)."),
    out: str = typer.Option(..., "--out", help="Ziel-PNG."),
    tex: str | None = typer.Option(None, "--tex", help="Textur-PNG (Default: <obj>.png daneben; --clay ignoriert sie)."),
    clay: bool = typer.Option(False, "--clay", help="Ohne Textur rendern (Geometrie pur — Bumps/Löcher am besten sichtbar)."),
    blender: str | None = typer.Option(None, "--blender", help="Blender-Executable (Default: auto-erkannt)."),
) -> None:
    """Einzelne Figur hübsch rendern (orthografische 3/4-Ansicht, aufrecht, zwei Lichtquellen)."""
    import subprocess

    from .config import SYNTH

    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "synth" / "render_piece.py"
    obj_p = Path(obj).resolve()
    tex_p = None if clay else (Path(tex).resolve() if tex else obj_p.with_suffix(".png"))
    if tex_p is not None and not tex_p.exists():
        print(f"[WARN] Textur {tex_p} fehlt — rendere Clay.")
        tex_p = None
    bl = blender or SYNTH.blender_cmd()
    cmd = [bl, "--background", "--python-exit-code", "1", "--python", str(script), "--",
           str(obj_p), str(Path(out).resolve()), str(tex_p) if tex_p else "-"]
    print(" ".join(cmd))
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        print(f"[FAIL] Blender nicht gefunden ('{bl}'). CHESSLAB_BLENDER setzen.")
        raise typer.Exit(1)
    except subprocess.CalledProcessError as e:
        print("[FAIL] Render fehlgeschlagen:\n" + "\n".join((e.stdout or "").splitlines()[-6:]))
        raise typer.Exit(1)
    print(f"[OK] synth preview: {out}")


def main() -> None:
    # Ensure non-ASCII report glyphs (—, umlauts) render on Windows consoles too.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001 - best effort; default encoding is fine elsewhere
            pass
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    app()


if __name__ == "__main__":
    main()
