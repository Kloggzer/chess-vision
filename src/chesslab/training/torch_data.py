"""Stage 5 — torch-bound data: datasets and transforms. Augmentation only on train, no board
flips/rotations; val/test only resize + normalize.
"""

from __future__ import annotations

import random

import numpy as np
import torch
from PIL import Image, ImageOps
from torch.utils.data import Dataset

from .. import config
from ..cell_rule import brightness_of, coverage_of
from .data import class_to_idx
from .packs import PackedArg, _pack_index


class _Clahe:
    """Lokaler Kontrast auf dem L-Kanal, wie `Imgproc.createCLAHE` auf dem Geraet; der Handle wird
    EINMAL angelegt. NACH dem Resize, damit Training und Serving denselben Operator sehen.
    """

    def __init__(self, clip: float, tile: int, min_mean: float = 0.0,
                 max_mean: float = 255.0, denoise: str = "off") -> None:
        if denoise not in ("off", "pre", "post"):
            raise ValueError(f"unbekanntes denoise {denoise!r} (off|pre|post)")
        self.clip = clip
        self.tile = tile
        self.min_mean = min_mean
        self.max_mean = max_mean
        self.denoise = denoise
        self._handle = None

    def __getstate__(self):
        # Weder cv2 noch der CLAHE-Handle sind picklebar, Spawn-Worker bauen ihn beim ersten Bild
        # selbst.
        return {"clip": self.clip, "tile": self.tile, "min_mean": self.min_mean,
                "max_mean": self.max_mean, "denoise": self.denoise, "_handle": None}

    def _inside(self, cv2, arr) -> bool:
        """Das Fenster ist ein BAND: CLAHE hebt 25-40 um 5,9 Punkte und DRUECKT alles unter 25 um
        2,6 — dort verstaerkt es Sensorrauschen statt Struktur.
        """
        if self.min_mean <= 0.0 and self.max_mean >= 255.0:
            return True
        edge = max(1, arr.shape[0] // 10)
        mean = float(cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)[edge:-edge, edge:-edge].mean())
        return self.min_mean <= mean < self.max_mean

    def __call__(self, img):
        import cv2

        arr = np.asarray(img.convert("RGB"))
        if not self._inside(cv2, arr):
            return img
        if self.denoise == "pre":
            arr = cv2.medianBlur(arr, 3)
        if self._handle is None:
            self._handle = cv2.createCLAHE(clipLimit=self.clip, tileGridSize=(self.tile, self.tile))
        lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
        lab[:, :, 0] = self._handle.apply(lab[:, :, 0])
        out = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        if self.denoise == "post":
            out = cv2.medianBlur(out, 3)
        return Image.fromarray(out)


_GAMMA_INPUTS = tuple(value / 255.0 for value in range(256))


class _RandomGamma:
    def __init__(self, lo: float, hi: float) -> None:
        self.lo, self.hi = lo, hi

    def __call__(self, img):
        import torchvision.transforms.functional as TF

        gamma = random.uniform(self.lo, self.hi)
        if img.mode != "RGB":
            return TF.adjust_gamma(img, gamma)
        # Same Python pow/int LUT as torchvision.
        table = [int((255 + 1 - 1e-3) * pow(value, gamma)) for value in _GAMMA_INPUTS] * 3
        return img.point(table)


class _GaussianNoise:
    """Additive Gaussian noise on the [0,1] tensor (after ToTensor, before Normalize)."""

    def __init__(self, std: float) -> None:
        self.std = std

    def __call__(self, t):
        return (t + torch.randn_like(t) * self.std).clamp_(0.0, 1.0)


class _EvalRgbTransform:
    """Regular PIL eval transform plus a zero-PIL path for exact-size packed uint8 crops."""

    def __init__(self, transform, out_size, mean, std) -> None:
        self.transform = transform
        self.out_size = tuple(out_size)
        self.mean = torch.tensor(mean, dtype=torch.float32).view(3, 1, 1)
        self.std = torch.tensor(std, dtype=torch.float32).view(3, 1, 1)

    def __call__(self, img):
        return self.transform(img)

    def from_uint8_hwc(self, arr: np.ndarray) -> torch.Tensor:
        h, w = arr.shape[:2]
        if (w, h) != self.out_size:
            return self.transform(Image.fromarray(arr))
        # Same sequence as ToTensor + Normalize, without the PIL round trip; `to(float32)` owns the
        # storage.
        x = torch.from_numpy(arr).permute(2, 0, 1).to(dtype=torch.float32).div_(255)
        return x.sub_(self.mean).div_(self.std)


class _RandomInvert:
    """Mit Wahrscheinlichkeit p die Helligkeit umkehren, LABEL unveraendert: Polaritaet
    unzuverlaessig, nicht unbrauchbar. Voll erzwungen (`|Gx|+|Gy|`) war Weiss von Schwarz nicht
    mehr zu trennen.
    """

    def __init__(self, p: float) -> None:
        self.p = p

    def __call__(self, img):
        return ImageOps.invert(img) if random.random() < self.p else img


class _RandomFlipXor:
    """Mit Wahrscheinlichkeit p GENAU EINE Achse spiegeln: zwei unabhaengige Muenzen erzeugen auch
    "beide", also die 180-Grad-Drehung.
    """

    def __init__(self, p: float) -> None:
        self.p = p

    def __call__(self, img):
        if random.random() >= self.p:
            return img
        return img.transpose(Image.FLIP_LEFT_RIGHT if random.random() < 0.5
                             else Image.FLIP_TOP_BOTTOM)


class _RandomRot180:
    """Halbe Drehung mit Wahrscheinlichkeit p, allein: `hflip` und `vflip` unabhaengig ergeben die
    ganze Vierergruppe. Die physikalisch echte (andere Tischseite).
    """

    def __init__(self, p: float) -> None:
        self.p = p

    def __call__(self, img):
        return img.transpose(Image.ROTATE_180) if random.random() < self.p else img


class _RandomRot90:
    """Random k*90° rotation, fresh k per epoch, instead of materialising four rotated copies on
    disk.
    """

    _TRANSPOSES = (None, Image.ROTATE_90, Image.ROTATE_180, Image.ROTATE_270)

    def __call__(self, img):
        t = self._TRANSPOSES[random.randrange(4)]
        return img if t is None else img.transpose(t)


class _ToUint8:
    """CHW-uint8 statt normalisiertem float: `batch_aug` rechnet den Rest auf dem Geraet (ein
    Viertel der Bytes ueber PCIe).
    """

    def __call__(self, img):
        # `np.array`, nicht `asarray`: PIL gibt einen schreibgeschuetzten Puffer, und `from_numpy`
        # darauf ist laut Torch undefiniertes Verhalten.
        return torch.from_numpy(np.array(img.convert("RGB"))).permute(2, 0, 1).contiguous()


def build_transform(out_size, train: bool, policy=config.AUGMENT,
                    mean=config.NORMALIZE_MEAN, std=config.NORMALIZE_STD,
                    rot90: bool = False, per_crop: bool = False,
                    input_repr: str = "rgb",
                    clahe_clip: float = 0.0, clahe_tile: int = 8,
                    clahe_min_mean: float = 0.0, clahe_max_mean: float = 255.0,
                    clahe_denoise: str = "off", to_uint8: bool = False):
    from torchvision import transforms as T

    from .cpu_aug import ColorJitter, Normalize, ToTensor

    out_w, out_h = out_size
    ops = [T.Resize((out_h, out_w))]
    if clahe_clip > 0:
        ops += [_Clahe(clahe_clip, clahe_tile, clahe_min_mean, clahe_max_mean, clahe_denoise)]
    if train and rot90:
        ops += [_RandomRot90()]
    # Staerke 0 ist NICHT weg: `T.ColorJitter(0,0,0)` zieht weiter Zufallszahlen und wendet die
    # Identitaet an — 470 us je Crop Leerlauf.
    if train:
        if policy.brightness or policy.contrast or policy.color_jitter:
            ops += [ColorJitter(brightness=policy.brightness, contrast=policy.contrast,
                                  saturation=policy.color_jitter)]
        if policy.gamma != (1.0, 1.0):
            ops += [_RandomGamma(*policy.gamma)]
        if policy.blur_sigma_max > 0.1:
            ops += [T.RandomApply([T.GaussianBlur(3, sigma=(0.1, policy.blur_sigma_max))], p=0.3)]
        if policy.jitter_translate or policy.jitter_scale:
            # degrees=0: KEINE Drehung. Waagerecht spiegeln ist auf einem Zellcrop zulaessig
            # (`hflip_p`).
            ops += [T.RandomAffine(degrees=0,
                                   translate=(policy.jitter_translate, policy.jitter_translate),
                                   scale=(1.0 - policy.jitter_scale, 1.0 + policy.jitter_scale))]
    if train and getattr(policy, "hflip_p", 0.0) > 0:
        ops += [T.RandomHorizontalFlip(p=policy.hflip_p)]
    if train and getattr(policy, "vflip_p", 0.0) > 0:
        ops += [T.RandomVerticalFlip(p=policy.vflip_p)]
    if train and getattr(policy, "rot180_p", 0.0) > 0:
        ops += [_RandomRot180(policy.rot180_p)]
    if train and getattr(policy, "flip_xor_p", 0.0) > 0:
        ops += [_RandomFlipXor(policy.flip_xor_p)]
    if train and getattr(policy, "invert_p", 0.0) > 0:
        ops += [_RandomInvert(policy.invert_p)]
    if train and getattr(policy, "grayscale_p", 0.0) > 0:
        # ZUFAELLIG entfaerben: "Farbe darf nicht allein tragen", nicht "Farbe gibt es nicht"; drei
        # Kanaele bleiben, Architektur und Pretrain auch.
        ops += [T.RandomGrayscale(p=policy.grayscale_p)]
    # Der uint8-Ausgang endet HIER; der Rest lebt in `batch_aug.BatchPhotometric`, gleiche
    # Reihenfolge.
    if to_uint8:
        return T.Compose([*ops, _ToUint8()])
    ops += [ToTensor()]
    if train and getattr(policy, "noise_std", 0.0) > 0:
        ops += [T.RandomApply([_GaussianNoise(policy.noise_std)], p=0.5)]
    if train and getattr(policy, "erase_p", 0.0) > 0:
        # Cutout on the [0,1] tensor before Normalize, so erased pixels are a neutral 0.
        ops += [T.RandomErasing(p=policy.erase_p, scale=policy.erase_scale, value=0, inplace=True)]
    # Per-crop standardisation: a black piece on a DARK square stands 6.0 grey levels off its
    # background against 40.2 on a light one (6.6x less signal); standardised the gap is 1.5x.
    if input_repr != "rgb":
        ops += [InputRepresentation(input_repr)]
    else:
        # ToTensor just created a private tensor, so in-place normalisation saves a clone per
        # sample.
        ops += [_PerCropStandardize()] if per_crop else [Normalize(mean, std, inplace=True)]
    transform = T.Compose(ops)
    # Der Schnellpfad ueberspringt die PIL-Kette ganz — mit CLAHE waere der Schritt still weg.
    if not train and not per_crop and input_repr == "rgb" and clahe_clip <= 0:
        return _EvalRgbTransform(transform, (out_w, out_h), mean, std)
    return transform


# Channels each representation feeds the first convolution; the NAME rides in the run's config.json.
INPUT_REPRS: dict[str, int] = {"rgb": 3, "gray+sobel": 2, "rgb+sobel": 4, "sobel": 1,
                               # Luminanz auf DREI Kanaele: gleiche Architektur und Pretrain, nur
                               # ohne Farbe — die Achse, auf der zwei ISPs am staerksten
                               # auseinanderlaufen (Drehteller +39 % Saettigung).
                               "gray3": 3}

def eval_transform_for(cfg: dict, out_size=None):
    """The val/test/serving transform a run's `config.json` describes — the one place to get it
    from; rebuilt by hand, eval, calibration and serving drift.
    """
    norm = cfg.get("normalize", {})
    return build_transform(tuple(out_size or cfg["out_size"]), train=False,
                           mean=tuple(norm.get("mean", config.NORMALIZE_MEAN)),
                           std=tuple(norm.get("std", config.NORMALIZE_STD)),
                           per_crop=norm.get("mode") == "per_crop",
                           input_repr=input_repr_of(cfg)[0],
                           clahe_clip=float(cfg.get("clahe_clip", 0.0)),
                           clahe_tile=int(cfg.get("clahe_tile", 8)),
                           clahe_min_mean=float(cfg.get("clahe_min_mean", 0.0)),
                           clahe_max_mean=float(cfg.get("clahe_max_mean", 255.0)),
                           clahe_denoise=str(cfg.get("clahe_denoise", "off")))


def normalize_batch(cfg: dict, batch: torch.Tensor) -> torch.Tensor:
    """A run's normalisation for an already-resized `[N,3,H,W]` RGB batch in `[0,1]`, without
    `torchvision`, for the live serving path. Returns `[N,C,H,W]`.
    """
    norm = cfg.get("normalize", {})
    kind = input_repr_of(cfg)[0]
    if kind != "rgb":
        return InputRepresentation(kind)(batch)
    if norm.get("mode") == "per_crop":
        # Per CROP, not per batch: `_PerCropStandardize` sees one image at a time.
        flat = batch.flatten(1)
        mean = flat.mean(dim=1).view(-1, 1, 1, 1)
        std = flat.std(dim=1).view(-1, 1, 1, 1)
        return (batch - mean) / (std + 1e-5)
    kw = {"dtype": batch.dtype, "device": batch.device}
    mean = torch.tensor(tuple(norm.get("mean", config.NORMALIZE_MEAN)), **kw).view(1, 3, 1, 1)
    std = torch.tensor(tuple(norm.get("std", config.NORMALIZE_STD)), **kw).view(1, 3, 1, 1)
    return (batch - mean) / std


def input_repr_of(cfg: dict) -> tuple[str, int]:
    """`(name, channels)` a run was trained with; runs predating the flag were RGB."""
    kind = cfg.get("input_repr", "rgb")
    if kind not in INPUT_REPRS:
        raise ValueError(f"run was trained with unknown input_repr {kind!r}")
    return kind, INPUT_REPRS[kind]


def infer_size_of(cfg: dict) -> tuple[int, int]:
    """`(W, H)` the network is FED — a model property from its own `config.json` (specs/22).

    Not `out_size` (the crops' build size): one model read 43 occupied squares as empty at 128 px
    and 19 at 96. Older runs carry no key and fall back to `out_size`; `run_export` validates on
    write."""
    raw = cfg.get("infer_size") or cfg["out_size"]
    return int(raw[0]), int(raw[1])


# ITU-R BT.601 luma, exactly `cv2.COLOR_BGR2GRAY`'s coefficients.
_LUMA = (0.299, 0.587, 0.114)

# ImageNet's mean/std projected through _LUMA — the usual single-channel ImageNet constants.
_GRAY_MEAN, _GRAY_STD = 0.449, 0.226

# |Gx|+|Gy| statistics of the [0,1] luminance, measured over 4000 real crops at 128 px; only a
# scale.
_SOBEL_MEAN, _SOBEL_STD = 0.3704, 0.5259


class InputRepresentation(torch.nn.Module):
    """Turn the [0,1] RGB crop into the channel stack the run was trained on.

    A linear probe favoured `|Gx|+|Gy|` (0.994 against rgb 0.872), but trained networks LOST with
    it: whole-board 0.03 against rgb's 0.998, although `rgb+sobel` is a strict superset.
    """

    def __init__(self, kind: str) -> None:
        super().__init__()
        if kind not in INPUT_REPRS:
            raise ValueError(f"unknown input representation {kind!r} (one of {sorted(INPUT_REPRS)})")
        self.kind = kind

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        parts = []
        if self.kind.startswith("rgb"):
            kw = {"dtype": x.dtype, "device": x.device}
            parts.append((x - torch.tensor(config.NORMALIZE_MEAN, **kw).view(3, 1, 1))
                         / torch.tensor(config.NORMALIZE_STD, **kw).view(3, 1, 1))
        gray = luminance(x)
        if self.kind == "gray3":
            # Auf die RGB-Statistik normiert, damit die Vortrainings-Gewichte dieselbe Skala sehen.
            kw = {"dtype": x.dtype, "device": x.device}
            g3 = gray.expand(*gray.shape[:-3], 3, *gray.shape[-2:])
            return ((g3 - torch.tensor(config.NORMALIZE_MEAN, **kw).view(3, 1, 1))
                    / torch.tensor(config.NORMALIZE_STD, **kw).view(3, 1, 1))
        if self.kind.startswith("gray"):
            parts.append((gray - _GRAY_MEAN) / _GRAY_STD)
        if self.kind.endswith("sobel"):
            parts.append((sobel_magnitude(gray) - _SOBEL_MEAN) / _SOBEL_STD)
        return torch.cat(parts, dim=-3)


def luminance(x: torch.Tensor) -> torch.Tensor:
    """BT.601 luma of a `[..., 3, H, W]` RGB tensor -> `[..., 1, H, W]`, same dtype."""
    w = torch.tensor(_LUMA, dtype=x.dtype, device=x.device).view(3, 1, 1)
    return (x * w).sum(dim=-3, keepdim=True)


def sobel_magnitude(gray: torch.Tensor) -> torch.Tensor:
    """`|Gx| + |Gy|` of a `[..., 1, H, W]` luminance image, pinned by `tests/test_input_repr.py` to:

        cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3, borderType=cv2.BORDER_REFLECT_101)
    REFLECT_101 is cv2's default AND torch's `"reflect"` pad; float32, since cv2's uint8 rounding
    could not be reproduced bit for bit in Kotlin."""
    k = torch.tensor([[[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]],
                      [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]],
                     dtype=gray.dtype, device=gray.device).unsqueeze(1)
    flat = gray.reshape(-1, 1, *gray.shape[-2:])
    padded = torch.nn.functional.pad(flat, (1, 1, 1, 1), mode="reflect")
    g = torch.nn.functional.conv2d(padded, k)  # conv2d correlates, exactly as cv2 filters
    return g.abs().sum(dim=1, keepdim=True).reshape(gray.shape)


class _PerCropStandardize(torch.nn.Module):
    """`(x - x.mean()) / x.std()` over the WHOLE crop, channels together: per channel would flatten
    the colour relations that separate a black piece from a white one.
    """

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return (x - x.mean()) / (x.std() + 1e-5)


# Mostly board/hand, no piece — background randomisation would corrupt them.
_NOT_A_PIECE = {"empty", "occluded"}

# Top-heavy: the dominant real intrusion is the neighbour one rank away leaning across the upper
# edge.
_NEIGHBOUR_EDGES = ("top", "left", "right", "bottom")
_NEIGHBOUR_EDGE_W = (0.5, 0.2, 0.2, 0.1)


def paste_neighbour_strip(img: Image.Image, donor: Image.Image,
                          frac_range: tuple[float, float]) -> Image.Image:
    """Composite an OCCUPIED donor's central band into one edge of an EMPTY `img`, feathered: a tall
    neighbour bleeding into the crop, which `empty` must survive. Rolled at random, no hard seam.
    """
    from PIL import ImageFilter

    w, h = img.size
    if donor.size != img.size:
        donor = donor.resize((w, h))
    arr = np.asarray(img).astype(np.float32)
    dar = np.asarray(donor).astype(np.float32)
    edge = random.choices(_NEIGHBOUR_EDGES, weights=_NEIGHBOUR_EDGE_W, k=1)[0]
    frac = random.uniform(*frac_range)

    comp = arr.copy()
    m = np.zeros((h, w), np.float32)
    if edge in ("top", "bottom"):
        d = max(2, int(frac * h))
        band = np.roll(dar, random.randint(-w // 4, w // 4), axis=1)
        band = band[(h - d) // 2 : (h - d) // 2 + d, :]
        sl = slice(0, d) if edge == "top" else slice(h - d, h)
        comp[sl, :] = band
        m[sl, :] = 1.0
    else:
        d = max(2, int(frac * w))
        band = np.roll(dar, random.randint(-h // 4, h // 4), axis=0)
        band = band[:, (w - d) // 2 : (w - d) // 2 + d]
        sl = slice(0, d) if edge == "left" else slice(w - d, w)
        comp[:, sl] = band
        m[:, sl] = 1.0

    feather = max(2, min(w, h) // 16)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(radius=feather))).astype(np.float32) / 255.0
    out = arr * (1.0 - m[..., None]) + comp * m[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def _target(y: int, row: dict) -> torch.Tensor:
    """Klasse, Coverage und Helligkeit in EINEM Tensor, damit der Loader-Vertrag `(x, y)` bleibt.
    Ohne `brightness` gilt die Zelle als hell (255).
    """
    return torch.tensor([float(y), coverage_of(row), brightness_of(row)])


class SquareDataset(Dataset):
    def __init__(self, rows, classes, transform, augment: bool = False,
                 policy=config.AUGMENT, with_coverage: bool = False) -> None:
        self.rows = rows
        self.with_coverage = with_coverage
        self.transform = transform
        self.c2i = class_to_idx(classes)
        self.policy = policy
        # Train only. Donors must be OCCUPIED: their centred piece is what bleeds in.
        self.neighbour_paste = augment and getattr(policy, "neighbour_p", 0.0) > 0
        self.piece_pool: list[str] = []
        if self.neighbour_paste and rows:
            pieces = [r["path"] for r in rows if r["label"] not in _NOT_A_PIECE]
            n = min(getattr(policy, "neighbour_pool_size", 512), len(pieces))
            if n > 0:
                self.piece_pool = random.sample(pieces, n)
            else:
                self.neighbour_paste = False

    def __len__(self) -> int:
        return len(self.rows)

    def _open_donor(self) -> Image.Image | None:
        """A random occupied crop for the neighbour paste (a few retries on unreadable files)."""
        for _ in range(3):
            try:
                return Image.open(random.choice(self.piece_pool)).convert("RGB")
            except (OSError, ValueError):
                continue
        return None

    def __getitem__(self, i):
        r = self.rows[i]
        img = Image.open(r["path"]).convert("RGB")
        if (self.neighbour_paste and r["label"] == "empty"
              and random.random() < self.policy.neighbour_p):
            donor = self._open_donor()
            if donor is not None:
                img = paste_neighbour_strip(img, donor, self.policy.neighbour_frac)
        x = self.transform(img)
        y = self.c2i[r["label"]]
        return (x, _target(y, r)) if self.with_coverage else (x, y)


class _PackedMemmaps:
    def _memmap(self, pack_no: int):
        if self._mm is None:
            self._mm = [None] * len(self._files)
        if self._mm[pack_no] is None:
            from .packs import open_packed_memmap
            self._mm[pack_no] = open_packed_memmap(
                *self._files[pack_no], low_memory=getattr(self, "low_memory", False))
        return self._mm[pack_no]


class PackedSquareDataset(_PackedMemmaps, Dataset):
    """Same contract as SquareDataset, but crops come from packed memmaps instead of one
    `Image.open` per item.
    """

    def __init__(self, rows, classes, transform, packed: PackedArg, with_coverage: bool = False,
                 neighbour_p: float = 0.0, policy=config.AUGMENT) -> None:
        self.with_coverage = with_coverage
        # Default 0,0: die Paste feuerte gepackt nie, und Altlaeufe bleiben gleich.
        self.neighbour_p = neighbour_p
        self.policy = policy
        c2i = class_to_idx(classes)
        self.rows = rows            # kept for board-accuracy grouping in evaluate (picklable)
        self.transform = transform
        # Only small, picklable state goes to spawn workers; memmaps are mapped lazily inside the
        # worker.
        self._files, self.idx = _pack_index(rows, packed)
        self.labels = np.array([c2i[r["label"]] for r in rows], dtype=np.int64)
        self.cover = np.array([coverage_of(r) for r in rows], dtype=np.float32)
        self.bright = np.array([brightness_of(r) for r in rows], dtype=np.float32)
        self._empty = c2i.get("empty", -1)
        self._mm: list | None = None
        # Spender sind BESETZTE Zellen.
        pool = [tuple(a) for a, r in zip(self.idx, rows, strict=True)
                if r["label"] not in _NOT_A_PIECE]
        # TODO: ungeschuetzt durch `neighbour_p > 0` — jeder Val-Datensatz baut den Spender-Pool und
        # liest ihn nie. `SquareDataset` guardet.
        n = min(getattr(policy, "neighbour_pool_size", 512), len(pool))
        self.donors = np.array(random.sample(pool, n) if n else [],
                               dtype=np.int64).reshape(n, 2)
        if not len(self.donors):
            self.neighbour_p = 0.0

    def __getstate__(self):
        # Without this, the row dicts (potentially millions) are pickled into EVERY spawn worker.
        state = dict(self.__dict__)
        state["rows"] = None
        state["_mm"] = None
        return state

    def __len__(self) -> int:
        return len(self.idx)

    def __getitem__(self, i):
        p, j = self.idx[i]
        arr = np.array(self._memmap(p)[j])                     # copy out of the read-only memmap
        paste = (self.neighbour_p > 0 and self.labels[i] == self._empty
                 and random.random() < self.neighbour_p)
        if paste:
            dp, dj = random.choice(self.donors)
            donor = Image.fromarray(np.array(self._memmap(dp)[dj]))
            x = self.transform(paste_neighbour_strip(Image.fromarray(arr), donor,
                                                     self.policy.neighbour_frac))
        elif isinstance(self.transform, _EvalRgbTransform):
            x = self.transform.from_uint8_hwc(arr)
        else:
            x = self.transform(Image.fromarray(arr))
        if not self.with_coverage:
            return x, int(self.labels[i])
        return x, torch.tensor([float(self.labels[i]), float(self.cover[i]),
                                float(self.bright[i])])


def board_collate(batch):
    """`(B, 64, C, H, W)` fuer das Modell, `(B*64, 2)` fuer den Verlust: Engine, Verlust und
    Metriken sehen die Form des Per-Zell-Laufs.
    """
    xs, ys = zip(*batch, strict=True)
    return torch.stack(xs), torch.cat(ys)


class PackedBoardDataset(_PackedMemmaps, Dataset):
    """Ganze Bretter statt Zellen, 64 Crops eines Frames in `a1..h8`-Reihenfolge, nur VOLLSTAENDIGE
    (95,8 %). `empty` wird hier ueber die Verlustgewichte ausgeglichen, nicht `max_empty_ratio`.
    """

    #: Von `evaluate_dataset` und dem Trainings-Loader gelesen, damit beide gleich zusammenlegen.
    collate_fn = staticmethod(board_collate)

    def __init__(self, rows, classes, transform, packed: PackedArg,
                 ) -> None:
        from .boardnet import CELLS, square_index

        c2i = class_to_idx(classes)
        boards: dict[tuple[str, str], list] = {}
        for r in rows:
            boards.setdefault((r["session_id"], r["frame"]), []).append(r)
        keep = [v for v in boards.values() if len(v) == CELLS]
        self.n_dropped = len(boards) - len(keep)
        if not keep:
            raise ValueError(f"kein vollstaendiges Brett unter {len(boards)} — "
                             "wurde der Split mit --max-empty-ratio ausgeduennt?")
        for board in keep:
            # 64 Zeilen sind noch kein Brett: ein doppeltes Feld verdeckt ein fehlendes.
            if len({r["square"] for r in board}) != CELLS:
                raise ValueError(
                    f"Brett {board[0]['session_id']}/{board[0]['frame']}: {CELLS} Zeilen, aber "
                    f"nur {len({r['square'] for r in board})} verschiedene Felder — "
                    "doppelte Felder im Manifest, der Pool muss neu geschnitten werden")
        self.transform = transform
        self.rows = [r for board in keep for r in sorted(board, key=lambda r: square_index(r["square"]))]
        self._files, idx = _pack_index(self.rows, packed)
        self.idx = idx.reshape(-1, CELLS, 2)
        # Ein Brett liegt im Pack am Stueck: EIN Schnitt ist 2,8x schneller als 64 Griffe, kalt ein
        # Seek statt 64.
        same = (self.idx[:, :, 0] == self.idx[:, :1, 0]).all(axis=1)
        step = self.idx[:, :, 1] - self.idx[:, :1, 1]
        self._run = same & (step == np.arange(CELLS)).all(axis=1)
        self.labels = np.array([c2i[r["label"]] for r in self.rows], dtype=np.int64).reshape(-1, CELLS)
        self.bright = np.array([brightness_of(r) for r in self.rows],
                               dtype=np.float32).reshape(-1, CELLS)
        self.cover = np.array([coverage_of(r) for r in self.rows],
                              dtype=np.float32).reshape(-1, CELLS)
        self._mm: list | None = None

    def __getstate__(self):
        state = dict(self.__dict__)
        state["rows"] = None
        state["_mm"] = None
        return state

    def __len__(self) -> int:
        return len(self.idx)

    def _board(self, b) -> np.ndarray:
        """Die 64 Crops als `(64, H, W, 3)` — als Schnitt, wo der Pack sie am Stueck hat."""
        if self._run[b]:
            p, j = self.idx[b][0]
            return np.array(self._memmap(p)[j:j + self.idx.shape[1]])
        return np.stack([np.array(self._memmap(p)[i]) for p, i in self.idx[b]])

    def __getitem__(self, b):
        crops = []
        for arr in self._board(b):
            if isinstance(self.transform, _EvalRgbTransform):
                crops.append(self.transform.from_uint8_hwc(arr))
            else:
                crops.append(self.transform(Image.fromarray(arr)))
        x = torch.stack(crops)
        y = torch.stack([torch.tensor(self.labels[b], dtype=torch.float32),
                         torch.tensor(self.cover[b], dtype=torch.float32),
                         torch.tensor(self.bright[b], dtype=torch.float32)], dim=1)
        return x, y


def class_weights_tensor(split: dict, classes: list[str]) -> torch.Tensor:
    cw = split.get("class_weights", {})
    # NOT `or 1.0`: that silently turns an explicit weight of 0.0 into 1.0.
    return torch.tensor([float(cw.get(c, 1.0)) for c in classes], dtype=torch.float32)
