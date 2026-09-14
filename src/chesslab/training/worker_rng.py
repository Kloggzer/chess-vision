from __future__ import annotations

import multiprocessing
import random

import numpy as np
import torch


class _EpochSeededDataset:
    def __init__(self, dataset, epoch, seed) -> None:
        self.dataset = dataset
        self.epoch = epoch
        self.seed = seed
        self.local_epoch = -1

    def __len__(self):
        return len(self.dataset)

    def __getattr__(self, name):
        dataset = self.__dict__.get("dataset")
        if dataset is None:
            raise AttributeError(name)
        return getattr(dataset, name)

    def __getitem__(self, index):
        epoch = self.epoch.value
        if self.local_epoch != epoch:
            worker = torch.utils.data.get_worker_info()
            seed = self.seed.value + (worker.id if worker is not None else 0)
            random.seed(seed)
            np.random.seed(seed % (2**32))
            torch.manual_seed(seed)
            self.local_epoch = epoch
        return self.dataset[index]


class EpochSeededDataLoader(torch.utils.data.DataLoader):
    def __init__(self, dataset, *args, **kwargs) -> None:
        persistent = bool(kwargs.get("persistent_workers", False))
        workers = int(kwargs.get("num_workers", 0))
        self._epoch_seeded = (persistent and workers > 0
                              and not isinstance(dataset, torch.utils.data.IterableDataset))
        if self._epoch_seeded:
            self._worker_epoch = multiprocessing.RawValue("q", 0)
            self._worker_seed = multiprocessing.RawValue("q", 0)
            dataset = _EpochSeededDataset(dataset, self._worker_epoch, self._worker_seed)
        super().__init__(dataset, *args, **kwargs)

    def __iter__(self):
        if not self._epoch_seeded:
            return super().__iter__()
        self._worker_epoch.value += 1
        self._worker_seed.value = torch.randint(0, 2**63 - 1, ()).item()
        state = torch.get_rng_state()
        iterator = super().__iter__()
        torch.set_rng_state(state)
        return iterator


def install_epoch_seeded_loader() -> None:
    if torch.utils.data.DataLoader is not EpochSeededDataLoader:
        torch.utils.data.DataLoader = EpochSeededDataLoader
