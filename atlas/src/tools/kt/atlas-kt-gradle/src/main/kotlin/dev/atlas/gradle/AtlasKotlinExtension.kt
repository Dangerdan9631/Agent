package dev.atlas.gradle

import org.gradle.api.Action
import org.gradle.api.NamedDomainObjectContainer
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.model.ObjectFactory
import javax.inject.Inject

/**
 * Owns the explicitly registered target models for one Gradle project.
 */
open class AtlasKotlinExtension @Inject constructor(objects: ObjectFactory) {
    /** Atlas artifact root shared by every model generated from this project. */
    val rootDirectory: DirectoryProperty = objects.directoryProperty()

    /** Contains only target models declared by this project. */
    val models: NamedDomainObjectContainer<AtlasKotlinModelConfiguration> =
        objects.domainObjectContainer(AtlasKotlinModelConfiguration::class.java)

    /**
     * Configures this project's explicit target-model container.
     *
     * @param action Configuration applied to the named model container.
     */
    fun models(action: Action<NamedDomainObjectContainer<AtlasKotlinModelConfiguration>>) {
        action.execute(models)
    }
}
