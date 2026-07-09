"""Config tests — engine auto-discovery (frontend users never type an engine path)."""

import os

from chesslab import config


def test_find_stockfish_env_override_file(tmp_path, monkeypatch):
    fake = tmp_path / "engine.exe"
    fake.write_text("")  # just needs to exist as a file
    monkeypatch.setenv(config.ENGINE_ENV_VAR, str(fake))
    assert config.find_stockfish() == os.path.abspath(str(fake))


def test_augment_policy_values_pinned():
    """Protects against accidental revert to old augmentation values."""
    from chesslab.config import AUGMENT
    assert AUGMENT.brightness == 0.35
    assert AUGMENT.contrast == 0.35
    assert AUGMENT.gamma == (0.6, 1.8)
    assert AUGMENT.blur_sigma_max == 1.5
    assert AUGMENT.allow_flip is False
    assert AUGMENT.allow_rotate90 is False


def test_find_stockfish_finds_bundled(monkeypatch):
    """When no override is set, a bundled tools/stockfish/ binary is discovered."""
    monkeypatch.delenv(config.ENGINE_ENV_VAR, raising=False)
    found = config.find_stockfish()
    # The repo ships a Stockfish binary; if present it must be picked up automatically.
    if any(d.is_dir() and any(d.glob("stockfish*")) for d in config._bundled_engine_dirs()):
        assert found is not None
        assert "stockfish" in os.path.basename(found).lower()
