"""Die oeffentliche CLI-Oberflaeche als Schnappschuss: Web-App und Skripte lesen sie.

Jeder Befehl mit seinen Optionen (Name, Typ, Vorgabe, Hilfe) und seiner gerenderten `--help`.
Neu schreiben NUR bei gewollter Aenderung: `uv run python tests/test_cli_surface.py`.
"""
from __future__ import annotations

import json
from pathlib import Path

import typer
from typer.testing import CliRunner

FIXTURE = Path(__file__).parent / "data" / "cli_surface.json"
ENV = {"COLUMNS": "120", "TERMINAL_WIDTH": "120", "TERM": "dumb", "NO_COLOR": "1"}


def _plain(value):
    if value is None or isinstance(value, bool | int | float | str):
        return value
    if isinstance(value, list | tuple):
        return [_plain(v) for v in value]
    return str(value)


def _type(t) -> dict:
    out = {"name": t.name, "class": type(t).__name__}
    for attr in ("choices", "min", "max", "min_open", "max_open", "clamp"):
        if hasattr(t, attr):
            out[attr] = _plain(getattr(t, attr))
    return out


def _param(p) -> dict:
    out = {"name": p.name, "kind": p.param_type_name, "opts": p.opts,
           "secondary_opts": p.secondary_opts, "type": _type(p.type), "required": p.required,
           "default": _plain(p.default), "multiple": p.multiple, "nargs": p.nargs,
           "metavar": p.metavar, "envvar": _plain(p.envvar)}
    for attr in ("help", "is_flag", "flag_value", "count", "hidden", "show_default"):
        if hasattr(p, attr):
            out[attr] = _plain(getattr(p, attr))
    return out


def _walk(cmd, path: list[str], out: dict) -> None:
    out[" ".join(path)] = {"help": cmd.help, "short_help": cmd.short_help, "hidden": cmd.hidden,
                           "no_args_is_help": cmd.no_args_is_help,
                           "params": [_param(p) for p in cmd.params]}
    if hasattr(cmd, "commands"):
        out[" ".join(path)]["commands"] = list(cmd.commands)
        for name, sub in cmd.commands.items():
            _walk(sub, [*path, name], out)


def surface() -> dict:
    from chesslab.cli import app

    tree: dict = {}
    _walk(typer.main.get_command(app), [], tree)
    runner = CliRunner()
    for key, entry in tree.items():
        res = runner.invoke(app, [*key.split(), "--help"], env=ENV, terminal_width=120)
        entry["help_exit"] = res.exit_code
        entry["help_output"] = res.output.splitlines()
    return tree


def test_the_cli_surface_matches_the_snapshot():
    want = json.loads(FIXTURE.read_text(encoding="utf-8"))
    got = surface()
    assert list(got) == list(want), "Befehle oder ihre Reihenfolge haben sich geaendert"
    diff = [k for k in want if got[k] != want[k]]
    assert not diff, f"Oberflaeche geaendert: {diff[:10]}"


if __name__ == "__main__":
    FIXTURE.write_text(json.dumps(surface(), indent=1, ensure_ascii=False) + "\n",
                       encoding="utf-8", newline="\n")
