"""Der Futterweg eines Laufs: Datensatz-Dateien, Zeilen, Datensaetze, Sampler, Loader, Geraet.

Alles zwischen `manifest.jsonl` und dem Batch auf dem Geraet. Die Pixel liefert `pack`/`packs`.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

from .. import config
from ..dataset import load_manifest, load_split
from .data import dataset_paths, filter_rows_by_split, unnamed_pin
from .train_recipe import Refused

#: Loader-Worker, wenn `--batch-aug` den Feed schlank macht. Gemessen 2026-09-07: 1 reicht warm
#: (104 us gegen 127 Budget), ist kalt aber zu langsam (129); 2 sind cold-safe (79).
BATCH_AUG_WORKERS = 2


def _require_pack(dataset: str | None, n_rows: int, allow_unpacked: bool) -> None:
    """Ohne Memmap gar nicht erst starten, sobald der Datensatz gross genug zum Packen ist.

    Ein verworfener Pack fiel bisher still auf den Datei-Loader zurueck: die Folds und der
    SWA-Lauf liefen dreifach langsam an einem veralteten Pack vorbei, ohne dass es jemand sah.
    """
    from ..dataset_build import _PACK_MIN_CROPS

    if allow_unpacked or dataset is None or n_rows < _PACK_MIN_CROPS:
        return
    raise ValueError(
        f"'{dataset}' hat keine nutzbare Memmap ({n_rows} Crops) - das Training bricht ab "
        f"statt still auf den Datei-Loader zu fallen. Grund steht in der WARNING darueber. "
        f"Repack: chesslab dataset pack {dataset} - absichtlich ohne Pack: --allow-unpacked.")


def _channels_last_batch(x):
    """Change storage order, preserving the board/cell axes and every input value."""
    import torch

    if x.dim() == 5:
        return x.flatten(0, 1).contiguous(memory_format=torch.channels_last).view_as(x)
    return x.contiguous(memory_format=torch.channels_last)


def _device_batches(loader, device, *, channels_last=False):
    """Yield batches with the next host-to-device copy overlapped with model work.

    The copy stream changes scheduling only: values, random draws and batch order stay. It matters
    for the small cell models, where a synchronous ``.to(device)`` leaves the GPU waiting.
    """
    from .memory import guarded_batches

    if getattr(getattr(loader, "dataset", None), "low_memory", False):
        for x, y in guarded_batches(loader):
            x = x.to(device, non_blocking=False)
            yield (_channels_last_batch(x) if channels_last else x), y.to(device, non_blocking=False)
        return
    if device.type != "cuda":
        for x, y in guarded_batches(loader):
            yield (_channels_last_batch(x) if channels_last else x), y
        return
    import torch
    iterator = iter(guarded_batches(loader))
    stream = torch.cuda.Stream(device=device)
    pending = None

    def preload():
        nonlocal pending
        try:
            cpu_x, cpu_y = next(iterator)
        except StopIteration:
            pending = None
            return
        with torch.cuda.stream(stream):
            x = cpu_x.to(device, non_blocking=True)
            if channels_last:
                x = _channels_last_batch(x)
            pending = (x, cpu_y.to(device, non_blocking=True))

    preload()
    current = torch.cuda.current_stream(device)
    while pending is not None:
        current.wait_stream(stream)
        x, y = pending
        x.record_stream(current)
        y.record_stream(current)
        preload()
        yield x, y


def data_files(dataset: str | None, split_file: str | None) -> tuple[Path, Path]:
    """`(manifest, split)` the run trains on — refused when a file is missing or a pin unnamed."""
    manifest_path, split_path = dataset_paths(dataset, split_file)
    if dataset:
        # One packed corpus, several splits over it (cross-validation folds): the memmap is
        # 9 GB and packing it per fold copies the same crops four times. `occluded_model.
        # trained_on` reads the name back out of config.json, so the circularity guard follows.
        dd = manifest_path.parent
        pinned = unnamed_pin(dataset, split_file)
        if pinned is not None:
            print(f"[FAIL] '{dataset}' hat einen gepinnten Schnitt ({pinned.name}), aber --split "
                  "nennt ihn nicht. Entweder `--split split-pin.json` mitgeben oder ausdruecklich "
                  "`--split split.json` sagen.")
            raise Refused
        if not manifest_path.exists() or not split_path.exists():
            print(f"[FAIL] Dataset '{dataset}' not built ({dd}). First build it in the Datasets tab "
                  "(`chesslab dataset build`), then train.")
            raise Refused
    else:
        if not manifest_path.exists():
            print(f"[FAIL] No manifest ({manifest_path}). First collect data and slice "
                  "(`chesslab slice`), then train.")
            raise Refused
        if not split_path.exists():
            print(f"[FAIL] No split ({split_path}). First run `chesslab split` "
                  "(train/val/test per session + class balancing), then train.")
            raise Refused
    return manifest_path, split_path


def read_data(manifest_path: Path, split_path: Path, strict_verdicts: bool):
    """`(manifest, split, verdicts)`; a human verdict against a row refuses under `strict`."""
    from ..dataset_build import check_verdicts

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    try:
        verdicts = check_verdicts(manifest, split["splits"], strict=strict_verdicts)
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise Refused from None
    return manifest, split, verdicts


def train_size(input_size: str | None, dataset: str | None, manifest: list[dict]):
    """`(out_size, packed)`: the size the MODEL trains at, and the dataset's pack (or None)."""
    # The FILE's size and the MODEL's size stopped being the same thing when the crop store went
    # to 128 px for the label view (2026-08-17). Reading the manifest silently made the store
    # decide the recipe; `input_size` says it out loud, and `build_transform` scales in memory.
    from ..labeling import parse_out_size

    out_size = parse_out_size(input_size) if input_size else None
    # A pack built with `--pack-size` already holds the model's resolution, and it is what the
    # loader will actually serve — reading the manifest instead would scale 80 px pixels back up
    # to the 128 px the FILES are, which is worse than either.
    src = "--input-size"
    from .packs import open_dataset_pack, packed_shape

    packed = open_dataset_pack(dataset, config.DATA, manifest_rows=manifest)
    if out_size is None:
        if packed is not None:
            _, ph, pw = packed_shape(packed)
            out_size, src = (pw, ph), "the pack"
    for r in manifest:
        out_size, src = (out_size, src) if out_size else (tuple(r["out_size"]), "the manifest")
        print(f"[size] training at {out_size[0]}x{out_size[1]} from {r['out_size'][0]}x"
              f"{r['out_size'][1]} crops (from {src})")
        break
    if out_size is None:
        print("[FAIL] empty manifest.")
        raise Refused
    return out_size, packed


def training_rows(manifest: list[dict], split: dict, seed: int, dataset: str | None,
                  backbone: str, scales, head: str, no_empty_cap: bool, neighbour_p):
    """`(train_rows, val_rows, priority_paths, board_mode)` — train re-balanced, val full."""
    # Balancing ONLY applied to train (policy is in split.json); val/test stay full.
    from ..dataset import load_priority_paths, subsample_classes

    ts = split.get("train_subsample") or {}
    # The mined hard negatives have to be protected HERE too, not only in the build: the
    # dataset's manifest holds the uncapped rows, so this re-draw is what actually decides
    # which `empty` crops a batch ever sees.
    priority_paths = load_priority_paths()
    if priority_paths:
        print(f"[i] hard-empty keep list: {len(priority_paths)} crops protected from the empty cap")
    if neighbour_p:
        print(f"[aug] Nachbar-Uebersprung auf leeren Zellen: p={neighbour_p:g} "
              f"(Streifen {config.AUGMENT.neighbour_frac})")
    board_mode = backbone.startswith(("board:", "boardattn:"))
    if board_mode and (scales or head != "occlusion"):
        print("[FAIL] board:-Backbones brauchen --head occlusion und vertragen kein --scales: "
              "der Batch traegt eine Zellachse, die beides nicht kennt.")
        raise Refused
    if no_empty_cap and ts.get("max_empty_ratio"):
        # Der Brett-Arm MUSS ohne Kappe laufen; ein Zell-Arm mit Kappe saehe dann einen anderen
        # Datenpool. Fuer einen gepaarten Sweep gehoert der Schalter auf beide Seiten.
        print("[i] --no-empty-cap: die empty-Kappe des Splits bleibt aus.")
        ts = {**ts, "max_empty_ratio": None}
    if board_mode and ts.get("max_empty_ratio"):
        # Aus einem Brett laesst sich keine Zelle wegwerfen. Das Ausduennen bleibt hier also aus,
        # und `empty` wird ueber die Verlustgewichte ausgeglichen statt ueber den Sampler.
        print("[board] --max-empty-ratio wird ignoriert: der Brettkopf braucht alle 64 Zellen.")
        ts = {**ts, "max_empty_ratio": None}
    train_rows = subsample_classes(
        filter_rows_by_split(manifest, split, "train"),
        max_empty_ratio=ts.get("max_empty_ratio"),
        max_class_ratio=ts.get("max_class_ratio"),
        seed=ts.get("seed", seed),
        priority_paths=priority_paths,
    )
    val_rows = filter_rows_by_split(manifest, split, "val")
    if not train_rows:
        hint = ("rebuild the dataset with more sessions" if dataset
                else "re-slice and run `chesslab split` again")
        print("[FAIL] train split is empty — too few sessions. Train/val/test are separated per "
              f"session (to prevent data leakage); record at least 2-3 sessions and {hint}.")
        raise Refused
    from collections import Counter as _Counter

    print(f"[OK] train balanced: {len(train_rows)} crops, distribution: "
          + ", ".join(f"{k}={v}" for k, v in sorted(_Counter(r['label'] for r in train_rows).items())))
    return train_rows, val_rows, priority_paths, board_mode


def check_fused(train_rows: list[dict], packed, dataset: str | None) -> None:
    # Packed memmap loader (training.packs): if the dataset was `chesslab dataset pack`ed, read
    # crops from ONE memmap instead of 1M per-item Image.open (the I/O bottleneck).
    # Fused datasets (dataset build-synth) have NO crop files at all — manifest paths are virtual
    # mm:// keys into the memmap. The per-PNG loader would crash on the first batch there.
    fused = bool(train_rows) and str(train_rows[0].get("path", "")).startswith("mm://")
    if fused and packed is None:
        print(f"[FAIL] dataset '{dataset}' has mm:// paths — a fused synth build or a pack-built "
              "dataset — but no usable memmap: re-run `chesslab dataset build-synth`, or check "
              "that dataset.yaml still names its packs under data/packs/.")
        raise Refused


def rotations(dataset: str | None, want_rot: bool | None) -> bool:
    # Rotation aug runs on-the-fly (torch_data._RandomRot90) when the dataset was built with
    # non-trivial `rotations` — the build no longer materializes rotated copies (4x disk/memmap).
    rot90 = False
    if dataset:
        from ..dataset_build import _read_yaml, dataset_dir
        ds_rot = _read_yaml(dataset_dir(dataset) / "dataset.yaml").get("rotations") or []
        rot90 = any(int(d) % 360 for d in ds_rot)
        if rot90:
            print("[aug] on-the-fly 90-degree rotations (dataset built with rotations="
                  f"{list(ds_rot)})")
    if want_rot is not None and want_rot != rot90:
        # Am Lauf statt am Build: jeder Datensatz steht heute auf rotations=[0]. Auf einem
        # achsenparallelen Zellcrop bleibt bei Vielfachen von 90° die Feldgeometrie gueltig — und
        # die perspektivische Neigung dreht mit: eine Figur der Reihe 8 neigt nach oben, um 90°
        # gedreht nach rechts, wie eine auf der a-Linie. Daran scheitern die Grundreihen.
        rot90 = want_rot
        print(f"[aug] 90-Grad-Drehungen per Flag {'AN' if rot90 else 'AUS'}")
    return rot90


def build_datasets(recipe: dict, *, packed, out_size, policy, photometric, rot90, board_mode,
                   train_rows, val_rows, classes, occluding):
    """`(train_ds, val_ds)`: packed memmap when there is one, else one file per crop."""
    r = SimpleNamespace(**recipe)
    dataset = r.dataset
    from .memory import check_ram
    from .packs import baked_of, packed_shape, skip_baked
    from .torch_data import (
        PackedBoardDataset,
        PackedSquareDataset,
        SquareDataset,
        build_transform,
    )

    # Ein gebackener Pack traegt CLAHE schon in den Pixeln (`training/pack_bake.py`). Der LOADER
    # laesst den Operator dann aus, `config.json` behaelt ihn trotzdem — das Serving bekommt rohe
    # Kamerabilder und muss ihn selbst rechnen.
    loader_clip = r.clahe_clip
    baked = baked_of(dataset) if dataset else None
    if baked and packed is not None:
        want = {"clip": r.clahe_clip, "tile": r.clahe_tile, "min_mean": r.clahe_min_mean,
                "max_mean": r.clahe_max_mean, "denoise": r.clahe_denoise}
        if skip_baked(baked, want, out_size, packed_shape(packed)[1:]):
            loader_clip = 0.0
            print(f"[bake] CLAHE steckt im Pack ({baked['from']}) — Loader rechnet ihn nicht, "
                  "config.json behaelt ihn fuers Serving")
    tf_kw = {"policy": policy, "per_crop": r.per_crop, "input_repr": r.input_repr,
             "clahe_clip": loader_clip, "clahe_tile": r.clahe_tile,
             "clahe_min_mean": r.clahe_min_mean, "clahe_max_mean": r.clahe_max_mean,
             "clahe_denoise": r.clahe_denoise}
    train_tf = build_transform(out_size, train=True, rot90=rot90,
                               to_uint8=photometric is not None, **tf_kw)
    val_tf = build_transform(out_size, train=False, **tf_kw)
    if packed is not None:
        n, h, w = packed_shape(packed)
        print(f"[pack] fast memmap loader: {n} crops, {n * h * w * 3 / 1e9:.1f} GB")
        if board_mode:
            train_ds = PackedBoardDataset(train_rows, classes, train_tf, packed)
            val_ds = PackedBoardDataset(val_rows, classes, val_tf, packed)
            print(f"[board] {len(train_ds)} Trainings- und {len(val_ds)} Val-Bretter, "
                  f"{train_ds.n_dropped + val_ds.n_dropped} unvollstaendige verworfen")
        else:
            train_ds = PackedSquareDataset(train_rows, classes, train_tf, packed,
                                           with_coverage=occluding, policy=policy,
                                           neighbour_p=r.neighbour_p or 0.0)
            val_ds = PackedSquareDataset(val_rows, classes, val_tf, packed,
                                         with_coverage=occluding)
    else:
        _require_pack(dataset, len(train_rows) + len(val_rows), r.allow_unpacked)
        train_ds = SquareDataset(train_rows, classes, train_tf, with_coverage=occluding,
                                 augment=True, policy=policy)
        val_ds = SquareDataset(val_rows, classes, val_tf, with_coverage=occluding)

    for ds in (train_ds, val_ds):
        ds.low_memory = r.low_memory
        ds.ram_reserve_gb = r.ram_reserve_gb
    check_ram(r.ram_reserve_gb)
    return train_ds, val_ds


@dataclass
class Feed:

    loader: object
    sampler: object
    eval_batch: int
    num_workers: int
    score_rows: list


def train_feed(recipe: dict, *, train_ds, val_ds, train_rows, val_rows, num_workers,
               eval_workers, prefetch_factor, photometric, board_mode,
               priority_paths) -> Feed:
    r = SimpleNamespace(**recipe)
    import torch
    from torch.utils.data import DataLoader, WeightedRandomSampler

    from .boardnet import CELLS as BOARD_CELLS
    from .torch_data import board_collate

    # DataLoader-Tuning: parallele Worker sind der groesste Hebel auf dem I/O-gebundenen
    # Crop-Datensatz (Windows bis 8 stabil), persistent_workers spart das Neu-Spawnen je Epoche.
    # Mit `--batch-aug` kostet der Feed 76 statt 985 us je Crop, 2 Worker liegen dann unter dem
    # GPU-Budget (kalt 79 us gegen 127) — und Worker sind die Stellschraube, an der die
    # Speicher-Abstuerze hingen (`docs/training-speed.md`).
    lean_default = BATCH_AUG_WORKERS if photometric is not None else config.DEFAULT_NUM_WORKERS
    nw = num_workers if num_workers is not None else lean_default
    if num_workers is None and photometric is not None:
        print(f"[batch-aug] {nw} Loader-Worker statt {config.DEFAULT_NUM_WORKERS} "
              "— der Feed liegt unter dem GPU-Budget (--num-workers ueberschreibt das)")
    if nw < 0 or eval_workers < 0 or prefetch_factor < 1:
        raise ValueError("workers must be non-negative and prefetch_factor must be positive")
    loader_kw = {"batch_size": r.batch_size,
                 **config.loader_kwargs(nw, prefetch_factor=prefetch_factor, pin_memory=not r.low_memory)}
    eval_batch = r.batch_size
    if board_mode:
        # `--batch-size` zaehlt jetzt BRETTER, also 64x so viele Crops. 4 Bretter = 256 Crops.
        loader_kw = {**loader_kw, "batch_size": max(1, r.batch_size // BOARD_CELLS),
                     "collate_fn": board_collate}
        # Die Auswertung baut ihren EIGENEN Loader und muss dieselbe Umrechnung sehen. Ohne sie
        # las sie 256 BRETTER statt 256 Crops — 3,2 GB je Charge, was den Lauf am 28.08. auf
        # 10,9 GB Commit trieb, waehrend der Per-Zell-Arm bei 2,5 GB stand.
        eval_batch = loader_kw["batch_size"]
        print(f"[board] batch_size {r.batch_size} Crops = {loader_kw['batch_size']} Bretter je Schritt")
    sampler = None
    # Eine SITUATION ist (Session, Feld, Klasse) — dieselbe Figur auf demselben Feld, ueber die
    # Frames hinweg. Der Korpus traegt 1 643 davon auf 184 735 Crops, und die Gruppen sind 13,6x
    # ungleich (p10 18, p90 245): die groessten 10 % holen 30 % aller Ziehungen. Gleiche
    # Ziehungsmasse je Situation laesst die Lichtvariation der Frames drin und nimmt nur die
    # Schieflage raus.
    situation_w = None
    if r.balance != "none":
        import collections

        keys = [(r["session_id"], r["square"], r["label"]) for r in train_rows]
        groups = collections.Counter(keys)
        # Situation: jede (Session, Feld, Klasse) gleich oft, egal wie viele Frames sie traegt.
        situation_w = [1.0 / groups[k] for k in keys]
        if r.balance == "piece":
            # Wie `class`, aber `empty` behaelt seinen natuerlichen Anteil: `class` drueckt empty
            # von 54 % auf 7,7 %, und empty-Zellen sind die sauberen NEGATIVBEISPIELE des
            # Verdeckungskopfs — dessen Precision fiel dadurch von 0,944 auf 0,680 (2026-08-26).
            # Die zwoelf Figurenklassen teilen sich den Rest zu gleichen Teilen.
            per_piece: dict[str, int] = collections.Counter()
            for _sid, _sq, lab in set(keys):
                if lab != "empty":
                    per_piece[lab] += 1
            n_empty = sum(1 for k in keys if k[2] == "empty")
            situation_w = [w if k[2] == "empty" else w / per_piece[k[2]]
                           for w, k in zip(situation_w, keys, strict=True)]
            # empty auf seinen Crop-Anteil normieren, damit `piece` nur die Figuren umverteilt.
            share = n_empty / len(keys)
            w_empty = sum(w for w, k in zip(situation_w, keys, strict=True) if k[2] == "empty")
            w_piece = sum(w for w, k in zip(situation_w, keys, strict=True) if k[2] != "empty")
            scale = (share / (1 - share)) * w_piece / max(w_empty, 1e-12)
            situation_w = [w * scale if k[2] == "empty" else w
                           for w, k in zip(situation_w, keys, strict=True)]
        if r.balance == "class":
            # Der Ausgleich im SAMPLER statt im Verlust: jede Klasse gleich oft, darunter jede
            # Situation gleich oft. Gewichtete CE skaliert Gradienten und verzerrt damit die
            # Schrittweite; ein Sampler aendert nur, was im Batch liegt. Gehoert mit
            # `--weight-cap 1` zusammen, sonst wird zweimal ausgeglichen.
            per_class: dict[str, int] = collections.Counter()
            for _sid, _sq, lab in set(keys):
                per_class[lab] += 1
            situation_w = [w / per_class[k[2]] for w, k in zip(situation_w, keys, strict=True)]
        if r.balance == "session":
            # Und darueber jede SESSION gleich oft. Val ist eine zurueckgehaltene Session, also
            # ist Licht und Kamera die Achse, auf der generalisiert werden muss; heute streuen
            # die Anteile 18,8x (0,8 % bis 15,6 %), mit Situations-Balance noch 2,0x.
            per_session: dict[str, int] = collections.Counter()
            for sid, _sq, _lab in set(keys):
                per_session[sid] += 1
            situation_w = [w / per_session[k[0]] for w, k in zip(situation_w, keys, strict=True)]
        print(f"[sampler] balance={r.balance}: {len(groups)} Situationen aus "
              f"{len({k[0] for k in keys})} Sessions, Gruppen "
              f"{min(groups.values())}-{max(groups.values())} Crops")
    if r.hard_negative_multiplier != 1.0:
        if r.hard_negative_multiplier < 1.0:
            print("[FAIL] --hard-negative-multiplier must be at least 1.")
            raise Refused
        if not priority_paths:
            print("[FAIL] --hard-negative-multiplier needs data/reports/hard_empty.jsonl.")
            raise Refused
        base_w = [r.hard_negative_multiplier if row.get("path") in priority_paths else 1.0
                  for row in train_rows]
        if situation_w is not None:
            base_w = [a * b for a, b in zip(base_w, situation_w, strict=True)]
        sample_weights = torch.tensor(base_w, dtype=torch.double)
        hard_count = sum(row.get("path") in priority_paths for row in train_rows)
        print(f"[hard-negative] {hard_count} protected crops sampled at {r.hard_negative_multiplier:g}x weight")
    elif situation_w is not None:
        sample_weights = torch.tensor(situation_w, dtype=torch.double)
    if r.epoch_frac != 1.0 and situation_w is None and r.hard_negative_multiplier == 1.0:
        # Ohne Balance und ohne Hard Negatives gibt es noch keinen Sampler — einer mit
        # Gleichgewichten zieht dieselbe Verteilung, nur weniger davon.
        sample_weights = torch.ones(len(train_rows), dtype=torch.double)
        situation_w = []
    if r.hard_negative_multiplier != 1.0 or situation_w is not None:
        # `num_samples` war immer len(train_rows) — Konvention, nicht Notwendigkeit: wer die
        # 1 643 Situationen gleichmaessig zieht, braucht fuer eine Epoche nicht jede Kopie. Die
        # Cosine haengt an --epochs, nicht an der Epochengroesse — echte Wanduhrzeit, keine
        # Verkuerzung des Zeitplans.
        n_draw = max(1, int(round(r.epoch_frac * len(train_rows))))
        generator = torch.Generator().manual_seed(r.seed)
        sampler = WeightedRandomSampler(sample_weights, n_draw, replacement=True,
                                        generator=generator)
        if r.epoch_frac != 1.0:
            print(f"[sampler] {n_draw} Ziehungen je Epoche statt {len(train_rows)} "
                  f"({r.epoch_frac:g}x)")
    # Alles, was Zeilen gegen Vorhersagen haelt, muss die Reihenfolge des DATENSATZES nehmen:
    # der Brettdatensatz behaelt nur vollstaendige Bretter und sortiert sie nach Feld.
    score_rows = getattr(val_ds, "rows", None) or val_rows

    if board_mode and sampler is not None:
        # Ein Brett so oft ziehen, wie der Zell-Sampler es getroffen HAETTE: die Summe der
        # Zellgewichte ist genau diese Randwahrscheinlichkeit. Exakt zwischen den Brettern,
        # nicht innerhalb — jeder Besuch trainiert alle 64 Zellen (`docs/evaluation.md`).
        by_path = dict(zip((r["path"] for r in train_rows), sample_weights.tolist(), strict=True))
        cells = [by_path[r["path"]] for r in train_ds.rows]
        board_w = torch.tensor(
            [sum(cells[i:i + BOARD_CELLS]) for i in range(0, len(cells), BOARD_CELLS)],
            dtype=torch.double)
        n_draw = max(1, int(round(r.epoch_frac * len(board_w))))
        sampler = WeightedRandomSampler(board_w, n_draw, replacement=True,
                                        generator=torch.Generator().manual_seed(r.seed))
        print(f"[board] Sampler ueber {len(board_w)} Bretter, {n_draw} Ziehungen je Epoche")
    train_loader = DataLoader(train_ds, shuffle=sampler is None, sampler=sampler, drop_last=False, **loader_kw)
    return Feed(train_loader, sampler, eval_batch, nw, score_rows)
