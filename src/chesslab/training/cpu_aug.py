"""CPU fast paths preserving torchvision/PIL operations and random-number consumption."""
from __future__ import annotations

import numpy as np
import torch
from torchvision import transforms as T
from torchvision.transforms import functional as F


class ColorJitter(T.ColorJitter):
    """Use Python integers for dispatch instead of repeated scalar tensor comparisons."""

    def forward(self, img):
        order, brightness, contrast, saturation, hue = self.get_params(
            self.brightness, self.contrast, self.saturation, self.hue)
        factors = (brightness, contrast, saturation, hue)
        functions = (F.adjust_brightness, F.adjust_contrast, F.adjust_saturation, F.adjust_hue)
        for index in order.tolist():
            if factors[index] is not None:
                img = functions[index](img, factors[index])
        return img


class ToTensor(T.ToTensor):
    """RGB PIL path: copy into CHW once, then keep torchvision's conversion/division."""

    def __call__(self, img):
        if getattr(img, 'mode', None) != 'RGB':
            return super().__call__(img)
        array = np.array(img, dtype=np.uint8, copy=True).transpose(2, 0, 1).copy()
        return torch.from_numpy(array).to(dtype=torch.get_default_dtype()).div_(255)


class Normalize(T.Normalize):
    """Cache CPU float32 constants; use the same subtraction and division as torchvision."""

    def __init__(self, mean, std, inplace=False):
        super().__init__(mean, std, inplace=inplace)
        self._mean = torch.tensor(mean, dtype=torch.float32).view(-1, 1, 1)
        self._std = torch.tensor(std, dtype=torch.float32).view(-1, 1, 1)
        if (self._std == 0).any():
            raise ValueError('normalization standard deviation must be nonzero')

    def forward(self, tensor):
        if tensor.device.type != 'cpu' or tensor.dtype != torch.float32 or tensor.ndim != 3:
            return super().forward(tensor)
        if not self.inplace:
            tensor = tensor.clone()
        return tensor.sub_(self._mean).div_(self._std)
