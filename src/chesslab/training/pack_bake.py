"""Ein abgeleiteter Pack, schon durch den FESTEN Teil der Kette gedreht.

Fest je Crop sind nur `Resize` und CLAHE; Augmentation wuerfelt je Epoche und bleibt im Loader.
Was das kostet, was es bringt und warum `config.json` CLAHE trotzdem behaelt: `docs/packs.md`.
"""

from __future__ import annotations

import json
import shutil
import time

import numpy as np
from PIL import Image

from .. import config
from ..ioutil import write_json
from .pack import _packed_paths

#: Wie viele Crops auf einmal durch den Speicher gehen. 4096 * 80 * 80 * 3 = 79 MB je Puffer.
CHUNK = 4096

#: Was neben den Pixeln mitkommt: der abgeleitete Datensatz muss dieselben Zeilen und dieselben
#: Folds haben, sonst vergleicht ein Lauf auf ihm nichts mehr mit einem Lauf auf dem Original.
#: `split-pin.json` gehoert dazu, weil der Riegel in `train`/`run_eval` an der EXISTENZ der Datei
#: haengt: fehlt sie beim Zwilling, schweigt er und der Lauf misst still den ersetzten Val.
COPIED = ("manifest.jsonl", "dataset.yaml", "split.json", "split-pin.json")


def baked_of(name: str, paths: config.Paths = config.DATA) -> dict | None:
    """Die eingebackene Transformation eines Datensatzes, oder `None` fuer einen rohen Pack."""
    from ..dataset_build import dataset_dir

    _, meta_path = _packed_paths(dataset_dir(name, paths))
    if not meta_path.exists():
        return None
    return json.loads(meta_path.read_text(encoding="utf-8")).get("baked")


def clahe_params(cfg: dict) -> dict:
    """Die CLAHE-Einstellung eines Laufs, so wie `build_transform` sie liest."""
    return {"clip": float(cfg.get("clahe_clip", 0.0)), "tile": int(cfg.get("clahe_tile", 8)),
            "min_mean": float(cfg.get("clahe_min_mean", 0.0)),
            "max_mean": float(cfg.get("clahe_max_mean", 255.0)),
            "denoise": str(cfg.get("clahe_denoise", "off"))}


def bake_pack(src: str, dst: str, params: dict, paths: config.Paths = config.DATA,
              force: bool = False) -> dict:
    """`src`s Pack durch CLAHE gedreht, als eigener Datensatz `dst`.

    Gebacken wird in der Groesse, in der der Pack liegt. Ob das die Groesse ist, in der der Lauf
    trainiert, kann hier niemand wissen — `skip_baked` prueft es beim Training.
    """
    from ..dataset_build import dataset_dir
    from .torch_data import _Clahe

    if params["clip"] <= 0:
        raise ValueError("nichts zu backen: clahe_clip ist 0 — der Pack waere eine reine Kopie")

    sd = dataset_dir(src, paths)
    src_img, src_meta_path = _packed_paths(sd)
    if not src_meta_path.exists():
        raise FileNotFoundError(f"{src} hat keinen Pack — erst `chesslab dataset pack {src}`")
    meta = json.loads(src_meta_path.read_text(encoding="utf-8"))
    if meta.get("packed_from"):
        raise ValueError(f"{src} leiht die Pixel von '{meta['packed_from']}' — backe den her")
    if meta.get("baked"):
        raise ValueError(f"{src} ist selbst schon gebacken ({meta['baked']}) — zweimal CLAHE "
                         "ist ein anderer Operator, kein schnellerer")

    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])
    dd = dataset_dir(dst, paths)
    dst_img, dst_meta_path = _packed_paths(dd)
    if dst_meta_path.exists() and not force:
        raise FileExistsError(f"{dst} hat schon einen Pack — --force ueberschreibt ihn")
    dd.mkdir(parents=True, exist_ok=True)

    clahe = _Clahe(params["clip"], params["tile"], params["min_mean"],
                   params["max_mean"], params["denoise"])
    source = np.memmap(src_img, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    # Zuerst die Pixel, erst danach das Meta: ein abgebrochener Lauf laesst dann eine Datei ohne
    # Meta zurueck, und `load_packed` sieht "nicht gepackt" statt halb geschriebener Zeilen.
    dst_meta_path.unlink(missing_ok=True)
    out = np.memmap(dst_img, dtype=np.uint8, mode="w+", shape=(n, h, w, 3))
    started = time.time()
    # `_Clahe` gibt dasselbe Bild ZURUECK, wenn die Zelle ausserhalb des Helligkeitsbands liegt —
    # die Identitaet ist also die exakte Antwort auf "wie viele hat der Operator angefasst".
    touched = 0
    for start in range(0, n, CHUNK):
        block = np.array(source[start:start + CHUNK])
        for k, arr in enumerate(block):
            img = Image.fromarray(arr)
            done = clahe(img)
            touched += done is not img
            out[start + k] = np.asarray(done)
        print(f"[bake] {min(start + CHUNK, n)}/{n} Crops "
              f"({100.0 * min(start + CHUNK, n) / n:.1f} %)", flush=True)
    out.flush()
    del out, source

    for name in COPIED:
        if (sd / name).exists():
            shutil.copy2(sd / name, dd / name)
    folds = sorted(sd.glob("split-f*.json"))
    for fold in folds:
        shutil.copy2(fold, dd / fold.name)

    # `crop_fingerprint` bleibt: ein Re-Slice macht auch den gebackenen Pack ungueltig, und der
    # Wachhund in `_rewritten_since_pack` ist der einzige, der das merkt.
    new = dict(meta)
    new["baked"] = {"op": "clahe", **params, "from": src, "at": time.time()}
    write_json(dst_meta_path, new, indent=None)
    gb = n * h * w * 3 / 1e9
    print(f"[OK] {n} Crops gebacken -> {dst_img} ({gb:.1f} GB, {time.time() - started:.0f} s, "
          f"{touched} von CLAHE veraendert, {len(folds)} Folds mitkopiert)")
    return {"n": n, "h": h, "w": w, "gb": round(gb, 1), "changed": touched,
            "folds": len(folds), "path": str(dst_img)}


def cfg_for_pack(cfg: dict, ds_name: str | None, packed, out_size=None) -> dict:
    """`cfg` fuer Pixel aus `packed`, wie `run_eval` ihn baut: CLAHE raus, wenn er schon drin ist."""
    from .packs import packed_shape

    baked = baked_of(ds_name, config.DATA) if ds_name and packed is not None else None
    if not skip_baked(baked, clahe_params(cfg), out_size or cfg["out_size"],
                      packed_shape(packed)[1:] if baked else None):
        return cfg
    print(f"[bake] CLAHE steckt im Pack ({baked['from']}) — hier wird er nicht noch einmal gerechnet")
    return {**cfg, "clahe_clip": 0.0}


def skip_baked(baked: dict | None, params: dict, out_size, pack_hw) -> bool:
    """Darf der Loader CLAHE auslassen? Sonst FLIEGT es: still doppelt oder still gar nicht
    gerechnet sind beide ein anderer Operator als der, den `config.json` behauptet."""
    if not baked:
        return False
    if baked.get("op") != "clahe":
        raise ValueError(f"Pack traegt eine unbekannte eingebackene Transformation: {baked!r}")
    want = {k: params[k] for k in ("clip", "tile", "min_mean", "max_mean", "denoise")}
    have = {k: baked.get(k) for k in want}
    if want["clip"] <= 0:
        raise ValueError(f"Der Pack ist mit CLAHE gebacken ({have}), der Lauf trainiert ohne — "
                         "nimm den rohen Datensatz oder setze --clahe-clip.")
    if have != want:
        raise ValueError(f"CLAHE des Packs {have} != CLAHE des Laufs {want} — der gebackene Pack "
                         "gehoert zu einem anderen Rezept.")
    if tuple(out_size) != (int(pack_hw[1]), int(pack_hw[0])):
        raise ValueError(f"--input-size {tuple(out_size)} passt nicht zum gebackenen Pack "
                         f"{(int(pack_hw[1]), int(pack_hw[0]))}: CLAHE wurde auf der Packgroesse "
                         "gerechnet, ein Resize davor macht daraus einen anderen Operator.")
    return True
