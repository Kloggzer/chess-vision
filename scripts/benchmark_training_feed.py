"""Measure the unchanged CPU training feed on real packed training boards (no model updates)."""
from __future__ import annotations

import argparse
import gc
import json
import os
import random
import sys
import time
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')


class ReferenceGamma:
    def __init__(self, lo, hi):
        self.lo, self.hi = lo, hi

    def __call__(self, image):
        from torchvision.transforms.functional import adjust_gamma
        return adjust_gamma(image, random.uniform(self.lo, self.hi))


def reference_transform(transform):
    from torchvision import transforms as T

    from chesslab.training import cpu_aug
    from chesslab.training.torch_data import _RandomGamma
    ops = []
    for op in transform.transforms:
        if isinstance(op, cpu_aug.ColorJitter):
            op = T.ColorJitter(op.brightness or 0, op.contrast or 0, op.saturation or 0, op.hue or 0)
        elif isinstance(op, cpu_aug.ToTensor):
            op = T.ToTensor()
        elif isinstance(op, cpu_aug.Normalize):
            op = T.Normalize(op.mean, op.std, inplace=True)
        elif isinstance(op, _RandomGamma):
            op = ReferenceGamma(op.lo, op.hi)
        elif isinstance(op, T.RandomErasing):
            op = T.RandomErasing(op.p, op.scale, op.ratio, op.value, inplace=False)
        ops.append(op)
    return T.Compose(ops)


def private_mb(pids):
    import ctypes
    from ctypes import wintypes
    class Counters(ctypes.Structure):
        _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD)] + [
            (name, ctypes.c_size_t) for name in ('PeakWorkingSetSize', 'WorkingSetSize',
            'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage',
            'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage', 'PrivateUsage')]
    if os.name != 'nt':
        return None
    kernel = ctypes.windll.kernel32
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = [ctypes.c_void_p, ctypes.POINTER(Counters), wintypes.DWORD]
    total = 0
    for pid in pids:
        handle = kernel.OpenProcess(0x410, False, pid)
        if not handle:
            return None
        try:
            counters = Counters()
            counters.cb = ctypes.sizeof(counters)
            if not query(handle, ctypes.byref(counters), counters.cb):
                return None
            total += counters.PrivateUsage
        finally:
            kernel.CloseHandle(handle)
    return total / 1024**2


def main():
    import numpy as np
    import torch
    from PIL import Image
    from torch.utils.data import DataLoader

    from chesslab import config
    from chesslab.training.torch_data import PackedBoardDataset, build_transform
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--run', default='data/models/p4a-v6-s42')
    ap.add_argument('--workers', default='4,8,10,12')
    ap.add_argument('--steps', type=int, default=80)
    ap.add_argument('--profile-only', action='store_true')
    ap.add_argument('--reference', action='store_true')
    ap.add_argument('--gpu', action='store_true', help='Scratch training steps; no saved weights are changed.')
    ap.add_argument('--channels-last', action='store_true')
    ap.add_argument('--compile-model', action='store_true', help='Spike only: compile the disposable model.')
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    main_threads = torch.get_num_threads()
    torch.set_num_threads(1)
    cfg = json.loads((Path(args.run) / 'config.json').read_text())
    dd = Path('data/datasets') / cfg['dataset']
    size = tuple(cfg['out_size'])
    assert size == (80, 80) and not cfg['batch_aug']
    policy = replace(config.AUGMENT, **{k: cfg['aug_' + k] for k in config.AUGMENT.__dataclass_fields__
                                      if 'aug_' + k in cfg})
    tf = build_transform(size, train=True, policy=policy)
    if args.reference:
        tf = reference_transform(tf)
    train = set(cfg['split']['splits']['train'])
    rows = []
    with (dd / 'manifest.jsonl').open(encoding='utf-8') as f:
        for i, line in enumerate(f):
            r = json.loads(line)
            if r['session_id'] in train:
                rows.append({**{k: r[k] for k in ('path', 'session_id', 'frame', 'square', 'label',
                                                 'brightness', 'coverage') if k in r}, '_packed_idx': i})
    pack = dd / 'packed_images.u8'
    ds = PackedBoardDataset(rows, cfg['classes'], tf,
                            (str(pack), (pack.stat().st_size // (80*80*3), 80, 80), None))
    ds.rows = None
    del rows
    gc.collect()
    rng = np.random.default_rng(42)
    indices = rng.integers(len(ds), size=4*(args.steps+20)).tolist()
    report = {'reference': args.reference, 'gpu': args.gpu, 'channels_last': args.channels_last,
              'torch': torch.__version__, 'compile_model': args.compile_model,
              'boards': len(ds), 'contiguous_fraction': float(ds._run.mean()), 'stages_us': {}, 'loaders': []}
    arrays = ds._board(indices[0])
    values = [Image.fromarray(arr) for arr in arrays] * 4
    random.seed(42)
    torch.manual_seed(42)
    for op in tf.transforms:
        t = time.perf_counter()
        values = [op(v) for v in values]
        elapsed = (time.perf_counter()-t)*1e6/len(values)
        name = repr(op)
        report['stages_us'][name] = round(elapsed, 2)
        print(name, round(elapsed, 2), 'us/crop', flush=True)
    t = time.perf_counter()
    for _ in range(40):
        torch.stack(values[:64])
    report['stack_board_us'] = (time.perf_counter()-t)*1e6/40
    for warm in range(2):
        t = time.perf_counter()
        for idx in indices[:64]:
            ds._board(idx)
        report[f'read_board_pass{warm}_us'] = (time.perf_counter()-t)*1e6/64
    # Warm precisely the sampled pages in both arms, without clearing the OS cache.
    for idx in indices:
        ds._board(idx)
    step = None
    if args.gpu:
        from chesslab.training.train import _device_batches
        torch.set_num_threads(main_threads)
        from chesslab.training.model import build_model
        from chesslab.training.occlusion import OcclusionLoss
        model = build_model(cfg['backbone'], len(cfg['classes'])+1, norm=cfg['norm'],
                            board_width=cfg['board_width'], board_layers=cfg['board_layers']).cuda()
        if args.channels_last:
            model.to(memory_format=torch.channels_last)
        if args.compile_model:
            model.forward = torch.compile(model.forward, fullgraph=True)
        optimizer = torch.optim.AdamW(model.parameters(), lr=cfg['lr'], weight_decay=cfg['weight_decay'])
        scaler = torch.amp.GradScaler('cuda')
        criterion = OcclusionLoss(torch.tensor([cfg['effective_class_weights'][c]
                                               for c in cfg['classes']], device='cuda'))
        def step(x, y):
            x, y = x.cuda(non_blocking=True), y.cuda(non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast('cuda'):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            return loss.detach()
        x, y = ds.collate_fn([ds[i] for i in indices[:4]])
        x, y = x.cuda(), y.cuda()
        if args.channels_last:
            from chesslab.training.train import _channels_last_batch
            x = _channels_last_batch(x)
        for _ in range(20):
            step(x, y)
        torch.cuda.synchronize()
        t = time.perf_counter()
        for _ in range(args.steps):
            step(x, y)
        torch.cuda.synchronize()
        report['resident_gpu_crops_s'] = args.steps*256/(time.perf_counter()-t)
        print('resident GPU', report['resident_gpu_crops_s'], flush=True)
    if not args.profile_only:
        for workers in map(int, args.workers.split(',')):
            dl = DataLoader(ds, batch_size=4, sampler=indices, num_workers=workers,
                            prefetch_factor=2, persistent_workers=True, pin_memory=True,
                            collate_fn=ds.collate_fn, generator=torch.Generator().manual_seed(42))
            try:
                it = (_device_batches(dl, torch.device('cuda'), channels_last=args.channels_last)
                      if args.gpu else iter(dl))
                for _ in range(20):
                    batch = next(it)
                    if step:
                        step(*batch)
                if args.gpu:
                    torch.cuda.synchronize()
                t = time.perf_counter()
                wait = 0.0
                for _ in range(args.steps):
                    fetch = time.perf_counter()
                    batch = next(it)
                    wait += time.perf_counter()-fetch
                    if step:
                        step(*batch)
                if args.gpu:
                    torch.cuda.synchronize()
                sec = time.perf_counter()-t
                row = {'workers': workers, 'crops_s': args.steps*256/sec, 'seconds': sec, 'data_wait_s': wait,
                       'worker_private_mb': private_mb([w.pid for w in dl._iterator._workers])}
                report['loaders'].append(row)
                print(row, flush=True)
            finally:
                if dl._iterator is not None:
                    dl._iterator._shutdown_workers()
                del dl
                gc.collect()
    Path(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
    if args.gpu:
        # Exit before Python destroys the local GPU/loader objects. The isolated benchmark
        # has synchronized all work, joined workers and closed its report at this point.
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)


if __name__ == '__main__':
    main()
    if '--gpu' in sys.argv:
        # All steps synchronized, workers joined and report closed above. This ROCm build
        # can hang in interpreter teardown after combining GPU work and spawned loaders.
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
