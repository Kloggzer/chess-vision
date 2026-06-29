# Stufe 0 — Pre-flight: Environment-Validierung (`doctor.py`)

## Zweck

Das Environment ist laut Nutzer **bereits eingerichtet** (Linux, ROCm, PyTorch-ROCm-Build,
AMD Radeon RX 7900 XTX). Diese Stufe **installiert nichts** und ändert nichts — sie
**validiert** nur und meldet klar PASS/FAIL mit Remediation-Hinweisen. Ziel: vor dem
Training (Stufe 5) sicherstellen, dass die GPU wirklich nutzbar ist, statt es anzunehmen.

> Wichtig für Claude Code: **Keine** `pip install` / `uv add` von torch ausführen. Wenn
> ein Pflicht-Check fehlschlägt, den Befund melden und Rücksprache halten — nicht
> versuchen, ROCm/PyTorch eigenmächtig „zu reparieren". Reine App-Abhängigkeiten
> (opencv, python-chess, typer, pyyaml) dürfen normal installiert werden.

## CLI

```
chesslab doctor [--gpu] [--camera 0] [--json]
```

- ohne Flags: Basis-Checks (Python, App-Deps, Konfig-Pfade).
- `--gpu`: zusätzlich die komplette ROCm/PyTorch-GPU-Validierung (Pflicht vor Stufe 5).
- `--camera N`: Kamera-Check für Index N (öffnen + ein Frame lesen).
- `--json`: maschinenlesbarer Report zusätzlich zur menschenlesbaren Ausgabe.

Exit-Code: `0` nur wenn **alle angeforderten** Pflicht-Checks bestehen, sonst `!= 0`.

## Checks

### A) Basis (immer)
1. Python `>= 3.11`.
2. Import der App-Deps: `cv2`, `numpy`, `PIL`, `chess`, `typer`, `yaml`. Versionen loggen.
3. Daten-/Konfig-Verzeichnisse existieren oder werden angelegt (`data/...`).

### B) GPU / ROCm (`--gpu`, Pflicht vor Training)
Reihenfolge so, dass die Diagnose den Fehler eingrenzt:

1. `import torch` gelingt; `torch.__version__` loggen. **Erwartung:** enthält `+rocm`
   (z. B. `2.x.y+rocm6.2`). Enthält es stattdessen `+cu...`, ist der **falsche
   (CUDA-)Build** installiert -> FAIL mit klarem Hinweis.
2. `torch.version.hip is not None` -> bestätigt ROCm-Build. (`torch.version.cuda` ist
   beim ROCm-Build typischerweise `None`.) FAIL, wenn `hip` None ist.
3. `torch.cuda.is_available()` ist `True`. (Unter ROCm wird die `torch.cuda.*`-API
   bewusst wiederverwendet — das ist korrekt, nicht NVIDIA.) FAIL sonst.
4. `torch.cuda.device_count() >= 1`.
5. `torch.cuda.get_device_name(0)` loggen. **Erwartung:** enthält `7900`, `Radeon` oder
   `AMD`. Andernfalls WARN (Name kann je nach Treiber generisch sein), kein harter FAIL.
6. `torch.cuda.get_device_properties(0).total_memory` loggen. **Erwartung:** ~24 GB
   (>= 20 GB als Schwelle). Darunter WARN.
7. **Echter Compute-Test (der entscheidende):**
   ```python
   x = torch.randn(2048, 2048, device="cuda")
   y = torch.randn(2048, 2048, device="cuda")
   z = (x @ y).sum().item()        # erzwingt Sync + Rücktransfer
   torch.cuda.synchronize()
   ```
   Läuft das ohne Exception und ist `z` endlich -> PASS. Crasht es (häufig bei
   gfx-Mismatch) -> FAIL mit Hinweis auf gfx-Target (siehe unten).
8. Optionaler System-Check via `subprocess` (nicht Pflicht, nur Info): `rocm-smi`
   und/oder `rocminfo` aufrufen, ROCm-Version und `gfx`-Target des Agents loggen. Fehlt
   das Binary -> WARN, kein FAIL (PyTorch-Checks sind maßgeblich).

### C) Kamera (`--camera N`)
1. `cv2.VideoCapture(N)` öffnet (unter Linux normales V4L2-Backend).
2. Mindestens ein Frame `read()` liefert ein nicht-leeres Bild; Auflösung loggen.
3. Hinweis ausgeben, ob `DISPLAY` gesetzt ist (für `cv2.imshow` in Stufe 1/3 nötig).
   Fehlt `DISPLAY` -> WARN: Kalibrierung/Aufnahme braucht eine GUI-Session.

## 7900 XTX / gfx1100 — Diagnosehinweise (in FAIL-Meldungen einbauen)

- Die 7900 XTX ist **gfx1100** und in aktuellen ROCm-Versionen offiziell unterstützt —
  `HSA_OVERRIDE_GFX_VERSION` sollte **nicht** nötig sein. Auf einer unterstützten Karte
  ein Override zu setzen kann sogar schaden. Nur als allerletzten Fallback erwähnen
  (z. B. `HSA_OVERRIDE_GFX_VERSION=11.0.0`), nicht automatisch setzen.
- Falscher PyTorch-Build (CUDA statt ROCm) ist der häufigste Stolperstein: erkennbar an
  `+cu` in der Version bzw. `torch.version.hip is None`. Remediation-Hinweis: ROCm-Wheel
  vom `rocm`-Index neu installieren — aber **nur nach Rücksprache**, nicht automatisch.
- `torch.cuda.is_available() == False` trotz ROCm-Build: oft Treiber-/Permissions-Problem
  (User nicht in Gruppe `render`/`video`, oder `/dev/kfd` & `/dev/dri` nicht zugreifbar).
  Als Hinweis ausgeben, nicht selbst fixen.

## Report-Format

Menschenlesbar, eine Zeile pro Check: `[PASS] / [WARN] / [FAIL] <Check> — <Detail>`.
Am Ende eine Summenzeile. Bei `--json` zusätzlich:

```json
{
  "ok": true,
  "checks": [
    {"name": "torch.rocm_build", "status": "pass", "detail": "2.4.1+rocm6.2"},
    {"name": "torch.cuda.is_available", "status": "pass", "detail": "true"},
    {"name": "gpu.compute", "status": "pass", "detail": "matmul 2048x2048 ok"},
    {"name": "gpu.name", "status": "pass", "detail": "AMD Radeon RX 7900 XTX"}
  ]
}
```

## Akzeptanzkriterien (Definition of Done)

- `chesslab doctor` (ohne `--gpu`) läuft auch ohne GPU/Kamera durch und prüft Basis-Deps.
- `chesslab doctor --gpu` gibt für jeden GPU-Check eine eigene PASS/WARN/FAIL-Zeile aus,
  inklusive des echten Matmul-Compute-Tests, und exit-codet korrekt.
- Bei falschem (CUDA-)Build erscheint eine **eindeutige** FAIL-Meldung, die den Build als
  Ursache benennt — kein generischer Stacktrace.
- `chesslab doctor --camera 0` öffnet die Kamera und liest einen Frame oder meldet sauber
  den Grund.
- Stufe 5 (`train`) ruft intern denselben GPU-Validierungspfad auf und bricht mit
  klarer Meldung ab, falls die GPU nicht nutzbar ist (statt still auf CPU zu fallen).
