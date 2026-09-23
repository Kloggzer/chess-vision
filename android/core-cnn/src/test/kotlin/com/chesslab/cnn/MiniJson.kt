package com.chesslab.cnn

// A small JSON reader for the golden fixtures: `:core-cnn` carries no JSON dependency, and
// `org.json` is stubbed in Android unit tests.
internal class MiniJson(
    private val src: String,
) {
    private var pos = 0

    fun parse(): Any? {
        val value = value()
        skipWhitespace()
        return value
    }

    private fun value(): Any? {
        skipWhitespace()
        return when (src[pos]) {
            '{' -> obj()
            '[' -> arr()
            '"' -> str()
            't' -> literal("true", true)
            'f' -> literal("false", false)
            'n' -> literal("null", null)
            else -> num()
        }
    }

    private fun obj(): Map<String, Any?> {
        val out = LinkedHashMap<String, Any?>()
        pos++
        skipWhitespace()
        while (src[pos] != '}') {
            val key = str()
            skipWhitespace()
            pos++ // ':'
            out[key] = value()
            skipWhitespace()
            if (src[pos] == ',') {
                pos++
                skipWhitespace()
            }
        }
        pos++
        return out
    }

    private fun arr(): List<Any?> {
        val out = ArrayList<Any?>()
        pos++
        skipWhitespace()
        while (src[pos] != ']') {
            out.add(value())
            skipWhitespace()
            if (src[pos] == ',') {
                pos++
                skipWhitespace()
            }
        }
        pos++
        return out
    }

    private fun str(): String {
        pos++
        val sb = StringBuilder()
        while (src[pos] != '"') {
            if (src[pos] == '\\') {
                pos++
                sb.append(unescape())
            } else {
                sb.append(src[pos])
                pos++
            }
        }
        pos++
        return sb.toString()
    }

    private fun unescape(): Char {
        val marker = src[pos]
        pos++
        return when (marker) {
            'n' -> '\n'
            't' -> '\t'
            'r' -> '\r'
            'b' -> '\b'
            'u' -> unicodeEscape()
            else -> marker
        }
    }

    private fun unicodeEscape(): Char {
        val hex = src.substring(pos, pos + HEX_DIGITS)
        pos += HEX_DIGITS
        return hex.toInt(HEX_RADIX).toChar()
    }

    private fun num(): Double {
        val start = pos
        while (pos < src.length && (src[pos].isDigit() || src[pos] in NUMBER_CHARS)) pos++
        return src.substring(start, pos).toDouble()
    }

    private fun literal(
        text: String,
        parsed: Any?,
    ): Any? {
        pos += text.length
        return parsed
    }

    private fun skipWhitespace() {
        while (pos < src.length && src[pos].isWhitespace()) pos++
    }

    private companion object {
        const val HEX_DIGITS = 4
        const val HEX_RADIX = 16
        const val NUMBER_CHARS = "+-.eE"
    }
}
