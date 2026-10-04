package dev.inventory.data.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.ContentFingerprinter
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * Fingerprints images with a 64-bit difference hash computed from a 9x8 grayscale downscale, encoded as 16 hex digits.
 */
class ImageDHashFingerprinter(
    private val dispatcher: CoroutineDispatcher,
    private val maxSize: Long = 64L * 1024 * 1024,
) : ContentFingerprinter {
    override val kind: FingerprintKind = FingerprintKind.IMAGE_DHASH

    override fun supports(file: FileEntry): Boolean =
        file.kind == FileKind.IMAGE && file.size in 1..maxSize && file.extension in SUPPORTED

    override suspend fun fingerprint(path: String): String? = withContext(dispatcher) {
        val image = try {
            ImageIO.read(File(path))
        } catch (e: Exception) {
            null
        } ?: return@withContext null
        hash(image).toString(16).padStart(16, '0')
    }

    private fun hash(source: BufferedImage): ULong {
        val small = BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_BYTE_GRAY)
        val graphics = small.createGraphics()
        try {
            graphics.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR)
            graphics.drawImage(source, 0, 0, WIDTH, HEIGHT, null)
        } finally {
            graphics.dispose()
        }
        var bits = 0uL
        for (y in 0 until HEIGHT) {
            for (x in 0 until WIDTH - 1) {
                val left = small.raster.getSample(x, y, 0)
                val right = small.raster.getSample(x + 1, y, 0)
                bits = (bits shl 1) or (if (left < right) 1uL else 0uL)
            }
        }
        return bits
    }

    private companion object {
        const val WIDTH = 9
        const val HEIGHT = 8
        val SUPPORTED = setOf("jpg", "jpeg", "jfif", "png", "gif", "bmp", "tif", "tiff", "webp")
    }
}
