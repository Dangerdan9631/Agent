package dev.inventory.app.platform

import androidx.compose.ui.graphics.ImageBitmap

/**
 * Decodes image files into Compose bitmaps for previews.
 */
interface ImageDecoder {
    /**
     * Returns a bitmap no larger than maxDimension on either side, or null when the file cannot be decoded.
     */
    suspend fun decode(path: String, maxDimension: Int): ImageBitmap?
}
