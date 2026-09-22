"""Ein ehrlicher `bpy`-Ersatz, damit die RECHENTEILE der Blender-Skripte pruefbar werden.

Nachgebildet ist genau so viel Blender, wie Kamera, Projektion und Szene-Aufloesung brauchen:
Objekte mit Ort/Drehung, `scene.render.resolution_*` und `world_to_camera_view`. Jede andere
Stelle wirft `StubGap` — ein Stub, der still einen Standardwert liefert, erfindet Messwerte.
`sensor_fit` bleibt AUTO, also entscheidet die groessere Bildkante ueber `sensor_width`.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

from ._math import Euler, Matrix, Quaternion, StubGap, Vector

SYNTH = Path(__file__).resolve().parents[2] / "synth"


class _Strict:
    """Basisklasse: was nicht ausdruecklich modelliert ist, wirft statt zu raten."""

    _what = "bpy"

    def __getattr__(self, name):
        raise StubGap(f"{self._what}.{name} is not modelled by the bpy stub")


class CameraData(_Strict):
    _what = "camera.data"

    def __init__(self, name="Camera"):
        self.name = name
        self.lens = 50.0
        self.sensor_width = 36.0
        self.clip_start = 0.1
        self.clip_end = 100.0
        self.type = "PERSP"


class Object(_Strict):
    _what = "object"

    def __init__(self, name, data=None):
        self.name = name
        self.data = data
        self.location = Vector((0.0, 0.0, 0.0))
        self.rotation_euler = Euler((0.0, 0.0, 0.0))
        self.hide_render = False

    @property
    def matrix_world(self) -> Matrix:
        """Aus Ort und Drehung gerechnet — deshalb ist `view_layer.update()` hier folgenlos."""
        rot = Euler(tuple(self.rotation_euler)).to_matrix()
        return Matrix.Translation(tuple(self.location)) @ rot


class _Collection(_Strict):
    _what = "collection"

    def __init__(self, scene):
        self.objects = _ObjectSlot(scene)


class _ObjectSlot(_Strict):
    _what = "collection.objects"

    def __init__(self, scene):
        self._scene = scene

    def link(self, obj):
        self._scene.objects[obj.name] = obj


class _Render(_Strict):
    _what = "scene.render"

    def __init__(self):
        self.resolution_x = 1024
        self.resolution_y = 1024
        self.pixel_aspect_x = 1.0
        self.pixel_aspect_y = 1.0
        self.filepath = ""


class Scene(_Strict):
    _what = "scene"

    def __init__(self):
        self.render = _Render()
        self.camera = None
        self.objects: dict[str, Object] = {}
        self.collection = _Collection(self)


class _DataCollection(_Strict):
    """`bpy.data.cameras` / `bpy.data.objects` — anlegen, nachschlagen, entfernen."""

    def __init__(self, what, factory, store):
        self._what, self._factory, self._store = what, factory, store

    def new(self, name, *a, **kw):
        obj = self._factory(name, *a, **kw)
        return obj

    def get(self, name, default=None):
        return self._store.get(name, default)


class _Data(_Strict):
    _what = "bpy.data"

    def __init__(self, scene: Scene):
        self.cameras = _DataCollection("bpy.data.cameras", lambda n: CameraData(n), {})
        self.objects = _DataCollection("bpy.data.objects",
                                       lambda n, d=None: Object(n, d), scene.objects)


class _ViewLayer(_Strict):
    _what = "view_layer"

    def update(self):
        """Folgenlos: `matrix_world` wird bei jedem Zugriff aus Ort und Drehung gerechnet."""


class _Context(_Strict):
    _what = "bpy.context"

    def __init__(self, scene: Scene):
        self.scene = scene
        self.view_layer = _ViewLayer()


def _world_to_camera_view(scene, obj, coord):
    """Blenders Projektion fuer eine PERSP-Kamera: NDC in x/y, Tiefe in z."""
    if obj.data.type != "PERSP":
        raise StubGap(f"world_to_camera_view for {obj.data.type} cameras is not modelled")
    local = obj.matrix_world.normalized().inverted() @ Vector(tuple(coord))
    z = -local.z
    if z == 0.0:
        return Vector((0.5, 0.5, 0.0))
    r = scene.render
    aspect = (r.resolution_x * r.pixel_aspect_x) / (r.resolution_y * r.pixel_aspect_y)
    half = obj.data.sensor_width / 2.0
    half_x, half_y = (half, half / aspect) if aspect >= 1.0 else (half * aspect, half)
    scale = obj.data.lens / z
    return Vector((0.5 + local.x * scale / (2.0 * half_x),
                   0.5 + local.y * scale / (2.0 * half_y), z))


def install() -> types.ModuleType:
    """`bpy`, `bpy_extras`, `mathutils` in `sys.modules` haengen und `bpy` zurueckgeben."""
    scene = Scene()
    bpy = types.ModuleType("bpy")
    bpy.data = _Data(scene)
    bpy.context = _Context(scene)
    bpy.types = types.ModuleType("bpy.types")

    mathutils = types.ModuleType("mathutils")
    mathutils.Vector, mathutils.Matrix = Vector, Matrix
    mathutils.Euler, mathutils.Quaternion = Euler, Quaternion

    extras = types.ModuleType("bpy_extras")
    obj_utils = types.ModuleType("bpy_extras.object_utils")
    obj_utils.world_to_camera_view = _world_to_camera_view
    extras.object_utils = obj_utils

    for name, mod in (("bpy", bpy), ("mathutils", mathutils), ("bpy_extras", extras),
                      ("bpy_extras.object_utils", obj_utils)):
        sys.modules[name] = mod
    return bpy


def load(name: str):
    """Ein `synth/`-Modul unter dem Stub importieren (frisch, ohne den Repo-Cache zu stoeren)."""
    install()
    if str(SYNTH) not in sys.path:
        sys.path.insert(0, str(SYNTH))
    spec = importlib.util.spec_from_file_location(f"_stubbed_{name}", SYNTH / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


__all__ = ["Euler", "Matrix", "Object", "Scene", "StubGap", "Vector", "install", "load"]
