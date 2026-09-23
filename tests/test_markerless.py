"""Markerlose Brettsuche auf einem gerenderten Brett (`docs/markerless.md`)."""

import cv2
import numpy as np
import pytest

from chesslab.markerless import CELLS, find_board, fix_phase, grid_angle

# Groesser als die Arbeitsbreite des Detektors (960): er ist fuers HERUNTERskalieren gebaut,
# und ein hochskaliertes Miniaturbrett prueft etwas anderes als eine Aufnahme.
CELL = 100
BORDER = 140
DARK, LIGHT = 60, 200


def board_image(angle_deg: float = 0.0, size: int = 1280, labels: bool = False) -> np.ndarray:
    """Ein Brett mit Rand, gedreht — der Rand ist der Teil, der die Phase mehrdeutig macht.

    `labels` setzt Zeichen in den Rand. Genau die brachten den ersten Ansatz zu Fall: er mass die
    STAERKE der Alternation, und ein beschrifteter Rand variiert ebenso stark wie ein Karo.
    """
    img = np.full((size, size, 3), 130, np.uint8)
    for i in range(CELLS):
        for j in range(CELLS):
            v = LIGHT if (i + j) % 2 == 0 else DARK
            y, x = BORDER + i * CELL, BORDER + j * CELL
            img[y:y + CELL, x:x + CELL] = v
    if labels:
        for k in range(CELLS):
            for y in (BORDER - CELL // 2, BORDER + CELLS * CELL + CELL // 2):
                cv2.putText(img, "ABCDEFGH"[k], (BORDER + k * CELL + CELL // 3, y),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (40, 40, 40), 3)
                cv2.putText(img, "12345678"[k], (y, BORDER + k * CELL + 2 * CELL // 3),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (40, 40, 40), 3)
    if angle_deg:
        m = cv2.getRotationMatrix2D((size / 2, size / 2), angle_deg, 1.0)
        img = cv2.warpAffine(img, m, (size, size), borderValue=(130, 130, 130))
    # Etwas Korn, damit der Liniendetektor auf einer Kante arbeitet und nicht auf einem Ideal.
    rng = np.random.default_rng(7)
    return np.clip(img.astype(np.int16) + rng.normal(0, 3, img.shape), 0, 255).astype(np.uint8)


def corners_of(img):
    quad = find_board(img)
    assert quad is not None, "kein Brett gefunden"
    return np.array(quad, float)


def test_finds_the_playing_field_not_the_border():
    # Der Rand liefert dieselben parallelen Kanten; gesucht ist das 8x8 dazwischen.
    quad = corners_of(board_image())
    expected = np.array([[BORDER, BORDER], [BORDER + CELLS * CELL, BORDER],
                         [BORDER + CELLS * CELL, BORDER + CELLS * CELL],
                         [BORDER, BORDER + CELLS * CELL]], float)
    assert np.abs(quad - expected).max() < CELL / 2, f"{quad} gegen {expected}"


@pytest.mark.parametrize("angle", [0.0, 4.0, -7.0])
def test_a_rotated_board_is_still_found(angle):
    quad = corners_of(board_image(angle))
    side = np.linalg.norm(quad[1] - quad[0])
    assert abs(side - CELLS * CELL) < CELL, f"Kante {side:.1f} statt {CELLS * CELL}"


def test_the_grid_angle_uses_four_theta_not_two():
    """Zwei senkrechte Familien duerfen nicht zu einem Wert DAZWISCHEN verschmelzen: der doppelte
    Winkel legte 0 und 90 Grad aufeinander (107 Grad, 4 statt 167 Segmente).
    """
    horiz = np.array([[0, y, 300, y] for y in range(0, 300, 30)], np.float32)
    vert = np.array([[x, 0, x, 300] for x in range(0, 300, 30)], np.float32)
    got = grid_angle(np.concatenate([horiz, vert]))
    assert min(got, 90 - got) < 2.0, f"{got} Grad liegt zwischen den Familien"


@pytest.mark.parametrize("labels", [False, True])
@pytest.mark.parametrize("shift", [(1, 0), (0, -1), (-1, 1)])
def test_a_quad_off_by_one_cell_is_pulled_back(labels, shift):
    """Der eine Fehler, der nach dem Takt uebrig bleibt — und der Rand darf nicht taeuschen."""
    img = board_image(labels=labels)
    true = np.array(find_board(img), float)
    du, dv = (true[1] - true[0]) / CELLS, (true[3] - true[0]) / CELLS
    off = true + shift[0] * du + shift[1] * dv
    assert np.abs(np.array(fix_phase(img, off), float) - true).max() < CELL / 4


def test_a_frame_without_a_board_yields_nothing():
    assert find_board(np.full((480, 640, 3), 120, np.uint8)) is None


def test_corner_roles_are_stable():
    # a8 ist links oben, dann im Uhrzeigersinn — die Pipeline liest die vier als feste Rollen.
    quad = corners_of(board_image())
    assert quad[0][0] < quad[1][0] and quad[0][1] < quad[3][1]
    assert quad[2][0] > quad[3][0] and quad[2][1] > quad[1][1]
