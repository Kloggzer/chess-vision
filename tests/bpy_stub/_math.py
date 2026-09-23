"""Das Stueck `mathutils`, das `synth/render_board_v2.py` braucht; Blender-Eigenheiten werfen."""

from __future__ import annotations

import math


class StubGap(NotImplementedError):
    """Der Stub bildet diese Stelle NICHT nach — hier muss echtes Blender laufen."""


class Vector:
    def __init__(self, co=(0.0, 0.0, 0.0)):
        self.co = [float(v) for v in co]

    def __len__(self):
        return len(self.co)

    def __getitem__(self, i):
        return self.co[i]

    def __iter__(self):
        return iter(self.co)

    def __repr__(self):
        return f"Vector({self.co})"

    @property
    def x(self):
        return self.co[0]

    @property
    def y(self):
        return self.co[1]

    @property
    def z(self):
        return self.co[2]

    def __add__(self, o):
        return Vector([a + b for a, b in zip(self.co, o, strict=False)])

    def __sub__(self, o):
        return Vector([a - b for a, b in zip(self.co, o, strict=False)])

    def __neg__(self):
        return Vector([-a for a in self.co])

    def __mul__(self, s):
        return Vector([a * float(s) for a in self.co])

    __rmul__ = __mul__

    @property
    def length(self):
        return math.sqrt(sum(a * a for a in self.co))

    def normalized(self):
        n = self.length
        if n == 0.0:
            raise StubGap("normalized() of a zero vector is Blender-defined")
        return Vector([a / n for a in self.co])

    def dot(self, o):
        return sum(a * b for a, b in zip(self.co, o, strict=False))

    def cross(self, o):
        a, b = self.co, list(o)
        return Vector([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
                       a[0] * b[1] - a[1] * b[0]])

    def to_track_quat(self, track: str, up: str) -> Quaternion:
        """Lokale `track`-Achse auf diesen Vektor, lokale `up`-Achse so nah an Welt-+Z wie moeglich.

        Nur `("-Z", "Y")` — die Kamera-Kombination. Im Kippfall (Blickrichtung fast parallel zur
        Welt-Z-Achse) ist die Rolle in Blender durch einen internen Sonderfall entschieden, den
        dieser Stub nicht kennt: dann wirft er.
        """
        if (track, up) != ("-Z", "Y"):
            raise StubGap(f"to_track_quat({track!r}, {up!r}) is not modelled")
        z_local = -self.normalized()
        world_up = Vector((0.0, 0.0, 1.0))
        if world_up.cross(z_local).length < 1e-3:
            raise StubGap("to_track_quat is degenerate here; Blender's tie-break is not modelled")
        y_local = (world_up - z_local * world_up.dot(z_local)).normalized()
        x_local = y_local.cross(z_local)
        return Quaternion(Matrix.from_columns(x_local, y_local, z_local))


class Quaternion:
    """Nur so viel Quaternion, wie `to_track_quat(...).to_euler()` braucht: eine Drehmatrix."""

    def __init__(self, matrix: Matrix):
        self.matrix = matrix

    def to_euler(self) -> Euler:
        return self.matrix.to_euler()


class Euler:
    def __init__(self, angles=(0.0, 0.0, 0.0)):
        self.angles = [float(a) for a in angles]

    def __iter__(self):
        return iter(self.angles)

    def __getitem__(self, i):
        return self.angles[i]

    def __repr__(self):
        return f"Euler({self.angles})"

    def to_matrix(self) -> Matrix:
        rx, ry, rz = self.angles
        return (Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y")
                @ Matrix.Rotation(rx, 4, "X"))


class Matrix:
    def __init__(self, rows=None):
        self.rows = [list(r) for r in rows] if rows else [
            [1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]

    @classmethod
    def from_columns(cls, x: Vector, y: Vector, z: Vector) -> Matrix:
        m = cls()
        for r in range(3):
            m.rows[r][:3] = [x[r], y[r], z[r]]
        return m

    @classmethod
    def Translation(cls, t) -> Matrix:  # noqa: N802 — Blender's spelling
        m = cls()
        for r in range(3):
            m.rows[r][3] = float(t[r])
        return m

    @classmethod
    def Rotation(cls, angle, size, axis) -> Matrix:  # noqa: N802 — Blender's spelling
        if size != 4:
            raise StubGap(f"Matrix.Rotation(size={size}) is not modelled")
        c, s = math.cos(angle), math.sin(angle)
        m = cls()
        if axis == "X":
            m.rows[1][1], m.rows[1][2], m.rows[2][1], m.rows[2][2] = c, -s, s, c
        elif axis == "Y":
            m.rows[0][0], m.rows[0][2], m.rows[2][0], m.rows[2][2] = c, s, -s, c
        elif axis == "Z":
            m.rows[0][0], m.rows[0][1], m.rows[1][0], m.rows[1][1] = c, -s, s, c
        else:
            raise StubGap(f"Matrix.Rotation(axis={axis!r}) is not modelled")
        return m

    def __matmul__(self, other):
        if isinstance(other, Vector):
            co = [sum(self.rows[r][c] * other[c] for c in range(3)) + self.rows[r][3]
                  for r in range(3)]
            return Vector(co)
        out = [[sum(self.rows[r][k] * other.rows[k][c] for k in range(4)) for c in range(4)]
               for r in range(4)]
        return Matrix(out)

    def normalized(self) -> Matrix:
        """Skalierung aus den drei Basisspalten nehmen; Translation bleibt."""
        m = Matrix([list(r) for r in self.rows])
        for c in range(3):
            n = math.sqrt(sum(self.rows[r][c] ** 2 for r in range(3)))
            if n == 0.0:
                raise StubGap("normalized() of a degenerate matrix is Blender-defined")
            for r in range(3):
                m.rows[r][c] /= n
        return m

    def inverted(self) -> Matrix:
        """Nur fuer starre Transformationen (Rotation + Translation) — sonst werfen."""
        r = [[self.rows[i][j] for j in range(3)] for i in range(3)]
        for i in range(3):
            for j in range(3):
                want = 1.0 if i == j else 0.0
                if abs(sum(r[k][i] * r[k][j] for k in range(3)) - want) > 1e-6:
                    raise StubGap("inverted() is modelled for rigid transforms only")
        t = [self.rows[i][3] for i in range(3)]
        out = Matrix()
        for i in range(3):
            out.rows[i][:3] = [r[j][i] for j in range(3)]
            out.rows[i][3] = -sum(r[k][i] * t[k] for k in range(3))
        return out

    def to_euler(self) -> Euler:
        """XYZ-Euler aus einer Drehmatrix; im Gimbal-Lock-Fall wirft der Stub."""
        m = self.rows
        if abs(m[2][0]) > 1.0 - 1e-9:
            raise StubGap("to_euler() at gimbal lock is Blender-defined")
        ry = math.asin(-m[2][0])
        rx = math.atan2(m[2][1], m[2][2])
        rz = math.atan2(m[1][0], m[0][0])
        return Euler((rx, ry, rz))
