"""The session on disk: one directory, `session.yaml` + `log.jsonl` + frames.

Split out of `collect` on 2026-08-20: the rig loops need a camera and a display, this does
not. `scripts/ingest_video_session.py` and `scripts/capture_empty_session.py` build sessions
from video and from an empty board and never touch a camera.
"""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path

import cv2
import yaml

from .ioutil import append_rows, write_rows


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def redact_source(source) -> str:
    """A camera source as a string that is safe to persist: `user:pass@` stripped out.

    An IP-camera URL routinely carries basic-auth credentials, and a session's metadata is
    long-lived, copied around and read by everyone who looks at the corpus. Only the
    userinfo part goes — host, port and path stay, because THAT is what identifies the
    camera a session came from."""
    s = str(source if source is not None else "").strip()
    if "://" not in s:
        return s
    scheme, rest = s.split("://", 1)
    host, sep, tail = rest.partition("/")
    if "@" in host:
        host = host.rsplit("@", 1)[1]      # drop user:pass@, keep host[:port]
    return f"{scheme}://{host}{sep}{tail}"


class SessionWriter:
    """Manages a session directory: frames, log.jsonl, session.yaml + consistent undo."""

    def __init__(
        self,
        session_dir: Path,
        *,
        session_id: str,
        profile: str,
        mode: str,
        camera_index: int,
        frame_size: tuple[int, int],
        camera_source: int | str | None = None,
        camera_capture_source: str | None = None,
        source_pgn: str | None = None,
        notes: str = "",
        jpeg_quality: int | None = None,
    ) -> None:
        # Frames are PNG by default because live capture is the ground truth every later stage
        # re-slices from, and a lossy re-encode there would be baked into the corpus forever.
        # A VIDEO import is the exception: the source is already H.264, so PNG spends ~5x the disk
        # losslessly preserving someone else's compression artefacts. `ingest_video_session.py`
        # therefore passes a quality and gets .jpg — the path lands in log.jsonl either way, and
        # every consumer reads `entry["frame"]` rather than assuming an extension.
        self.jpeg_quality = jpeg_quality
        self.dir = Path(session_dir)
        self.frames_dir = self.dir / "frames"
        self.log_path = self.dir / "log.jsonl"
        self.frames_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id
        self.profile = profile
        self.mode = mode
        self.camera_index = camera_index
        # What was ACTUALLY captured from — an index or an IP-cam URL. `camera_index` alone
        # cannot tell a USB camera from a phone (an env/UI URL override leaves the index at
        # 0), which makes a corpus impossible to partition by camera after the fact. None =
        # the caller did not state it; then the field is omitted rather than invented.
        self.camera_source = camera_source
        # Set when the SAVED frames come from a separate high-resolution snapshot URL while
        # the preview ran over a smaller stream — then this, not `camera_source`, is where the
        # pixels on disk are from (that is the path behind the 3072x4096 phone sweeps).
        self.camera_capture_source = camera_capture_source
        self.frame_size = (int(frame_size[0]), int(frame_size[1]))
        self.source_pgn = source_pgn
        self.notes = notes
        self.created_at = _now_iso()
        self.entries: list[dict] = []
        self._frame_idx = 0
        # fresh log
        self.log_path.write_text("", encoding="utf-8")
        self._write_session_yaml()

    def _write_session_yaml(self) -> None:

        # The session can disappear underneath an open writer: deleting or discarding it in the
        # UI removes the directory while `COLLECT["writer"]` still points here, and `close()`
        # then died with FileNotFoundError. Recreating the directory would be worse than
        # skipping — it resurrects a session that is nothing but a `session.yaml`, with no
        # frames and no log. There is nothing left to describe, so say so and return.
        if not self.dir.is_dir():
            print(f"[WARN] session {self.session_id}: directory is gone (deleted or discarded) "
                  "— not writing session.yaml.")
            return

        meta = {
            "session_id": self.session_id,
            "profile": self.profile,
            "mode": self.mode,
            "created_at": self.created_at,
            "camera_index": int(self.camera_index),
            "camera_source": (None if self.camera_source is None
                              else redact_source(self.camera_source)),
            "camera_capture_source": (None if not self.camera_capture_source
                                      else redact_source(self.camera_capture_source)),
            # `frame_size` is the DELIVERED size (measured on a frame), not a requested mode.
            "frame_size": [self.frame_size[0], self.frame_size[1]],
            "notes": self.notes,
        }
        for k in ("camera_source", "camera_capture_source"):
            if meta[k] is None:
                del meta[k]                 # unknown is unknown — do not invent a source
        if self.mode == "pgn" and self.source_pgn:
            meta["source_pgn"] = self.source_pgn
        with (self.dir / "session.yaml").open("w", encoding="utf-8") as fh:
            yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)

    def capture(self, frame, ply: int, fen: str, move_san: str | None = None,
                corners: list[list[float]] | None = None,
                labels: dict[str, str] | None = None) -> str:

        # LAUT, nicht uebersprungen: `session.yaml` kann ausfallen, weil es nichts mehr zu
        # beschreiben gibt — ein Frame ist die Aufnahme selbst. Eine Log-Zeile auf eine Datei, die
        # es nie gab, faellt erst Wochen spaeter beim Schneiden auf (`realgames.write_board`).
        if self.jpeg_quality is None:
            rel = f"frames/{self._frame_idx:04d}.png"
            ok = cv2.imwrite(str(self.dir / rel), frame)
        else:
            rel = f"frames/{self._frame_idx:04d}.jpg"
            ok = cv2.imwrite(str(self.dir / rel), frame,
                             [int(cv2.IMWRITE_JPEG_QUALITY), int(self.jpeg_quality)])
        if not ok:
            raise OSError(f"session {self.session_id}: could not write frame {rel}")
        size = (int(frame.shape[1]), int(frame.shape[0]))
        if self._frame_idx == 0 and size != self.frame_size:
            # The FILES decide what `frame_size` means. A high-resolution snapshot source
            # saves bigger pixels than the preview the size was measured on, and a profile's
            # `frame_size` can simply be from another mode — either way the metadata would
            # describe frames that are not on disk.
            print(f"[INFO] session {self.session_id}: frames are {size[0]}x{size[1]}, "
                  f"not {self.frame_size[0]}x{self.frame_size[1]} — recording the real size.")
            self.frame_size = size
            self._write_session_yaml()
        entry = {"frame": rel, "ply": ply, "fen": fen, "ts": _now_iso(), "move_san": move_san}
        if corners is not None:
            # Board corners (a8,h8,h1,a1) in frame pixels, verified live at capture time.
            # `slice` warps the exact same geometry from these (instead of re-detecting).
            entry["corners"] = [[float(x), float(y)] for x, y in corners]
        if labels is not None:
            # Explicit per-square labels (Inference/Active-Learning): `slice` uses these instead
            # of FEN derivation. Allows classes like `occluded` that don't exist in FEN.
            entry["labels"] = {str(k): str(v) for k, v in labels.items()}
        self.entries.append(entry)
        append_rows(self.log_path, [entry])
        self._frame_idx += 1
        return rel

    def undo(self) -> dict | None:
        """Undo last capture: consistently remove frame file + log line."""
        if not self.entries:
            return None
        last = self.entries.pop()
        fp = self.dir / last["frame"]
        if fp.exists():
            fp.unlink()
        write_rows(self.log_path, self.entries)
        self._frame_idx = max(0, self._frame_idx - 1)
        return last

    @property
    def count(self) -> int:
        return len(self.entries)

    def close(self, notes: str | None = None) -> bool:
        """Finish the session. Returns True when it was DISCARDED for being empty.

        `__init__` creates the directory and writes `session.yaml` before anything is captured,
        so merely opening the collect page used to leave a session behind. One that captured
        nothing has nothing to park: no frames, no log rows, no pixels. It is removed.
        """
        if notes is not None:
            self.notes = notes
        if self._discard_if_empty():
            return True
        self._write_session_yaml()
        return False

    def _discard_if_empty(self) -> bool:
        """Remove the session directory iff it holds nothing we would ever want back.

        Deliberately paranoid: this is the one place that deletes under `data/`, where the rule
        is park-never-delete. It refuses unless the entry list, the log file AND the frames
        directory are all empty, and it removes the known files by name instead of a blind
        recursive delete — an unexpected file means something is there, so keep everything.
        """

        if self.entries or not self.dir.is_dir():
            return False
        if self.log_path.exists() and self.log_path.read_text(encoding="utf-8").strip():
            return False
        if self.frames_dir.is_dir() and any(self.frames_dir.iterdir()):
            return False
        known = {"session.yaml", "log.jsonl", "frames"}
        if {p.name for p in self.dir.iterdir()} - known:
            return False
        shutil.rmtree(self.dir, ignore_errors=True)
        print(f"[OK] session {self.session_id}: nothing captured — discarded.")
        return True
