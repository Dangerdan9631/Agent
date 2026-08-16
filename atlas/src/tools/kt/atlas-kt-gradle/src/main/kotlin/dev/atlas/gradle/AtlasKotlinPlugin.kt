package dev.atlas.gradle

import dev.atlas.kt.AtlasKotlinCliMain
import dev.atlas.kt.KotlinModelGenerationRequestParser
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment

/**
 * Registers only target models explicitly declared by the project applying the plugin.
 */
class AtlasKotlinPlugin : Plugin<Project> {
    /**
     * Creates the module-local extension without applying Atlas to subprojects or enumerating targets.
     *
     * @param project Gradle project that owns the configured models.
     */
    override fun apply(project: Project) {
        val extension = project.extensions.create("atlas", AtlasKotlinExtension::class.java)
        project.afterEvaluate {
            require(extension.rootDirectory.isPresent) { "Atlas Kotlin requires rootDirectory." }
            extension.models.forEach { model -> this.registerModel(project, model) }
        }
    }

    /** Registers one generation task from one explicit target configuration. */
    private fun registerModel(project: Project, model: AtlasKotlinModelConfiguration) {
        val target = model.target.orNull?.trim().orEmpty()
        val compilation = model.compilation.orNull?.trim().orEmpty()
        require(target.isNotEmpty() && '*' !in target && '?' !in target) {
            "Atlas Kotlin model '${model.name}' requires an exact target."
        }
        require(compilation.isNotEmpty() && '*' !in compilation && '?' !in compilation) {
            "Atlas Kotlin model '${model.name}' requires an exact compilation."
        }
        val identity = GradleArtifactIdentityResolver(project, target).resolve()
        val taskName = "atlasGenerate${model.name.replaceFirstChar { character -> character.uppercase() }}Model"
        val generationTask = project.tasks.register(taskName, AtlasGenerateModuleModelTask::class.java) { task ->
            task.group = "atlas"
            task.description = "Generates the '${model.name}' Kotlin target Atlas module model."
            task.generatorClasspath.from(this.generatorClasspath(project))
            task.generatorMainClass.set("dev.atlas.kt.AtlasKotlinCliMain")
            task.moduleId.set(identity.id)
            task.moduleName.set(identity.displayName)
            task.moduleVersion.set(identity.version)
            task.moduleVariant.set(identity.variant)
            task.moduleCategory.set(identity.category)
            task.sourceRoots.from(project.layout.projectDirectory.dir("src/$compilation/kotlin"))
            task.semanticFragmentFiles.from(model.semanticFragments)
            task.outputFile.set(
                extensionRoot(project).file("model/${this.modelFileName(project.name, target, compilation)}")
            )
        }
        val compilationTasks = project.tasks.matching { task -> this.belongsToCompilation(task.name, target, compilation) }
        generationTask.configure { task -> task.dependsOn(compilationTasks) }
        if (model.generateOnBuild.get()) {
            project.tasks.matching { task -> task.name == "build" }.configureEach { task -> task.dependsOn(generationTask) }
        }
    }

    /** Resolves the configured artifact root from the owning project's Atlas extension. */
    private fun extensionRoot(project: Project) =
        project.extensions.getByType(AtlasKotlinExtension::class.java).rootDirectory

    /** Derives one filesystem-safe model filename from the Gradle project and Kotlin target. */
    private fun modelFileName(projectName: String, target: String, compilation: String): String {
        val targetName = listOfNotNull(projectName, target, compilation.takeUnless { it == "main" })
            .joinToString("-")
        require(targetName.matches(Regex("[A-Za-z0-9._-]+"))) {
            "Atlas Kotlin build target '$targetName' cannot form a model filename."
        }
        return "$targetName.atlas.module.yml"
    }

    /** Selects compiler tasks belonging to the explicitly named target compilation. */
    private fun belongsToCompilation(taskName: String, target: String, compilation: String): Boolean {
        if (!taskName.startsWith("compile", ignoreCase = true) || !taskName.contains("Kotlin", ignoreCase = true)) return false
        if (target == "jvm" && compilation == "main" && taskName == "compileKotlin") return true
        return taskName.contains(target, ignoreCase = true) &&
            (compilation == "main" || taskName.contains(compilation, ignoreCase = true))
    }

    /** Builds the isolated standalone generator runtime classpath. */
    private fun generatorClasspath(project: Project): Any {
        return project.files(
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
    }

    /** Resolves one transitive generator dependency without exposing it in the extension API. */
    private fun runtimeLocation(className: String): java.net.URL {
        return Class.forName(className, false, AtlasKotlinPlugin::class.java.classLoader)
            .protectionDomain.codeSource.location
    }
}
