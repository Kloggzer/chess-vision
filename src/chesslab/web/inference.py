"""Modell-Inferenz fürs Review und Live-Inference — dünner Shim.

Verschoben nach `chesslab.serving` (kanonische Inference-Facade, siehe
specs/rework/01-serving-facade.md). Dieses Modul existiert nur noch für
Rückwärtskompatibilität: die einzige Call-Site `web/app.py::labeling_predict`
importiert von hier und funktioniert unverändert.
"""

from __future__ import annotations

from ..serving import clear_cache, model_classes, predict_arrays, predict_rows

__all__ = ["predict_rows", "predict_arrays", "model_classes", "clear_cache"]
