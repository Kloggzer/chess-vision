package com.chesslab.tracker.ui.theme

import androidx.compose.ui.graphics.Color

// The screen is read at arm's length across a physical board, in room light, at a glance.
// Everything here is picked for contrast against Surface, not for prettiness: no mid-greys,
// no hairline separators, no colour that only differs in hue from its neighbour.

val Background = Color(0xFF07090C)
val Surface = Color(0xFF12161C)
val SurfaceRaised = Color(0xFF1C222B)
val OnSurface = Color(0xFFF2F5F8)
val OnSurfaceMuted = Color(0xFF9AA6B4)
val Outline = Color(0xFF3A4453)

/** The tracker is following the game. */
val Accent = Color(0xFF4FD08A)

/** A hand is over the board / the frame is moving — expected, not a problem. */
val Busy = Color(0xFFF0B429)

/** The illegal-move latch. Also the board scrim while alarmed. */
val Danger = Color(0xFFFF5A52)

val OnAccent = Color(0xFF06210F)
val OnDanger = Color(0xFF2A0605)

// Board. Light squares stay well below white so the white pieces still separate from them.
val BoardLight = Color(0xFFB9C3CF)
val BoardDark = Color(0xFF4A5765)
val PieceWhite = Color(0xFFFFFFFF)
val PieceBlack = Color(0xFF0B0E13)
val LastMoveTint = Color(0x66F0B429)

// Evidence overlay — three sets that must never be confused for one another
// (changed, shadow-vetoed, occlusion-vetoed carry opposite meanings for z, invariant 2).
val OverlayChanged = Color(0xCC4FD08A)
val OverlayShadow = Color(0xCC5AA9FF)
val OverlayOcclusion = Color(0xCCFF5A52)

/** Scrim laid over the whole board while the alarm is latched: the rendered FEN is fiction. */
const val ALARM_SCRIM_ALPHA = 0.34f
