package dev.atlas.gradle

import dev.atlas.kt.AtlasKotlinCliMain
import dev.atlas.kt.KotlinModelGenerationRequestParser
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.Exec
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment

/**
 * Registers Kotlin JVM artifact model generation and canonical workspace-manifest tasks.
 */
class AtlasKotlinPlugin : Plugin<Project> {
    /**
     * Configures task registration after the Kotlin JVM plugin has supplied the project's build lifecycle.
     *
     * @param project The Gradle project receiving Atlas Kotlin integration.
     */
    override fun apply(project: Project) {
        val extension = project.extensions.create("atlas", AtlasKotlinExtension::class.java)
        val moduleTask = project.tasks.register("atlasGenerateModuleModel", AtlasGenerateModuleModelTask::class.java) {
            it.group = "atlas"
            it.description = "Generates this published Kotlin artifact's Atlas module model."
            it.extension = extension
            it.generatorClasspath.from(
                project.files(
                    AtlasKotlinCliMain::class.java.protectionDomain.codeSource.location,
                    KotlinModelGenerationRequestParser::class.java.protectionDomain.codeSource.location,
                    Unit::class.java.protectionDomain.codeSource.location,
                    KotlinCoreEnvironment::class.java.protectionDomain.codeSource.location,
                    this.runtimeLocation("org.jetbrains.kotlin.buildtools.api.CompilationService"),
                    this.runtimeLocation("kotlin.script.templates.standard.ScriptTemplateWithArgs"),
                    this.runtimeLocation("kotlin.reflect.jvm.internal.KClassImpl"),
                    this.runtimeLocation("org.jetbrains.kotlin.daemon.common.CompileService"),
                    this.runtimeLocation("kotlinx.coroutines.CoroutineScope"),
                    this.runtimeLocation("com.fasterxml.jackson.databind.ObjectMapper"),
                    this.runtimeLocation("com.fasterxml.jackson.core.JsonFactory"),
                    this.runtimeLocation("com.fasterxml.jackson.annotation.JsonProperty"),
                    this.runtimeLocation("com.fasterxml.jackson.dataformat.yaml.YAMLFactory"),
                    this.runtimeLocation("org.yaml.snakeyaml.LoaderOptions")
                )
            )
            it.semanticFragmentFiles.from(
                project.layout.buildDirectory.dir("generated/ksp").map { directory ->
                    project.fileTree(directory).matching { pattern -> pattern.include("**/*.atlas.fragment.yml") }
                }
            )
            it.generatorMainClass.set("dev.atlas.kt.AtlasKotlinCliMain")
            it.outputFile.set(
                project.rootProject.layout.buildDirectory.file(
                    "atlas/models/${this.modelDirectoryName(project)}/${project.name}.atlas.module.yml"
                )
            )
            it.onlyIf { task -> (task as AtlasGenerateModuleModelTask).kotlinSourceFiles.files.isNotEmpty() }
        }
        project.pluginManager.withPlugin("com.google.devtools.ksp") {
            this.configureKspProcessor(project, extension)
            val kspTasks = project.tasks.matching { task -> task.name.startsWith("ksp", ignoreCase = true) }
            moduleTask.configure { modelTask -> modelTask.dependsOn(kspTasks) }
        }
        if (project == project.rootProject) {
            this.registerRootTasks(project, extension, moduleTask)
            project.subprojects { child -> child.pluginManager.apply(AtlasKotlinPlugin::class.java) }
        }
        project.afterEvaluate {
            if (extension.generateOnBuild) {
                val generationTask = if (project == project.rootProject) {
                    project.tasks.named("atlasGenerate")
                } else {
                    project.rootProject.tasks.named("atlasGenerate")
                }
                project.tasks.matching { it.name == "build" }.configureEach { it.dependsOn(generationTask) }
            }
        }
    }

    /** Registers workspace-wide aggregation and CLI bridge tasks only on the Gradle root project. */
    private fun registerRootTasks(
        project: Project,
        extension: AtlasKotlinExtension,
        rootModuleTask: org.gradle.api.tasks.TaskProvider<AtlasGenerateModuleModelTask>
    ) {
        val modelsTask = project.tasks.register("atlasGenerateModels") {
            it.group = "atlas"
            it.description = "Generates selected Kotlin artifact models across this Gradle build."
            it.dependsOn(rootModuleTask)
        }
        val manifestTask = project.tasks.register("atlasGenerateManifest", AtlasGenerateWorkspaceManifestTask::class.java) {
            it.group = "atlas"
            it.description = "Aggregates selected Kotlin artifact models into an Atlas workspace manifest."
            it.dependsOn(modelsTask)
            it.inputDirectory.set(project.layout.buildDirectory.dir("atlas/models"))
            it.manifestFile.set(project.layout.buildDirectory.file("atlas/models/atlas.manifest.yml"))
        }
        this.registerCliTask(project, extension, "atlasValidate", "validate", manifestTask)
        val generationTask = this.registerCliTask(project, extension, "atlasGenerate", "generate", manifestTask)
        this.registerViewerTask(project, extension, generationTask)
        project.gradle.projectsEvaluated {
            val childModels = project.subprojects.mapNotNull { child -> child.tasks.findByName("atlasGenerateModuleModel") }
            modelsTask.configure { task -> task.dependsOn(childModels) }
        }
    }

    /** Registers a thin CLI bridge task that passes the generated manifest to the shared Atlas application. */
    private fun registerCliTask(
        project: Project,
        extension: AtlasKotlinExtension,
        name: String,
        command: String,
        manifestTask: org.gradle.api.tasks.TaskProvider<AtlasGenerateWorkspaceManifestTask>
    ): org.gradle.api.tasks.TaskProvider<Exec> {
        return project.tasks.register(name, Exec::class.java) {
            it.group = "atlas"
            it.description = "Runs Atlas $command with the generated Kotlin workspace manifest."
            it.dependsOn(manifestTask)
            it.doFirst { task ->
                (task as Exec).commandLine(
                    extension.cliExecutable,
                    "--manifest",
                    project.layout.buildDirectory.file("atlas/models/atlas.manifest.yml").get().asFile.absolutePath,
                    command
                )
            }
        }
    }

    /** Registers the Electron viewer launch after the generated diagram data is current. */
    private fun registerViewerTask(
        project: Project,
        extension: AtlasKotlinExtension,
        generationTask: org.gradle.api.tasks.TaskProvider<Exec>
    ) {
        project.tasks.register("atlasView", Exec::class.java) {
            it.group = "atlas"
            it.description = "Opens the generated Atlas diagrams in the Electron desktop application."
            it.dependsOn(generationTask)
            it.doFirst { task ->
                (task as Exec).commandLine(
                    extension.viewerExecutable,
                    "view",
                    "--config", project.file("atlas.config.yml").absolutePath,
                    "--workspace", project.projectDir.absolutePath,
                    "--manifest", project.layout.buildDirectory.file("atlas/models/atlas.manifest.yml").get().asFile.absolutePath
                )
            }
        }
    }

    /** Converts a Gradle project path into an unambiguous portable output-directory segment. */
    private fun modelDirectoryName(project: Project): String {
        return project.path.trim(':').replace(':', '_').ifEmpty { "root" }
    }

    /** Injects the companion processor into explicit KSP target configurations and supplies stable artifact options. */
    private fun configureKspProcessor(project: Project, extension: AtlasKotlinExtension) {
        project.configurations.configureEach { configuration ->
            if (configuration.name.startsWith("ksp") &&
                this.isSelectedKspConfiguration(configuration.name, extension)) {
                configuration.dependencies.add(
                    project.dependencies.create(extension.kspProcessorDependency)
                )
            }
        }
        project.afterEvaluate {
            val identity = GradleArtifactIdentityResolver(project, extension).resolve()
            project.extensions.findByName("ksp")?.let { kspExtension ->
                val argument = kspExtension.javaClass.methods.firstOrNull { method -> method.name == "arg" && method.parameterTypes.size == 2 }
                argument?.invoke(kspExtension, "atlas.artifactId", identity.id)
                argument?.invoke(kspExtension, "atlas.target", extension.artifactVariant ?: "jvm")
            }
        }
    }

    /** Applies extension target selection to KSP's target-specific configurations while excluding test configurations by default. */
    private fun isSelectedKspConfiguration(configurationName: String, extension: AtlasKotlinExtension): Boolean {
        if (!extension.includeTests && configurationName.endsWith("Test", ignoreCase = true)) {
            return false
        }
        val target = configurationName.removePrefix("ksp").ifBlank { "jvm" }
        val included = extension.includedTargets.any { pattern -> this.matchesTarget(pattern, target) }
        val excluded = extension.excludedTargets.any { pattern -> this.matchesTarget(pattern, target) }
        return included && !excluded
    }

    /** Matches one target label against a case-insensitive asterisk glob. */
    private fun matchesTarget(pattern: String, target: String): Boolean {
        val expression = pattern.split('*').joinToString(".*") { fragment -> Regex.escape(fragment) }
        return Regex("^$expression$", RegexOption.IGNORE_CASE).matches(target)
    }

    /** Resolves one transitive generator dependency without exposing that implementation type in this plugin API. */
    private fun runtimeLocation(className: String): java.net.URL {
        return Class.forName(className, false, AtlasKotlinPlugin::class.java.classLoader)
            .protectionDomain.codeSource.location
    }
}
