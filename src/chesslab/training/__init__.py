"""Stufe 5 — Training-Handoff: Per-Square-CNN trainieren, evaluieren, exportieren.

Torch wird nur in den ausführenden Modulen (`model`, `torch_data`, `engine`) auf
oberster Ebene importiert. `data.py` ist bewusst torch-frei (Board-Accuracy-Rekonstruktion,
Split-Filterung, Model-Card) und ohne PyTorch importier- und testbar.
"""
