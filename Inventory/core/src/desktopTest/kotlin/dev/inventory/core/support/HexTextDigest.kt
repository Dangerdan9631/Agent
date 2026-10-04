package dev.inventory.core.support

import dev.inventory.core.port.TextDigest

/**
 * TextDigest that returns a stable, collision-resistant stand-in without depending on java.security.
 */
class HexTextDigest : TextDigest {
    override fun sha256Hex(text: String): String {
        var hash = 0xCBF29CE484222325UL
        for (byte in text.encodeToByteArray()) {
            hash = hash xor (byte.toULong() and 0xFFUL)
            hash *= 0x100000001B3UL
        }
        return hash.toString(16).padStart(16, '0')
    }
}
