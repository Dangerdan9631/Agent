package dev.inventory.data.support

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.file.Files
import java.nio.file.Path

/**
 * Writes an uncompressed 24-bit BMP so image fingerprint tests do not need an extra image library.
 */
class BmpWriter {
    /**
     * Writes a width-by-height image whose pixels are produced by pixel(x, y) as 0xRRGGBB.
     */
    fun write(path: Path, width: Int, height: Int, pixel: (Int, Int) -> Int) {
        val rowStride = ((width * 3 + 3) / 4) * 4
        val pixelBytes = rowStride * height
        val buffer = ByteBuffer.allocate(54 + pixelBytes).order(ByteOrder.LITTLE_ENDIAN)
        buffer.put('B'.code.toByte()).put('M'.code.toByte())
        buffer.putInt(54 + pixelBytes)
        buffer.putInt(0)
        buffer.putInt(54)
        buffer.putInt(40)
        buffer.putInt(width)
        buffer.putInt(height)
        buffer.putShort(1)
        buffer.putShort(24)
        buffer.putInt(0)
        buffer.putInt(pixelBytes)
        buffer.putInt(2835)
        buffer.putInt(2835)
        buffer.putInt(0)
        buffer.putInt(0)
        for (y in 0 until height) {
            for (x in 0 until width) {
                val rgb = pixel(x, y)
                buffer.put((rgb and 0xFF).toByte())
                buffer.put(((rgb shr 8) and 0xFF).toByte())
                buffer.put(((rgb shr 16) and 0xFF).toByte())
            }
            repeat(rowStride - width * 3) { buffer.put(0) }
        }
        Files.write(path, buffer.array())
    }
}
