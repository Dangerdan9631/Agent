package dev.inventory.data.hashing

import dev.inventory.core.port.TextDigest
import java.security.MessageDigest

/**
 * TextDigest backed by java.security.MessageDigest.
 */
class JvmTextDigest : TextDigest {
    override fun sha256Hex(text: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(text.encodeToByteArray())
        val out = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            out.append(HEX[(b.toInt() shr 4) and 0xF]).append(HEX[b.toInt() and 0xF])
        }
        return out.toString()
    }

    private companion object {
        const val HEX = "0123456789abcdef"
    }
}
