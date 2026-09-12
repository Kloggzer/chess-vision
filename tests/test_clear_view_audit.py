"""The audit must not turn absent or malformed sensor data into a clear board."""

import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "clear_view_audit", Path(__file__).parents[1] / "scripts" / "clear_view_audit.py",
)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ClearViewAuditTest(unittest.TestCase):
    def test_missing_or_invalid_measurements_are_unknown(self):
        clear = dict.fromkeys(audit.SQUARES, 0.0)
        for missing in [{}, {**clear, "e4": None}, {**clear, "e4": float("nan")}]:
            self.assertEqual("unknown", audit.compare(clear, missing, 0.05, 0.01))
            self.assertEqual("unknown", audit.compare(missing, clear, 0.05, 0.01))

    def test_one_covered_square_blocks_the_whole_board(self):
        clear = dict.fromkeys(audit.SQUARES, 0.0)
        hand = {**clear, "e4": 0.8}
        self.assertEqual("false_clear", audit.compare(clear, hand, 0.05, 0.01))
        self.assertEqual("false_block", audit.compare(hand, clear, 0.05, 0.01))
        self.assertEqual("both_covered", audit.compare(hand, hand, 0.05, 0.01))
        self.assertEqual("both_clear", audit.compare(clear, clear, 0.05, 0.01))
