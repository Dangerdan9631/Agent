package dev.atlas.ksp

import com.google.devtools.ksp.processing.SymbolProcessor
import com.google.devtools.ksp.processing.SymbolProcessorEnvironment
import com.google.devtools.ksp.processing.SymbolProcessorProvider

/**
 * Creates target-local Atlas processors for KSP 2 compilation processing.
 */
class AtlasSymbolProcessorProvider : SymbolProcessorProvider {
    /**
     * Creates a processor using KSP's current target and compilation options.
     *
     * @param environment KSP-provided generation, logging, and option services.
     * @return A processor that writes this compilation's Atlas source fragment.
     */
    override fun create(environment: SymbolProcessorEnvironment): SymbolProcessor {
        return AtlasSymbolProcessor(environment)
    }
}
