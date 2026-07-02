"""Typer entrypoint. One CLI `chesslab`; each stage adds its own subcommands."""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

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
    camera: Optional[int] = typer.Option(None, "--camera", help="Kamera-Check für Index N (öffnen + ein Frame lesen)."),
    json_out: bool = typer.Option(False, "--json", help="Maschinenlesbaren JSON-Report zusätzlich ausgeben."),
) -> None:
    """Pre-flight: Python, App-Deps, optional GPU (ROCm) und Kamera validieren."""
    code = doctor_mod.run(gpu=gpu, camera=camera, json_out=json_out)
    raise typer.Exit(code)


@calibrate_app.command("new")
def calibrate_new(
    camera: int = typer.Option(0, "--camera", help="Kamera-Index."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile", help="Profilname."),
    board_size: int = typer.Option(config.DEFAULT_BOARD_SIZE, "--board-size", help="Kantenlänge des entzerrten Bretts (px)."),
) -> None:
    """Interaktiv: 4 Ecken klicken (a8,h8,h1,a1), Homographie speichern."""
    raise typer.Exit(calibration_mod.calibrate_new(camera=camera, profile=profile, board_size=board_size))


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
    max_class_ratio: Optional[float] = typer.Option(None, "--max-class-ratio", help="Jede Figurenklasse auf R * kleinste Figurenklasse deckeln (balanciert Bauern herunter; nur train)."),
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
    tag: Optional[str] = typer.Option(None, "--tag", help="Name für Sessions/Datensatz (Default: pretrain-<adapter>)."),
    geometry: str = typer.Option("warp", "--geometry", help="warp (empfohlen, keine Intrinsics) | box3d."),
    photometry: str = typer.Option("none", "--photometry", help="none | clahe | grayworld | gamma — muss zum Finetune-Datensatz passen."),
    board_size: int = typer.Option(900, "--board-size", help="Warp-Auflösung (px). Moderat halten (Handy-Quelle), sonst Hochskalier-Unschärfe."),
    limit: Optional[int] = typer.Option(None, "--limit", help="Nur die ersten N Bilder (Schnelltest)."),
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
    num_workers: Optional[int] = typer.Option(None, "--num-workers", help="DataLoader-Worker (Default: 0 auf Windows, 4 sonst)."),
    norm: Optional[str] = typer.Option(None, "--norm", help="batchnorm | groupnorm | none (Default: groupnorm auf Windows, sonst batchnorm)."),
    dataset: Optional[str] = typer.Option(None, "--dataset", help="Benannter Datensatz (sonst globales Manifest/Split)."),
    resume: Optional[str] = typer.Option(None, "--resume", help="Run-Name, dessen Gewichte als Warm-Start geladen werden (weiter-trainieren)."),
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
    motion_thr: float = typer.Option(3.0, "--motion-thr", help="Bewegungs-Schwelle für Motion-Gating."),
    change_thr: float = typer.Option(16.0, "--change-thr", help="Helligkeitsdifferenz-Schwelle je Feld."),
    confirm_frames: int = typer.Option(2, "--confirm-frames", help="Bestätigungs-Frames pro Zug."),
    max_changed: int = typer.Option(6, "--max-changed", help="Maximal geänderte Felder (Gate)."),
    avg_frames: int = typer.Option(3, "--avg-frames", help="Gleitendes Mittel über N ruhige Frames."),
    no_live_align: bool = typer.Option(False, "--no-live-align", help="Marker-Nachführung deaktivieren."),
) -> None:
    """Move-Tracker: Brett-Digitalisierung per Frame-Differenz + Legalität (Web-UI)."""
    from .move_tracker.app import run as run_track

    tracker_kwargs = {
        "motion_thr": motion_thr, "change_thr": change_thr,
        "confirm_frames": confirm_frames, "max_changed": max_changed,
        "avg_frames": avg_frames, "live_align": not no_live_align,
    }
    raise typer.Exit(run_track(host=host, port=port, default_profile=profile,
                               default_source=source, tracker_kwargs=tracker_kwargs))


@synth_app.command("render")
def synth_render(
    out: str = typer.Option(..., "--out", help="Zielverzeichnis (Pflicht)."),
    blend: str = typer.Option(None, "--blend", help="Blender-Szene (Default: synth_assets/Chess Scene.blend)."),
    pieces_dir: str = typer.Option(None, "--pieces-dir", help="Gescannte Figuren-Vorlagen (Default: synth_pieces/)."),
    n: int = typer.Option(200, "--n", help="Anzahl zu rendernder Stellungen."),
    seed: int = typer.Option(42, "--seed"),
    fens: str | None = typer.Option(None, "--fens", help="FEN-Liste (sonst Fallback Grundstellung)."),
    res: int = typer.Option(1024, "--res", help="Render-Auflösung (px)."),
    blender: str | None = typer.Option(None, "--blender", help="Blender-Executable (Default: blender, via CHESSLAB_BLENDER)."),
) -> None:
    """Synthetische Brett-Renderings mit Blender erzeugen (PNG + JSON mit fen/corners)."""
    import subprocess

    from .config import SYNTH, build_blender_cmd

    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "synth" / "render_chessboard.py"

    b = Path(blend) if blend else SYNTH.blend
    p = Path(pieces_dir) if pieces_dir else SYNTH.pieces_dir if SYNTH.pieces_dir.exists() else None
    o = Path(out).resolve()
    fe = Path(fens).resolve() if fens else None
    bl = blender or SYNTH.blender_cmd()
    cmd = build_blender_cmd(bl, b, script, o, n=n, seed=seed, fens=fe, pieces=p, res=res)

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
