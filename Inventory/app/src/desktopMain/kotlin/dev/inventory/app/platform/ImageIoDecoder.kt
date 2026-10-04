package dev.inventory.app.platform

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * ImageDecoder backed by javax.imageio with downscaling for previews.
 */
class ImageIoDecoder : ImageDecoder {
    override suspend fun decode(path: String, maxDimension: Int): ImageBitmap? = withContext(Dispatchers.IO) {
        val source = try {
            ImageIO.read(File(path))
        } catch (e: Exception) {
            null
        } ?: return@withContext null
        val scale = minOf(1.0, maxDimension.toDouble() / maxOf(source.width, source.height))
        val scaled = if (scale >= 1.0) {
            source
        } else {
            val w = maxOf(1, (source.width * scale).toInt())
            val h = maxOf(1, (source.height * scale).toInt())
            BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB).also { target ->
                val g = target.createGraphics()
                try {
                    g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR)
                    g.drawImage(source, 0, 0, w, h, null)
                } finally {
                    g.dispose()
                }
            }
        }
        scaled.toComposeImageBitmap()
    }
}
