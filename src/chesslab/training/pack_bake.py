"""Ein abgeleiteter Pack, schon durch den FESTEN Teil der Kette (Resize, CLAHE) gedreht;
Augmentation bleibt im Loader (`docs/packs.md`).
"""

from __future__ import annotations

import json
import shutil
import time

import numpy as np
from PIL import Image

from .. import config
from ..ioutil import write_json
from .packs import _packed_paths

#: Wie viele Crops auf einmal durch den Speicher gehen. 4096 * 80 * 80 * 3 = 79 MB je Puffer.
CHUNK = 4096

#: Dieselben Zeilen und Folds wie das Original. `split-pin.json` gehoert dazu: der Riegel in
#: `train`/`run_eval` haengt an ihrer EXISTENZ.
COPIED = ("manifest.jsonl", "dataset.yaml", "split.json", "split-pin.json")


def bake_pack(src: str, dst: str, params: dict, paths: config.Paths = config.DATA,
              force: bool = False) -> dict:
    """`src`s Pack durch CLAHE gedreht, als eigener Datensatz `dst`, in der Groesse des Packs;
    `skip_baked` prueft beim Training.
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
    # Zuerst die Pixel, dann das Meta: ein Abbruch sieht dann "nicht gepackt".
    dst_meta_path.unlink(missing_ok=True)
    out = np.memmap(dst_img, dtype=np.uint8, mode="w+", shape=(n, h, w, 3))
    started = time.time()
    # `_Clahe` gibt ausserhalb des Bands dasselbe Objekt ZURUECK: die Identitaet zaehlt exakt.
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

    # `crop_fingerprint` bleibt: ein Re-Slice macht auch den gebackenen Pack ungueltig.
    new = dict(meta)
    new["baked"] = {"op": "clahe", **params, "from": src, "at": time.time()}
    write_json(dst_meta_path, new, indent=None)
    gb = n * h * w * 3 / 1e9
    print(f"[OK] {n} Crops gebacken -> {dst_img} ({gb:.1f} GB, {time.time() - started:.0f} s, "
          f"{touched} von CLAHE veraendert, {len(folds)} Folds mitkopiert)")
    return {"n": n, "h": h, "w": w, "gb": round(gb, 1), "changed": touched,
            "folds": len(folds), "path": str(dst_img)}
