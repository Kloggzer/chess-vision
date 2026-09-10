"""Compare augmentation values, RNG consumption and steady-state GPU throughput."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import types
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))


def main():
    import torch

    from chesslab import config
    from chesslab.training import batch_aug

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--reference', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--compile', action='store_true')
    ap.add_argument('--preserve-rng-only', action='store_true')
    args = ap.parse_args()
    torch.set_num_threads(1)
    old = types.ModuleType('reference_batch_aug')
    exec(args.reference.read_text(encoding='utf-8-sig'), old.__dict__)
    cfg = json.loads(Path('data/models/p4a-v6-s42/config.json').read_text())
    policy = replace(config.AUGMENT, **{k: cfg['aug_' + k] for k in config.AUGMENT.__dataclass_fields__
                                      if 'aug_' + k in cfg})

    def build(module):
        return module.BatchPhotometric(policy, config.NORMALIZE_MEAN, config.NORMALIZE_STD,
                                       from_uint8=True, geometry=module.BatchGeometry(policy))

    reference, current = build(old), build(batch_aug)
    report = {'torch': torch.__version__, 'comparisons': [], 'timing_ms': {}}
    for device in ('cpu', 'cuda'):
        for n in (1, 64, 256):
            raw = torch.randint(0, 256, (n, 3, 80, 80), generator=torch.Generator().manual_seed(90),
                                dtype=torch.uint8).to(device)
            for seed in (0, 1, 42):
                torch.manual_seed(seed)
                a = reference(raw)
                cpu_state, gpu_state = torch.get_rng_state(), torch.cuda.get_rng_state()
                torch.manual_seed(seed)
                b = current(raw)
                report['comparisons'].append({'device': device, 'crops': n, 'seed': seed,
                    'equal': torch.equal(a, b), 'max_error': float((a-b).abs().max()),
                    'cpu_rng_equal': torch.equal(cpu_state, torch.get_rng_state()),
                    'gpu_rng_equal': torch.equal(gpu_state, torch.cuda.get_rng_state())})
    print('parity', report['comparisons'], flush=True)
    variants = [('reference', reference), ('cached', current)]
    if args.compile and not args.preserve_rng_only:
        compiled = build(batch_aug)
        compiled.compile(preserve_rng=False)
        variants.append(('compiled', compiled))
    if args.compile:
        same_rng = build(batch_aug)
        same_rng.compile()
        variants.append(('compiled_eager_rng', same_rng))
    for name, aug in variants:
        row = {}
        try:
            if name.startswith('compiled'):
                # Each candidate owns six order-specialized graphs; do not share its limit.
                torch._dynamo.reset()
            torch.manual_seed(42)
            expected = current(raw)
            cpu_rng, gpu_rng = torch.get_rng_state(), torch.cuda.get_rng_state()
            torch.manual_seed(42)
            actual = aug(raw)
            row = {'equal_to_eager': torch.equal(expected, actual),
                   'max_error': float((expected-actual).abs().max()),
                   'cpu_rng_equal': torch.equal(cpu_rng, torch.get_rng_state()),
                   'gpu_rng_equal': torch.equal(gpu_rng, torch.cuda.get_rng_state())}
            # Exercise all six jitter orders before timing; compilation is excluded.
            for _ in range(100):
                aug(raw)
            measurements = []
            for _ in range(3):
                torch.cuda.synchronize()
                start = time.perf_counter()
                for _ in range(100):
                    aug(raw)
                torch.cuda.synchronize()
                measurements.append((time.perf_counter()-start)*10)
            row['ms_per_batch'] = measurements
            if name == 'compiled_eager_rng':
                checks = []
                for n in (64, 128, 192, 256):
                    for seed in range(6):
                        image = raw[:n].reshape(n // 64, 64, 3, 80, 80)
                        torch.manual_seed(seed)
                        a = current(image)
                        cpu_state, gpu_state = torch.get_rng_state(), torch.cuda.get_rng_state()
                        torch.manual_seed(seed)
                        b = aug(image)
                        checks.append({'crops': n, 'seed': seed,
                            'max_error': float((a-b).abs().max()),
                            'cpu_rng_equal': torch.equal(cpu_state, torch.get_rng_state()),
                            'gpu_rng_equal': torch.equal(gpu_state, torch.cuda.get_rng_state())})
                row['board_batch_checks'] = checks
            report['timing_ms'][name] = row
        except Exception as exc:
            report['timing_ms'][name] = {**row, 'error': str(exc)}
        print(name, report['timing_ms'][name], flush=True)
        args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)
