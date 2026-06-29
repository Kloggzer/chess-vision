# Einrichten / Reparieren der Umgebung — installiert ALLES aus uv.lock,
# inkl. PyTorch (ROCm) + ROCm-SDK aus den lokalen Wheels in wheels\.
#
# Dank Pinning in pyproject.toml + uv.lock ist `uv sync` jetzt SICHER:
# es installiert/behält torch, statt es zu entfernen.
#
# Falls "Zugriff verweigert" auf eine ROCm-DLL kommt: ein laufender Python-Prozess
# sperrt sie -> alle Terminals schliessen oder kurz neu starten, dann erneut.
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File repair-env.ps1

uv sync
uv run chesslab doctor --gpu
