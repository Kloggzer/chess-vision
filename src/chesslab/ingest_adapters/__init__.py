"""Dünne Adapter, die externe Schach-Datensätze in `chesslab.ingest.ImportItem` übersetzen.
Jeder Adapter exportiert `iter_items(root: Path) -> Iterator[ImportItem]` mit den Brettecken
**geordnet `[a8, h8, h1, a1]`** (= top-left, top-right, bottom-right, bottom-left aus Weiß-Sicht)."""
