package dev.atlas.ksp

import com.google.devtools.ksp.processing.Dependencies
import com.google.devtools.ksp.processing.SymbolProcessor
import com.google.devtools.ksp.processing.SymbolProcessorEnvironment
import com.google.devtools.ksp.processing.Resolver
import com.google.devtools.ksp.symbol.KSAnnotated
import com.google.devtools.ksp.symbol.KSClassDeclaration
import com.google.devtools.ksp.symbol.KSDeclaration
import com.google.devtools.ksp.symbol.KSFunctionDeclaration
import com.google.devtools.ksp.symbol.KSPropertyDeclaration
import com.google.devtools.ksp.symbol.KSVisitorVoid

/**
 * Extracts a target-local portable declaration fragment from KSP's Kotlin semantic symbols.
 */
class AtlasSymbolProcessor(
    private val environment: SymbolProcessorEnvironment
) : SymbolProcessor {
    private var wroteFragment = false

    /**
     * Visits all source files once and writes a JSON fragment into KSP's generated-resources output.
     *
     * @param resolver Current-round symbol resolver. It is never retained beyond this call.
     * @return Symbols deferred to a later KSP round; Atlas defers none.
     */
    override fun process(resolver: Resolver): List<KSAnnotated> {
        if (wroteFragment) {
            return emptyList()
        }
        val artifactId = environment.options["atlas.artifactId"] ?: return emptyList()
        val target = environment.options["atlas.target"] ?: "jvm"
        val declarations = AtlasKspDeclarationVisitor(artifactId).visit(resolver)
        val output = environment.codeGenerator.createNewFileByPath(
            Dependencies(false, *resolver.getAllFiles().toList().toTypedArray()),
            "atlas/${target}.atlas-fragment",
            "json"
        )
        output.bufferedWriter().use { writer -> writer.write(AtlasKspFragmentDocument(artifactId, declarations).render()) }
        wroteFragment = true
        return emptyList()
    }
}

/**
 * Visits semantic KSP declarations and maps them to Atlas's language-neutral declaration kinds.
 */
class AtlasKspDeclarationVisitor(
    private val artifactId: String
) : KSVisitorVoid() {
    private val elements = mutableListOf<AtlasKspElement>()

    /** Returns a deterministic snapshot after visiting all source files in the current KSP compilation. */
    fun visit(resolver: Resolver): List<AtlasKspElement> {
        resolver.getAllFiles().sortedBy { file -> file.filePath }.forEach { file -> file.declarations.forEach { declaration -> declaration.accept(this, Unit) } }
        return elements.sortedBy { element -> element.id }
    }

    /** Records a class-like declaration and recursively visits its nested declarations. */
    override fun visitClassDeclaration(classDeclaration: KSClassDeclaration, data: Unit) {
        record(classDeclaration, when {
            classDeclaration.classKind.name == "INTERFACE" -> "interface"
            classDeclaration.classKind.name == "ENUM_CLASS" -> "enum"
            classDeclaration.classKind.name == "ANNOTATION_CLASS" -> "annotation"
            else -> "class"
        })
        classDeclaration.declarations.forEach { declaration -> declaration.accept(this, Unit) }
    }

    /** Records a function declaration using its KSP signature as an overload discriminator. */
    override fun visitFunctionDeclaration(function: KSFunctionDeclaration, data: Unit) {
        record(function, "function", function.parameters.joinToString(",") { parameter -> parameter.type.resolve().declaration.qualifiedName?.asString().orEmpty() })
    }

    /** Records a property declaration using the shared property declaration kind. */
    override fun visitPropertyDeclaration(property: KSPropertyDeclaration, data: Unit) {
        record(property, "property")
    }

    /** Adds one schema-shaped declaration from a KSP semantic symbol. */
    private fun record(declaration: KSDeclaration, kind: String, signature: String? = null) {
        val qualifiedName = declaration.qualifiedName?.asString() ?: return
        val name = declaration.simpleName.asString()
        elements.add(AtlasKspElement(listOf(artifactId, kind, qualifiedName, signature.orEmpty()).joinToString("|"), name, kind, qualifiedName, signature))
    }
}

/**
 * Represents one declaration fragment independently of KSP compiler objects.
 */
data class AtlasKspElement(
    /** Stable artifact-scoped declaration identity. */
    val id: String,
    /** Readable declaration name. */
    val name: String,
    /** Shared declaration-kind value. */
    val kind: String,
    /** Canonical Kotlin qualified identity. */
    val qualifiedName: String,
    /** Optional callable overload discriminator. */
    val signature: String?
)
