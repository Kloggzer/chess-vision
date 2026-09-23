"""Die Fold-Tabelle darf weder eine Session verschlucken noch unsortiert dastehen."""

import unittest

from conftest import load_script

fold = load_script("fold_per_session")

NAN = float("nan")


class FoldPerSessionTest(unittest.TestCase):
    def test_a_session_two_folds_hold_back_is_reported_not_overwritten(self):
        out = {("s-a", "f0"): (10, 0.9, 0.8), ("s-a", "f2"): (10, 0.7, 0.6)}
        self.assertEqual({"s-a": ["f0", "f2"]}, fold.duplicate_sessions(out))

    def test_rows_without_a_visible_piece_sort_last_and_print_as_a_dash(self):
        out = {
            ("s-leer", "f0"): (10, 0.5, NAN),
            ("s-hoch", "f1"): (10, 0.9, 0.9),
            ("s-tief", "f2"): (10, 0.4, 0.1),
        }
        self.assertEqual(
            ["s-tief", "s-hoch", "s-leer"], [r[0] for r in fold.sorted_rows(out)],
        )
        self.assertIn("—", fold.table_line("s-leer", "f0", 0.5, NAN))
        self.assertNotIn("nan", fold.table_line("s-leer", "f0", 0.5, NAN))


if __name__ == "__main__":
    unittest.main()
