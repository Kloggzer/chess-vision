"""Bug-Hunt 2026-09-14 (zweite Runde, Python-Seite)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRAIN = (ROOT / "src" / "chesslab" / "training" / "train_recipe.py").read_text(encoding="utf-8")


def _run_train_ast():
    import ast

    return ast.parse(TRAIN)


def _occluding_if():
    """Das `if occluding:`, das `criterion` setzt."""
    import ast

    for node in ast.walk(_run_train_ast()):
        if (isinstance(node, ast.If) and isinstance(node.test, ast.Name)
                and node.test.id == "occluding"
                and "OcclusionLoss" in ast.unparse(node.body)):
            return node
    raise AssertionError("der Occlusion-Zweig von run_train verschwunden")


def test_the_loss_flag_is_validated_on_the_default_head():
    """`--loss` wird unter `--head occlusion` (der VORGABE) nie geprueft.

    `if occluding:` setzt `OcclusionLoss`; die Kette `elif loss == "ce" / "focal" / else FAIL`
    haengt an seinem `else`-Zweig und wird damit uebersprungen. Ein Tippfehler in `--loss` laeuft
    durch, und `--loss focal --focal-gamma 5` rechnet trotzdem OcclusionLoss.
    """
    import ast

    branch = _occluding_if()
    gated = ast.unparse(branch.orelse)
    assert "unknown --loss" not in gated, (
        "Die Pruefung von --loss haengt im else-Zweig von `if occluding:`. Mit dem Vorgabekopf "
        "`occlusion` nimmt `chesslab train --loss banana` widerspruchslos an, rechnet "
        "OcclusionLoss und meldet trotzdem `[loss] banana`."
    )


def test_config_json_does_not_claim_a_loss_that_never_ran():
    """`config.json` traegt `"loss"`/`"focal_gamma"` unbedingt, obwohl der Vorgabekopf sie ignoriert.

    Ein Lauf mit `--loss focal --focal-gamma 5` schreibt genau das in seine Provenienz, obwohl
    weder FocalLoss noch gamma je angefasst wurden — der Vergleichsfehler, gegen den
    `test_config_provenance.py` geschrieben wurde.
    """
    import ast

    for node in ast.walk(_run_train_ast()):
        if not isinstance(node, ast.Dict):
            continue
        for key, value in zip(node.keys, node.values, strict=True):
            if isinstance(key, ast.Constant) and key.value == "loss":
                written = ast.unparse(value)
                assert "occluding" in written or "head" in written, (
                    f'config.json schreibt `"loss": {written}` ohne Ruecksicht auf den Kopf. '
                    "Bei --head occlusion ist das eine falsche Angabe: gerechnet wurde "
                    "OcclusionLoss, nicht `loss`."
                )
                return
    raise AssertionError('kein `"loss"`-Eintrag mehr in der config — Test anpassen')


def test_a_clock_jump_does_not_free_a_live_training_lock(tmp_path, monkeypatch):
    """Die Sitzung haengt an der LAUFZEIT, nicht an der Wanduhr.

    `_boot_time` rechnet `datetime.now() - uptime`, und `datetime.now()` ist naive Lokalzeit: eine
    Zeitumstellung verschiebt die abgeleitete Bootzeit um eine Stunde, `_same_boot` haelt das Lock
    dann fuer eines aus einer frueheren Sitzung und `held_by` meldet FREI — waehrend der Lauf
    laeuft. Das ist die gefaehrliche Richtung: zwei Trainings nebeneinander sind genau das, wogegen
    das Lock existiert.
    """
    import json
    from datetime import datetime, timedelta

    from chesslab import locks

    monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
    monkeypatch.setattr(locks, "_uptime_s", lambda: 3600.0)
    lock = tmp_path / "heavy.lock"
    lock.write_text(json.dumps({
        "pid": 4242, "childPid": 4242, "job": "train", "name": "p4a-80-clahe",
        "startedAt": datetime.now().isoformat(),
        "boot": (datetime.now() - timedelta(seconds=3600)).isoformat(),
        "uptime": 1800.0}), encoding="utf-8")

    # Die Uhr springt um eine Stunde vor; die Laufzeit kennt das nicht.
    monkeypatch.setattr(locks, "_boot_time", lambda: datetime.now() + timedelta(minutes=50))

    assert locks.held_by(lock) is not None, (
        "held_by meldet das Lock als frei, obwohl PID 4242 lebt — nur weil die Uhr gesprungen ist")
    assert locks.acquire(lock, "train", "zweiter-lauf") is not None, (
        "acquire vergibt das Lock neben einem laufenden Training neu")


def test_a_reboot_still_frees_the_lock(tmp_path, monkeypatch):
    """Die Gegenprobe: nach einem Neustart faellt die Laufzeit zurueck, und das Lock muss weg —
    Windows vergibt die PID neu, `pid_alive` sagt dann brav ja (2026-09-11)."""
    import json
    from datetime import datetime

    from chesslab import locks

    monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
    monkeypatch.setattr(locks, "_uptime_s", lambda: 30.0)
    lock = tmp_path / "heavy.lock"
    lock.write_text(json.dumps({
        "pid": 4242, "childPid": 4242, "job": "train", "name": "x",
        "startedAt": datetime.now().isoformat(), "uptime": 7200.0}), encoding="utf-8")

    assert locks.held_by(lock) is None

def test_subsample_classes_is_deterministic_from_its_seed():
    """Derselbe Satz Zeilen, derselbe Seed, dieselben Deckel — aber eine andere Reihenfolge der
    KLASSEN im Manifest, und `subsample_classes` behaelt andere Crops.

    `by_label.items()` laeuft in Einfuegereihenfolge, und der eine `rng` wird je Klasse in genau
    dieser Reihenfolge gezogen. `dedup_metadata` sortiert genau deshalb ("derselbe Seed muss
    dieselben Crops behalten, egal in welcher Reihenfolge das Manifest die Gruppen liefert") —
    hier fehlt es. `train.py:615` zieht damit je Lauf einen anderen Trainingssatz.
    """
    from chesslab.dataset import subsample_classes

    rows = [{"label": lab, "path": f"{lab}-{i}"}
            for lab, n in (("wP", 40), ("wN", 10), ("bQ", 12), ("empty", 200))
            for i in range(n)]
    order = {"bQ": 0, "wN": 1, "wP": 2, "empty": 3}
    shuffled = sorted(rows, key=lambda r: (order[r["label"]], r["path"]))

    a = {r["path"] for r in subsample_classes(rows, 1.0, 2.0, seed=42)}
    b = {r["path"] for r in subsample_classes(shuffled, 1.0, 2.0, seed=42)}
    assert a == b, (
        f"{len(a ^ b)} von {len(a)} behaltenen Crops haengen an der Manifest-Reihenfolge, "
        "nicht am Seed."
    )


def test_the_symbols_without_readers_stay_removed():
    """Am 2026-09-14 entfernt, weil sie niemand las — wer sie zurueckholt, bringt den Leser mit.

    `occluded_model.all_probs` und `dataset.subsample_empty` hatten null Aufrufer. `moved_ply`
    stand in jeder `timing`-Karte und wurde von keinem Leser in Python, TypeScript oder Kotlin
    wieder herausgeholt. Die Grid-Correction-Maschinerie beschrieb eine LIVE-Aufgabe und war an
    nichts verdrahtet; nur ihre eigenen Tests hielten sie am Leben.
    """
    import chesslab.alignment as al
    import chesslab.dataset as ds
    import chesslab.occluded_model as om

    assert not hasattr(om, "all_probs")
    assert not hasattr(ds, "subsample_empty")
    for name in ("grid_correction", "apply_grid_correction", "quad_drift_cells",
                 "DRIFT_EXPIRE_CELLS"):
        assert not hasattr(al, name), f"{name} ist zurueck, ohne Aufrufer"
    assert "moved_ply" not in Path("src/chesslab/position_flags.py").read_text(encoding="utf-8")
