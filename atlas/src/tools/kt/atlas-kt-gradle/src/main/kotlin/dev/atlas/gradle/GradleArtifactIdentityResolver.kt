package dev.atlas.gradle

import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication

/**
 * Resolves a model's opaque artifact identity from Gradle publication coordinates and target configuration.
 */
class GradleArtifactIdentityResolver(
    private val project: Project,
    private val target: String
) {
    /**
     * Resolves identity at task execution so publication coordinates configured later in a build remain authoritative.
     *
     * @return Published artifact identity and presentation metadata for one generated module model.
     */
    fun resolve(): GradleArtifactIdentity {
        val publication = project.extensions.findByType(PublishingExtension::class.java)
            ?.publications
            ?.withType(MavenPublication::class.java)
            ?.sortedBy { candidate -> candidate.name }
            ?.firstOrNull()
        val group = publication?.groupId?.takeIf { value -> value.isNotBlank() } ?: project.group.toString()
        val artifact = publication?.artifactId?.takeIf { value -> value.isNotBlank() } ?: project.name
        val version = publication?.version?.takeIf { value -> value.isNotBlank() } ?: project.version.toString()
        val variant = target
        return GradleArtifactIdentity(
            listOfNotNull(group, artifact, version, variant).joinToString(":"),
            artifact,
            version,
            variant,
            this.inferCategory()
        )
    }

    /** Infers only presentation metadata; core Atlas behavior does not interpret this category. */
    private fun inferCategory(): String {
        return when {
            project.plugins.hasPlugin("com.android.application") -> "kotlin-android-application"
            project.plugins.hasPlugin("com.android.library") -> "kotlin-android-library"
            project.plugins.hasPlugin("org.jetbrains.kotlin.js") -> "kotlin-js"
            project.plugins.hasPlugin("org.jetbrains.kotlin.multiplatform") -> "kotlin-multiplatform"
            else -> "kotlin-jvm"
        }
    }
}

/**
 * Identifies one Gradle-published artifact without exposing Gradle implementation objects to the model serializer.
 */
data class GradleArtifactIdentity(
    /** Opaque artifact identity used by cross-module targets. */
    val id: String,
    /** Readable published artifact name. */
    val displayName: String,
    /** Published artifact version. */
    val version: String,
    /** Optional target or build variant label. */
    val variant: String?,
    /** Artifact family for presentation and categorization. */
    val category: String
)
