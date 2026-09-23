"""Models: the root verbs `train`, `eval`, `reliance`, `export` and `quantize`."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import typer

from .. import config
from ._app import app
from ._common import _out_size, csv_list


def _pair(value: str | None, valid, fail: str) -> tuple[float, float] | None:
    """`LO,HI` from a command line, or a `[FAIL]` line and exit 1."""
    if not value:
        return None
    parts = [float(x) for x in value.split(",")]
    if len(parts) != 2 or not valid(*parts):
        print(fail)
        raise typer.Exit(1)
    return parts[0], parts[1]


@app.command("train")
def train_cmd(
    backbone: str = typer.Option(
        config.DEFAULT_BACKBONE,
        "--backbone",
        help="Any timm model (default: mobilenetv4_conv_small_035, what every shipped model is) "
             "| mobilenet_v3_small | smallcnn. WARNING: `smallcnn` hard-crashes ROCm-Windows.",
    ),
    pretrained: bool | None = typer.Option(
        None, "--pretrained/--no-pretrained",
        help="ImageNet-Gewichte fuer das Backbone. Default: an, ausser bei `smallcnn`. Fuer einen "
             "Architektur-Sweep AUSschalten — `_035` hat als einziges keine."),
    neighbour_p: float = typer.Option(
        None, "--neighbour-p",
        help="Wahrscheinlichkeit, einer LEEREN Zelle den Rand einer besetzten anzukleben "
             "(Fuss der Nachbarfigur). Zielt auf Phantome; Default aus."),
    strict_verdicts: bool = typer.Option(
        False, "--strict-verdicts",
        help="Abbrechen statt melden, wenn Zeilen des Datensatzes einem spaeteren "
             "Menschenurteil widersprechen (gesperrt/umgelabelt). Vorgabe: melden."),
    no_empty_cap: bool = typer.Option(
        False, "--no-empty-cap",
        help="Die `max_empty_ratio`-Kappe des Splits ignorieren. Board-Backbones tun das immer; "
             "fuer einen gepaarten Sweep muessen die Zell-Arme mitziehen."),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    batch_size: int = typer.Option(config.DEFAULT_BATCH_SIZE, "--batch-size"),
    input_size: str = typer.Option(
        None, "--input-size",
        help="Model input WxH (e.g. 80x80), scaled in memory. Default: the crop's own size."),
    lr: float = typer.Option(config.DEFAULT_LR, "--lr"),
    no_amp: bool = typer.Option(False, "--no-amp", help="Disable AMP/autocast."),
    seed: int = typer.Option(config.SEED, "--seed"),
    out: str = typer.Option(None, "--out", help="Run directory (default: data/models/run-<ts>)."),
    patience: int = typer.Option(config.DEFAULT_PATIENCE, "--patience", help="Early stopping patience."),
    num_workers: int | None = typer.Option(
        None,
        "--num-workers",
        help=f"DataLoader workers (default: {config.DEFAULT_NUM_WORKERS}).",
    ),
    low_memory: bool = typer.Option(True, "--low-memory/--no-low-memory",
                                   help="Direct pack reads, zero workers and no pinned RAM (default)."),
    ram_reserve_gb: float = typer.Option(0.0, "--ram-reserve-gb", min=0,
                                       help="Unter dieser freien RAM-Reserve (GiB) abbrechen; 0 ist AUS "
                                            "und die Vorgabe. Die Wache prueft dreimal je Batch und riss "
                                            "damit ganze Laeufe an einem MOMENTANEN Einbruch ab (Nutzer, "
                                            "2026-09-17). Mit `--ram-reserve-gb 4` wieder an."),
    eval_workers: int = typer.Option(2, "--eval-workers", min=0,
                                    help="Persistent validation workers, separate from training."),
    channels_last: bool = typer.Option(False, "--channels-last",
                                       help="Use channels-last GPU storage without changing batch size."),
    fused_adamw: bool = typer.Option(False, "--fused-adamw",
                                     help="Fused AdamW. Keeps the model's arithmetic bit-identical "
                                          "and moves the parameter update by ~2e-7; the win is the "
                                          "per-step sync it removes (docs/training-speed.md)."),
    compile_mode: str | None = typer.Option(None, "--compile-mode",
                                           help="torch.compile mode, e.g. reduce-overhead (CUDA "
                                                "graphs). Needs --compile-model."),
    compile_model: bool = typer.Option(False, "--compile-model",
                                       help="torch.compile the model forward (triton-windows, "
                                            "docs/training-speed.md). Off by default: runs "
                                            "with it are not comparable with the archive."),
    compile_batch_aug: bool = typer.Option(False, "--compile-batch-aug",
                                           help="Compile GPU augmentation, preserving RNG draws. Requires "
                                                "--batch-aug and Triton; small rounding differences remain."),
    prefetch_factor: int = typer.Option(2, "--prefetch-factor", min=1,
                                       help="Queued batches per worker."),
    crop_norm: str = typer.Option("fixed", "--crop-norm",
                                 help="fixed | per-crop. per-crop standardises EACH crop by its own "
                                      "mean/std instead of the dataset's. It is the contrast stretch "
                                      "GroupNorm was doing inside the network: a black piece on a dark "
                                      "square carries 6 grey levels against 40 on a light one, and doing "
                                      "it here lets BatchNorm fold away (5x fewer graph nodes)."),
    input_repr: str = typer.Option("rgb", "--input-repr",
                                   help="rgb | gray+sobel | rgb+sobel | sobel. What the first "
                                        "convolution is fed. The sobel channel is |Gx|+|Gy| of the "
                                        "luminance: taking the MAGNITUDE rectifies away whether the "
                                        "piece is darker or lighter than its square. MEASURED AND "
                                        "LOST on the 18-clip harness (whole-board occupancy: rgb "
                                        "0.9978, rgb+sobel 0.0308, gray+sobel 0.0307) — keep `rgb` "
                                        "unless you are re-running the experiment."),
    norm: str | None = typer.Option(None, "--norm", help="batchnorm (default) | groupnorm | none."),
    dataset: str | None = typer.Option(None, "--dataset", help="Named dataset (otherwise global manifest/split)."),
    resume: str | None = typer.Option(None, "--resume", help="Run name whose weights are loaded as warm-start (continue training)."),
    continue_run: bool = typer.Option(
        False, "--continue",
        help="Denselben Lauf in --out an der Epochengrenze fortsetzen, an der er abbrach: "
             "Optimizer, Cosine-Position, Sampler-Strom und Zufallsstaende kommen aus "
             "`state.pt` mit. Anders als --resume, das nur Gewichte waermt und den Plan von "
             "vorn beginnt. Weicht das Rezept vom gespeicherten ab, bricht es ab."),
    head: str = typer.Option("occlusion", "--head",
                             help="occlusion (default) | combined. `occlusion` adds a "
                                  "sigmoid coverage unit beside the classes and trains it from the "
                                  "manifest's `coverage` — see docs/occluder-plates.md."),
    scales: str | None = typer.Option(None, "--scales", help="Multi-Scale-Training: Komma-Liste von Eingabegrößen "
                                      "(z.B. 64,96,128). Pro Batch wird zufällig eine gewählt → ein Modell für alle "
                                      "Auflösungen (size-agnostisch, für günstige Low-Res-Inferenz)."),
    clahe_clip: float = typer.Option(
        0.0, "--clahe-clip",
        help="Lokaler Kontrast (CLAHE) auf dem L-Kanal, NACH dem Resize. 0 = aus. Der Wert landet "
             "in der config.json, damit Eval und Export ihn mitlesen."),
    clahe_tile: int = typer.Option(8, "--clahe-tile", help="CLAHE-Kachelraster (tile x tile)."),
    clahe_min_mean: float = typer.Option(
        0.0, "--clahe-min-mean",
        help="CLAHE nur ab dieser mittleren Zellhelligkeit. Zusammen mit --clahe-max-mean ein "
             "BAND: gemessen hebt CLAHE 25-40 um 5,9 Punkte und drueckt alles darunter um 2,6."),
    clahe_max_mean: float = typer.Option(
        255.0, "--clahe-max-mean", help="CLAHE nur bis zu dieser mittleren Zellhelligkeit."),
    clahe_denoise: str = typer.Option(
        "off", "--clahe-denoise",
        help="off | pre | post — medianBlur(3) vor oder nach CLAHE. `fastNlMeans` ist mit "
             "1438 ms je Brett auf dem Geraet ausgeschlossen."),
    board_width: int = typer.Option(128, "--board-width",
                                    help="Breite des Brettkopfs bei board:/boardattn: — er laeuft EINMAL je "
                                         "Brett, kostet also 1/64 je Crop."),
    board_layers: int = typer.Option(2, "--board-layers",
                                     help="Bloecke im Brettkopf bei board:/boardattn:."),
    erase_p: float | None = typer.Option(None, "--erase-p", help="Override RandomErasing/Cutout prob (anti-shortcut)."),
    brightness: float | None = typer.Option(None, "--brightness",
                                            help="ColorJitter-Helligkeit als Bruchteil (Default 0.35). "
                                                 "0 schaltet sie ab."),
    contrast: float | None = typer.Option(None, "--contrast",
                                          help="ColorJitter-Kontrast (Default 0.35). Erst wenn "
                                               "brightness, contrast UND color-jitter 0 sind, faellt "
                                               "die Op ganz aus der Kette."),
    color_jitter: float | None = typer.Option(None, "--color-jitter",
                                              help="ColorJitter-Saettigung (Default 0.1)."),
    batch_aug: bool = typer.Option(
        False, "--batch-aug",
        help="ColorJitter, Gamma, Blur und Cutout als EINE Batch-Operation auf der GPU statt "
             "je Crop in PIL. Gleiche Verteilungen, aber float statt uint8 — statistisch "
             "dasselbe Rezept, nicht bitgleich (docs/training-speed.md)."),
    blur_sigma_max: float | None = typer.Option(None, "--blur-sigma-max",
                                                help="Obergrenze des Gaussian Blur (Default 1.5). "
                                                     "<= 0.1 laesst die Op ganz weg."),
    gamma: str | None = typer.Option(None, "--gamma",
                                     help="Gamma-Spanne LO,HI (Default 0.6,1.8). '1,1' schaltet sie ab. "
                                          "Gemessen 2026-08-29: mit den Defaults liegen 9,8 % der "
                                          "Ziehungen unter dem 0,5-Perzentil dessen, was je serviert "
                                          "wird, ohne Gamma nur 5,5 %."),
    jitter_translate: float | None = typer.Option(None, "--jitter-translate",
                                                  help="Override the affine translation jitter, as a "
                                                       "fraction of the crop. The default 0.03 is ~3.3 % "
                                                       "of a cell, and real footage arrives at ~9 % "
                                                       "(measured on the test clips) - the corpus used "
                                                       "to supply that variation by being mis-cut, and "
                                                       "since it was aligned it no longer does."),
    hard_negative_multiplier: float = typer.Option(
        1.0,
        "--hard-negative-multiplier",
        help="Sampling weight for paths in data/reports/hard_empty.jsonl (1 = disabled).",
    ),
    swa: bool = typer.Option(False, "--swa",
                             help="Gewichte ueber die letzten Epochen mitteln (SWA). Findet flache Minima, die die Konfidenz richtiger von falschen Vorhersagen besser trennen (FMFP, ECCV 2022). Der Plan davor bleibt unveraendert."),
    swa_lr: float = typer.Option(5e-4, "--swa-lr", help="Konstante Rate ab dem SWA-Start."),
    swa_start: float = typer.Option(0.75, "--swa-start",
                                    help="Anteil der Epochen, ab dem gemittelt wird."),
    dark_min: float = typer.Option(
        None, "--dark-min",
        help="Zellen unter dieser mittleren Luma aus dem KLASSENverlust nehmen (Vorgabe "
             "`occlusion.CELL_DARK_MIN`). Das Label stimmt dort, das Bild traegt nur kein "
             "Signal mehr. Die Zeile BLEIBT im Batch, sonst verlieren Brettmodelle das ganze "
             "Brett; der Coverage-Kopf lernt sie weiter, denn dunkel ist nicht verdeckt."),
    visible_max: float = typer.Option(None, "--visible-max",
                                      help="Coverage-Grenze der TRAININGS-Maske (Vorgabe "
                                           "PIECE_VISIBLE_MAX = 0.15). Die Metriken bleiben auf "
                                           "der Vorgabe, damit Laeufe vergleichbar bleiben."),
    allow_unpacked: bool = typer.Option(False, "--allow-unpacked",
                                        help="Training ohne Memmap zulassen. Ohne das bricht ein "
                                             "packbarer Datensatz ab, statt still auf den "
                                             "langsamen Datei-Loader zu fallen."),
    split: str | None = typer.Option(None, "--split", help="Split file inside the dataset "
                                     "(default: split.json). Lets several folds share ONE packed "
                                     "corpus instead of packing the same crops per fold."),
    loss: str = typer.Option("ce", "--loss", help="ce | focal — focal down-weights the easy, "
                                                  "already-solved crops (needs --head combined)."),
    focal_gamma: float = typer.Option(2.0, "--focal-gamma", help="Focal loss gamma (0 = weighted CE)."),
    class_weight: str | None = typer.Option(None, "--class-weight", help="Per-class loss weight "
                                            "override as comma-separated KEY=VALUE (e.g. "
                                            "'occupied=2.0' or 'empty=0.9,occupied=2.0'). Applied "
                                            "on top of split.json's inverse-frequency weights."),
    epoch_frac: float = typer.Option(1.0, "--epoch-frac",
                                     help="Ziehungen je Epoche als Anteil des Trainingssatzes. "
                                          "1 643 Situationen liegen als 184 735 Crops vor; wer "
                                          "sie gleichmaessig zieht, braucht nicht jede Kopie. "
                                          "Die Cosine haengt an --epochs, also ist das echte "
                                          "gesparte Zeit."),
    balance: str = typer.Option("none", "--balance",
                                help="none | situation | session | class | piece. `situation` zieht jede "
                                     "(Session, Feld, Klasse) gleich oft statt jeden Crop "
                                     "(Gruppen sind 13,6x ungleich; wK kennt 22 Platzierungen, "
                                     "jede 131-fach je Epoche). `session` legt darueber, dass "
                                     "jede Aufnahme gleich oft drankommt — Licht und Kamera sind "
                                     "die Achse, auf der Val zurueckgehalten wird, und die "
                                     "Anteile streuen heute 18,8x. `class` gleicht die KLASSEN "
                                     "im Sampler aus statt im Verlust — gehoert mit "
                                     "--weight-cap 1 zusammen, sonst wird zweimal geglichen. "
                                     "`piece` tut dasselbe, laesst `empty` aber auf seinem "
                                     "Anteil — sonst verliert der Verdeckungskopf seine "
                                     "Negativbeispiele (Precision 0,944 -> 0,680)."),
    aug_scale: float | None = typer.Option(None, "--aug-scale",
                                           help="Alle Augmentierungs-Staerken mal DIESEM Faktor. "
                                                "0 = keine, 1 = wie bisher. Die Werte sind von "
                                                "Hand gesetzt und nie abgetastet worden."),
    rot90: bool | None = typer.Option(None, "--rot90/--no-rot90",
                                      help="90-Grad-Drehungen, unabhaengig davon, womit der "
                                           "Datensatz gebaut wurde (alle stehen auf "
                                           "rotations=[0]). Mit --hflip-p 0.5 zusammen ist es "
                                           "die volle Symmetriegruppe des Quadrats."),
    erase_scale: str | None = typer.Option(None, "--erase-scale",
                                           help="Flaechenanteil des geloeschten Rechtecks als "
                                                "MIN,MAX (heute 0.02,0.15). Der Hebel gegen "
                                                "Sproedigkeit: ein einzelner 16-px-Fleck kostet "
                                                "das Modell heute 75-92 % der Wahrscheinlichkeit."),
    grayscale_p: float | None = typer.Option(None, "--grayscale-p",
                                             help="ZUFAELLIG entfaerben. Anders als "
                                                  "--input-repr gray3, das die Farbe ganz nimmt: "
                                                  "hier bleibt sie nutzbar, nur nicht mehr "
                                                  "verlaesslich."),
    invert_p: float | None = typer.Option(None, "--invert-p",
                                          help="Helligkeit umkehren, Label unveraendert. Zwingt "
                                               "das Modell auf die Form statt auf die Polaritaet. "
                                               "Klein halten — bei 1,0 waere Weiss von Schwarz "
                                               "nicht mehr zu trennen; der Sobel-Kanal hat genau "
                                               "das erzwungen und zwei Groessenordnungen verloren."),
    flip_xor_p: float | None = typer.Option(None, "--flip-xor-p",
                                            help="Genau EINE Achse spiegeln, nie beide. "
                                                 "Schliesst die 180-Grad-Drehung aus, die zwei "
                                                 "unabhaengige Muenzen mit erzeugen wuerden."),
    rot180_p: float | None = typer.Option(None, "--rot180-p",
                                          help="Halbe Drehung ALLEIN. --hflip-p und --vflip-p "
                                               "zusammen wuerfeln unabhaengig und ergeben die "
                                               "ganze Vierergruppe zu je 25 %; dieser Regler "
                                               "isoliert die Drehung."),
    vflip_p: float | None = typer.Option(None, "--vflip-p",
                                         help="Senkrechte Spiegelung. Mit --hflip-p zusammen "
                                              "entsteht die 180-Grad-Drehung als Kombination — "
                                              "die einzige physikalisch echte Variante, sie "
                                              "entspricht dem Blick von der anderen Tischseite."),
    hflip_p: float | None = typer.Option(None, "--hflip-p",
                                         help="Wahrscheinlichkeit fuer waagerechte Spiegelung. "
                                              "Auf einem Zellcrop zulaessig und spiegelt den "
                                              "Lichtgradienten des Bretts mit."),
    weight_decay: float | None = typer.Option(None, "--weight-decay",
                                              help="AdamW-Zerfall. Ohne Angabe PyTorchs 0,01 — "
                                                   "der Wert, auf dem jeder bisherige Lauf lief, "
                                                   "ohne dass ihn jemand gewaehlt haette."),
    label_smoothing: float = typer.Option(0.0, "--label-smoothing",
                                          help="Gegen ueberzeugte Fehler: die Konfidenz auf "
                                               "Fehlern liegt bei 0,75-0,84."),
    coverage_weight: str = typer.Option("hard", "--coverage-weight",
                                        help="Wie eine verdeckte Zelle im Klassenverlust zaehlt. "
                                             "hard = harte Kante bei 0,15 (Vorgabe, wie bisher). "
                                             "soft = der gemessenen Lesbarkeit folgend, Gewicht 0 "
                                             "erst ab 0,6. Macht Laeufe mit dem Archiv "
                                             "unvergleichbar (docs/class-scheme.md)."),
    weight_cap: float | None = typer.Option(None, "--weight-cap",
                                            help="Verhaeltnis groesstes/kleinstes Klassengewicht "
                                                 "hoechstens SO. Geglaettet (w ~ 1/n^a), nicht "
                                                 "beschnitten; der Verlustmassstab bleibt gleich. "
                                                 "Ungekappt sind es ~12x."),
    sched: str = typer.Option("cosine", "--sched",
                              help="cosine (default) | none. The cosine period is tied to --epochs, "
                                   "so a longer run is a different trajectory, not a longer one: "
                                   "more steps AND more time at a high rate move together. Use "
                                   "'none' to pin the rate when the question is whether LONGER "
                                   "training helps, so the epoch count is the only variable."),
) -> None:
    """Train per-square CNN on the ROCm GPU (board accuracy = checkpoint metric)."""
    from ..training.train import run_train
    from ..training.train_lock import _release_train_lock

    scale_list = [int(s) for s in scales.split(",") if s.strip()] if scales else None
    _erase_scale = _pair(erase_scale, lambda lo, hi: 0 < lo < hi <= 1,
                         "[FAIL] --erase-scale erwartet MIN,MAX mit 0 < min < max <= 1.")
    _gamma = _pair(gamma, lambda lo, hi: 0 < lo <= hi, "[FAIL] --gamma erwartet LO,HI mit 0 < lo <= hi.")
    cw: dict[str, float] = {}
    for item in csv_list(class_weight):
        if "=" not in item:
            print(f"[FAIL] --class-weight expects KEY=VALUE, got {item!r}.")
            raise typer.Exit(1)
        k, v = item.split("=", 1)
        cw[k.strip()] = float(v)
    try:
        code = run_train(backbone=backbone, epochs=epochs, per_crop=(crop_norm == "per-crop"),
                         input_repr=input_repr, batch_size=batch_size, lr=lr,
                         no_amp=no_amp, seed=seed, out=out, patience=patience,
                         num_workers=num_workers, norm=norm, dataset=dataset, resume=resume,
                         eval_workers=eval_workers, prefetch_factor=prefetch_factor,
                         low_memory=low_memory, ram_reserve_gb=ram_reserve_gb,
                         channels_last=channels_last, compile_model=compile_model,
                         compile_batch_aug=compile_batch_aug,
                         fused_adamw=fused_adamw, compile_mode=compile_mode,
                         head=head, scales=scale_list, input_size=input_size,
                         continue_run=continue_run,
                         board_width=board_width, board_layers=board_layers,
                         clahe_clip=clahe_clip, clahe_tile=clahe_tile,
                         clahe_min_mean=clahe_min_mean, clahe_max_mean=clahe_max_mean,
                         clahe_denoise=clahe_denoise,
                         erase_p=erase_p, erase_scale=_erase_scale,
                         batch_aug=batch_aug,
                         brightness=brightness, contrast=contrast,
                         color_jitter=color_jitter, blur_sigma_max=blur_sigma_max,
                         gamma=_gamma,
                         loss=loss, focal_gamma=focal_gamma, class_weight=cw or None,
                         sched=sched, jitter_translate=jitter_translate,
                         hard_negative_multiplier=hard_negative_multiplier, split=split,
                         swa=swa, swa_lr=swa_lr, swa_start=swa_start,
                         allow_unpacked=allow_unpacked, visible_max=visible_max,
                         dark_min=dark_min,
                         weight_cap=weight_cap, weight_decay=weight_decay,
                         label_smoothing=label_smoothing, coverage_weight=coverage_weight,
                         hflip_p=hflip_p, vflip_p=vflip_p, rot180_p=rot180_p,
                         flip_xor_p=flip_xor_p, invert_p=invert_p, grayscale_p=grayscale_p,
                         balance=balance, epoch_frac=epoch_frac,
                         rot90=rot90, aug_scale=aug_scale, pretrained=pretrained,
                         no_empty_cap=no_empty_cap, neighbour_p=neighbour_p,
                         strict_verdicts=strict_verdicts)
    except MemoryError as exc:
        print(f"[FAIL] {exc}")
        code = 1
    # ROCm-Windows wedges in teardown with everything already written: leave without unwinding, and
    # hand the lock back by hand since atexit does not run.
    _release_train_lock()
    sys.stdout.flush()
    os._exit(code)


@app.command("eval")
def eval_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test | all (no split filter)"),
    input_size: int | None = typer.Option(None, "--input-size", help="Eingabegröße für die Auswertung "
                                           "(z.B. 64/96/128). Misst die Genauigkeit bei einer Deployment-Auflösung "
                                           "(für die Auflösungs-Kurve eines Multi-Scale-Modells)."),
    dataset: str | None = typer.Option(None, "--dataset",
                                       help="Measure against THIS dataset instead of the one the "
                                            "run was trained on. Writes eval_<split>__<dataset>.json "
                                            "so the run's own numbers stay put, and warns about "
                                            "sessions the run trained on."),
    split_file: str | None = typer.Option(None, "--split-file",
                                          help="Split file inside the dataset (default: split.json, "
                                               "or the run's own). Names a fold, e.g. split-f0.json."),
    sessions: str | None = typer.Option(None, "--sessions",
                                        help="Comma-separated session IDs to narrow the split to."),
    boards_only: bool = typer.Option(False, "--boards-only",
                                     help="Nur vollständige 64-Zell-Bretter — der Schnitt, den ein "
                                          "Brett-Modell erzwingt. Ohne ihn vergleicht ein Zell- "
                                          "gegen ein Brett-Modell zwei verschiedene Zeilenmengen."),
    burn_frozen: bool = typer.Option(False, "--burn-frozen",
                                     help="Eine eingefrorene Aufnahme verbrauchen. Genau EINMAL, "
                                          "nach dem Einfrieren des Kandidaten."),
    strict_verdicts: bool = typer.Option(
        False, "--strict-verdicts",
        help="Abbrechen statt melden, wenn Zeilen des Datensatzes einem spaeteren "
             "Menschenurteil widersprechen (gesperrt/umgelabelt). Vorgabe: melden, Zahl im eval_*.json."),
) -> None:
    """Board accuracy, per-class recall, per-session table and confusion matrix (text + PNG)."""
    from ..training.evaluate import run_eval

    raise typer.Exit(run_eval(run=run, split_name=split, input_size=input_size, dataset=dataset,
                              split_file=split_file, boards_only=boards_only,
                              sessions=csv_list(sessions) if sessions else None,
                              burn_frozen=burn_frozen,
                              strict_verdicts=strict_verdicts))


@app.command("reliance")
def reliance_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test"),
    per_class: int = typer.Option(16, "--per-class", help="Crops sampled per class for the occlusion test."),
) -> None:
    """Background reliance: per-class `piece_frac` (does it read the piece or the board?).

    Mask-free Zeiler & Fergus occlusion: piece_frac near 1 = decision driven by the FIGURE,
    near 0 = by the surrounding BOARD (the shortcut). Occupied classes < 45% are flagged WEAK.
    Writes `<run>/reliance.json` for reproducible before/after comparison. NOTE: the split shares
    the same physical board, so the shortcut inflates in-distribution recall — trust THIS metric
    over recall when judging robustness."""
    from ..training.gradcam import reliance_for_run

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] no config.json in {run_dir} — first run `chesslab train`.")
        raise typer.Exit(1)
    stats = reliance_for_run(run_dir, split=split, per_class=per_class)
    typer.echo(f"{'class':>8}  {'n':>4}  {'piece%':>7}  {'base':>5}  flag")
    for r in sorted(stats, key=lambda s: s["piece_frac"]):
        pf = r["piece_frac"] * 100
        weak = r["cls"] not in ("empty", "occluded") and pf < 45
        typer.echo(f"{r['cls']:>8}  {r['n']:>4}  {pf:>6.1f}%  {r['base_prob']:>5.2f}  {'WEAK' if weak else ''}")
    occ = [r for r in stats if r["cls"] not in ("empty", "occluded")]
    if occ:
        typer.echo(f"\nmean piece_frac (occupied classes): "
                   f"{sum(r['piece_frac'] for r in occ) / len(occ) * 100:.1f}%")
    (run_dir / "reliance.json").write_text(
        json.dumps({"split": split, "per_class": per_class, "classes": stats}, indent=2), encoding="utf-8")
    typer.echo(f"wrote {run_dir / 'reliance.json'}")


@app.command("export")
def export_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    fmt: str = typer.Option("torchscript", "--format",
                            help="torchscript | onnx | qnn | onnx-qnn | all "
                                 "(qnn = INT8/QDQ ONNX for the on-device Hexagon NPU)"),
    infer_size: str | None = typer.Option(
        None, "--infer-size",
        help="Set the model's inference size WxH (e.g. 96x96) in its config.json, then export at "
             "it. Omit to use what the model already declares. What a crop carries is "
             "board_size/8 * (1 + 2*pad_side) px — 110 on the fixed rig — see specs/22."),
) -> None:
    """Export best.pt to TorchScript/ONNX + model_card.json (handoff to inference app)."""
    from ..training.evaluate import run_export

    size = _out_size(infer_size)
    raise typer.Exit(run_export(run=run, fmt=fmt, infer_size=size))


@app.command("quantize")
def quantize_cmd(
    run: str = typer.Option(..., "--run", help="Run directory (must already contain model.onnx)."),
    limit: int = typer.Option(128, "--limit", help="Number of calibration crops (class-balanced)."),
    activation: str = typer.Option("quint16", "--activation",
                                   help="quint16 (A16W8, recommended for HTP) | quint8 (pure INT8)."),
    weight: str = typer.Option("quint8", "--weight", help="quint8 | qint8 (weight dtype)."),
    per_channel: bool = typer.Option(
        True, "--per-channel/--per-tensor",
        help="One weight scale per output channel (default) or one per tensor. Per-channel was "
             "the only phantom-free graph measured in specs/26 phase 02; per-tensor is the "
             "historical HTP constraint — use it if the NPU refuses the per-channel graph."),
) -> None:
    """Static-quantize model.onnx -> model.qnn.onnx (INT8 QDQ) for the Hexagon NPU QNN EP."""
    from ..training.quantize import run_quantize

    raise typer.Exit(run_quantize(run=run, limit=limit, activation_type=activation,
                                  weight_type=weight, per_channel=per_channel))
