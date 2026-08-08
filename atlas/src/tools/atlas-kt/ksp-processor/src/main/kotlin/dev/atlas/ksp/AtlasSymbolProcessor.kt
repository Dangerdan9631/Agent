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
import com.google.devtools.ksp.symbol.KSTypeAlias
import com.google.devtools.ksp.symbol.KSTypeReference
import com.google.devtools.ksp.symbol.KSVisitorVoid
import com.google.devtools.ksp.symbol.Modifier

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
        val kind = when {
            classDeclaration.classKind.name == "INTERFACE" -> "interface"
            classDeclaration.classKind.name == "ENUM_CLASS" -> "enum"
            classDeclaration.classKind.name == "ANNOTATION_CLASS" -> "annotation"
            classDeclaration.classKind.name == "ENUM_ENTRY" -> "constant"
            else -> "class"
        }
        val superTypes = classDeclaration.superTypes.mapNotNull { type -> this.resolvedName(type) }.toList()
        val inherits = superTypes.filter { target ->
            val declaration = classDeclaration.superTypes.firstOrNull { type -> this.resolvedName(type) == target }
                ?.resolve()?.declaration as? KSClassDeclaration
            kind == "interface" || declaration?.classKind?.name != "INTERFACE"
        }
        val implements = if (kind == "interface") emptyList() else superTypes - inherits.toSet()
        record(
            classDeclaration,
            kind,
            traits = buildList {
                if (classDeclaration.classKind.name == "OBJECT") add("singleton")
                if (Modifier.DATA in classDeclaration.modifiers) add("data")
                if (Modifier.SEALED in classDeclaration.modifiers) add("sealed")
                if (Modifier.VALUE in classDeclaration.modifiers) add("value")
            },
            references = emptyList(),
            inherits = inherits,
            implements = implements
        )
        classDeclaration.declarations.forEach { declaration -> declaration.accept(this, Unit) }
    }

    /** Records a function declaration using its KSP signature as an overload discriminator. */
    override fun visitFunctionDeclaration(function: KSFunctionDeclaration, data: Unit) {
        val parameterTypes = function.parameters.mapNotNull { parameter -> this.resolvedName(parameter.type) }
        val returnType = function.returnType?.let { type -> this.resolvedName(type) }
        record(
            function,
            if (function.parentDeclaration == null) "function" else "method",
            "(${parameterTypes.joinToString(",")})${returnType?.let { value -> ":$value" }.orEmpty()}",
            traits = buildList {
                if (Modifier.SUSPEND in function.modifiers) add("suspend")
                if (Modifier.INLINE in function.modifiers) add("inline")
                if (Modifier.OPERATOR in function.modifiers) add("operator")
                if (Modifier.INFIX in function.modifiers) add("infix")
            },
            references = parameterTypes + listOfNotNull(returnType),
            inherits = emptyList(),
            implements = emptyList()
        )
    }

    /** Records a property declaration using the shared property declaration kind. */
    override fun visitPropertyDeclaration(property: KSPropertyDeclaration, data: Unit) {
        record(
            property,
            if (Modifier.CONST in property.modifiers) "constant" else "property",
            traits = buildList {
                if (property.isMutable) add("mutable")
                if (Modifier.CONST in property.modifiers) add("const")
                if (Modifier.LATEINIT in property.modifiers) add("lateinit")
            },
            references = listOfNotNull(this.resolvedName(property.type)),
            inherits = emptyList(),
            implements = emptyList()
        )
    }

    /** Records a type alias and its resolved target relationship. */
    override fun visitTypeAlias(typeAlias: KSTypeAlias, data: Unit) {
        record(
            typeAlias,
            "type-alias",
            references = listOfNotNull(this.resolvedName(typeAlias.type)),
            inherits = emptyList(),
            implements = emptyList()
        )
    }

    /** Adds one schema-shaped declaration from a KSP semantic symbol. */
    private fun record(
        declaration: KSDeclaration,
        kind: String,
        signature: String? = null,
        traits: List<String> = emptyList(),
        references: List<String>? = null,
        inherits: List<String>? = null,
        implements: List<String>? = null
    ) {
        val qualifiedName = declaration.qualifiedName?.asString() ?: return
        val name = declaration.simpleName.asString()
        elements.add(
            AtlasKspElement(
                listOf(artifactId, kind, qualifiedName, signature.orEmpty()).joinToString("|"),
                name,
                kind,
                qualifiedName,
                signature,
                traits.distinct().sorted(),
                references?.distinct()?.sorted(),
                inherits?.distinct()?.sorted(),
                implements?.distinct()?.sorted()
            )
        )
    }

    private fun resolvedName(type: KSTypeReference): String? {
        return type.resolve().declaration.qualifiedName?.asString()
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
    val signature: String?,
    /** Stable semantic traits supplied by KSP. */
    val traits: List<String>,
    /** Resolved type references, or null for legacy/non-authoritative declarations. */
    val references: List<String>?,
    /** Resolved inherited types, or null when not supplied. */
    val inherits: List<String>?,
    /** Resolved implemented interfaces, or null when not supplied. */
    val implements: List<String>?
)
