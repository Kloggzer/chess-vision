"""The session on disk: one directory, `session.yaml` + `log.jsonl` + frames, no camera needed."""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path

import cv2
import yaml

from .ioutil import append_rows, write_rows
from .session_store.names import LOG_FILE, META_FILE, log_path, meta_path


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def redact_source(source) -> str:
    """A camera source safe to persist: `user:pass@` stripped, host/port/path kept (they identify
    the camera).
    """
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
        # PNG by default: live capture is the ground truth every stage re-slices from. A VIDEO
        # import passes a JPEG quality, since the source is H.264 already; consumers read
        # `entry["frame"]`, not the suffix.
        self.jpeg_quality = jpeg_quality
        self.dir = Path(session_dir)
        self.frames_dir = self.dir / "frames"
        self.log_path = log_path(self.dir)
        self.frames_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id
        self.profile = profile
        self.mode = mode
        self.camera_index = camera_index
        # What was ACTUALLY captured from: `camera_index` alone cannot tell USB from phone. None =
        # unstated, and the field is omitted rather than invented.
        self.camera_source = camera_source
        # Set when the SAVED frames come from a separate high-resolution snapshot URL: then the
        # pixels on disk come from here, not `camera_source`.
        self.camera_capture_source = camera_capture_source
        self.frame_size = (int(frame_size[0]), int(frame_size[1]))
        self.source_pgn = source_pgn
        self.notes = notes
        self.created_at = _now_iso()
        self.entries: list[dict] = []
        self._frame_idx = 0
        self.log_path.write_text("", encoding="utf-8")
        self._write_session_yaml()

    def _write_session_yaml(self) -> None:

        # The directory can vanish under an open writer (deleted in the UI). Recreating it would
        # resurrect a session of nothing but `session.yaml`, so say so and return.
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
            "frame_size": [self.frame_size[0], self.frame_size[1]],
            "notes": self.notes,
        }
        for k in ("camera_source", "camera_capture_source"):
            if meta[k] is None:
                del meta[k]
        if self.mode == "pgn" and self.source_pgn:
            meta["source_pgn"] = self.source_pgn
        with meta_path(self.dir).open("w", encoding="utf-8") as fh:
            yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)

    def capture(self, frame, ply: int, fen: str, move_san: str | None = None,
                corners: list[list[float]] | None = None,
                labels: dict[str, str] | None = None) -> str:

        # LAUT, nicht uebersprungen: ein Frame ist die Aufnahme selbst, und eine Log-Zeile auf eine
        # nie geschriebene Datei faellt erst Wochen spaeter beim Schneiden auf.
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
            # The FILES decide `frame_size`: a snapshot source or a profile from another mode would
            # otherwise describe frames that are not on disk.
            print(f"[INFO] session {self.session_id}: frames are {size[0]}x{size[1]}, "
                  f"not {self.frame_size[0]}x{self.frame_size[1]} — recording the real size.")
            self.frame_size = size
            self._write_session_yaml()
        entry = {"frame": rel, "ply": ply, "fen": fen, "ts": _now_iso(), "move_san": move_san}
        if corners is not None:
            # Board corners (a8,h8,h1,a1) in frame pixels, verified live: `slice` warps exactly
            # these.
            entry["corners"] = [[float(x), float(y)] for x, y in corners]
        if labels is not None:
            # Explicit per-square labels override FEN derivation, including classes the FEN lacks
            # (`occluded`).
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
        """Finish the session. Returns True when it was DISCARDED for being empty (the directory and
        `session.yaml` exist from `__init__` on).
        """
        if notes is not None:
            self.notes = notes
        if self._discard_if_empty():
            return True
        self._write_session_yaml()
        return False

    def _discard_if_empty(self) -> bool:
        """Remove the session directory iff it holds nothing we would ever want back.

        Paranoid: the one place that deletes under `data/`. Entries, log and frames must all be
        empty, and known files go by name — an unexpected file keeps everything.
        """

        if self.entries or not self.dir.is_dir():
            return False
        if self.log_path.exists() and self.log_path.read_text(encoding="utf-8").strip():
            return False
        if self.frames_dir.is_dir() and any(self.frames_dir.iterdir()):
            return False
        known = {META_FILE, LOG_FILE, "frames"}
        if {p.name for p in self.dir.iterdir()} - known:
            return False
        shutil.rmtree(self.dir, ignore_errors=True)
        print(f"[OK] session {self.session_id}: nothing captured — discarded.")
        return True
