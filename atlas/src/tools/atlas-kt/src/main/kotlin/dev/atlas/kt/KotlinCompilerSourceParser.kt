package dev.atlas.kt

import org.jetbrains.kotlin.K1Deprecation
import org.jetbrains.kotlin.cli.common.messages.MessageCollector
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtDeclaration
import org.jetbrains.kotlin.psi.KtDelegatedSuperTypeEntry
import org.jetbrains.kotlin.psi.KtEnumEntry
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtObjectDeclaration
import org.jetbrains.kotlin.psi.KtParameter
import org.jetbrains.kotlin.psi.KtProperty
import org.jetbrains.kotlin.psi.KtPsiFactory
import org.jetbrains.kotlin.psi.KtSecondaryConstructor
import org.jetbrains.kotlin.psi.KtSuperTypeCallEntry
import org.jetbrains.kotlin.psi.KtTypeAlias
import org.jetbrains.kotlin.psi.KtTypeReference

/**
 * Converts Kotlin PSI into compiler-independent source facts for one document.
 */
class KotlinCompilerSourceParser {
    /**
     * Parses a Kotlin document without retaining PSI or compiler environment state.
     *
     * @param sourcePath Module-relative normalized source path.
     * @param sourceText Complete Kotlin source text.
     * @return Portable syntax facts for top-level and type-owned declarations.
     */
    @OptIn(CompilerConfiguration.Internals::class, K1Deprecation::class)
    fun parse(sourcePath: String, sourceText: String): KotlinSourceSyntax {
        val disposable = Disposer.newDisposable("atlas-kotlin-source-parser")
        return try {
            val configuration = CompilerConfiguration().apply {
                put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
            }
            val environment = KotlinCoreEnvironment.createForProduction(
                disposable,
                configuration,
                EnvironmentConfigFiles.JVM_CONFIG_FILES
            )
            val sourceFile = KtPsiFactory(environment.project, false)
                .createFile(sourcePath.substringAfterLast('/'), sourceText)
            val packageName = sourceFile.packageFqName.asString().ifBlank { null }
            val imports = sourceFile.importDirectives.mapNotNull { directive ->
                directive.importedFqName?.asString()?.let { target ->
                    KotlinSourceSyntax.Import(target, directive.aliasName, directive.isAllUnder)
                }
            }
            val declarations = sourceFile.declarations.flatMap { declaration ->
                this.declarations(declaration, packageName, null)
            }
            KotlinSourceSyntax(packageName, imports, declarations)
        } finally {
            Disposer.dispose(disposable)
        }
    }

    private fun declarations(
        declaration: KtDeclaration,
        packageName: String?,
        parentQualifiedName: String?
    ): List<KotlinSourceSyntax.Declaration> {
        return when (declaration) {
            is KtEnumEntry -> listOfNotNull(
                this.declaration(
                    declaration.name,
                    "constant",
                    packageName,
                    parentQualifiedName,
                    null,
                    listOf("enum-entry"),
                    emptyList(),
                    emptyList(),
                    emptySet()
                )
            )
            is KtClassOrObject -> this.classDeclarations(declaration, packageName, parentQualifiedName)
            is KtNamedFunction -> listOfNotNull(this.functionDeclaration(declaration, packageName, parentQualifiedName))
            is KtProperty -> listOfNotNull(this.propertyDeclaration(declaration, packageName, parentQualifiedName))
            is KtTypeAlias -> listOfNotNull(this.typeAliasDeclaration(declaration, packageName, parentQualifiedName))
            is KtSecondaryConstructor -> listOfNotNull(
                this.constructorDeclaration(declaration, packageName, parentQualifiedName)
            )
            else -> emptyList()
        }
    }

    private fun classDeclarations(
        declaration: KtClassOrObject,
        packageName: String?,
        parentQualifiedName: String?
    ): List<KotlinSourceSyntax.Declaration> {
        val name = declaration.name ?: if (declaration is KtObjectDeclaration && declaration.isCompanion()) {
            "Companion"
        } else {
            return emptyList()
        }
        val qualifiedName = this.qualifiedName(packageName, parentQualifiedName, name)
        val kind = this.classKind(declaration)
        val typeParameters = declaration.typeParameters.mapNotNull { parameter -> parameter.name }.toSet()
        val constructorTypes = declaration.primaryConstructorParameters.mapNotNull { parameter ->
            parameter.typeReference
        }
        val boundTypes = declaration.typeParameters.mapNotNull { parameter -> parameter.extendsBound } +
            declaration.typeConstraints.mapNotNull { constraint -> constraint.boundTypeReference }
        val superTypes = declaration.superTypeListEntries.mapNotNull { entry ->
            val typeName = entry.typeReference?.let { type -> this.typeNames(type).firstOrNull() }
                ?: return@mapNotNull null
            KotlinSourceSyntax.SuperType(typeName, this.superTypeKind(declaration, entry))
        }
        val own = KotlinSourceSyntax.Declaration(
            name,
            kind,
            qualifiedName,
            parentQualifiedName,
            null,
            this.classTraits(declaration),
            (constructorTypes + boundTypes).flatMap { type -> this.typeNames(type) }.distinct(),
            superTypes,
            typeParameters
        )
        val parameterProperties = declaration.primaryConstructorParameters
            .filter { parameter -> parameter.hasValOrVar() }
            .mapNotNull { parameter -> this.parameterProperty(parameter, packageName, qualifiedName) }
        val children = declaration.declarations.flatMap { child ->
            this.declarations(child, packageName, qualifiedName)
        }
        return listOf(own) + parameterProperties + children
    }

    private fun functionDeclaration(
        declaration: KtNamedFunction,
        packageName: String?,
        parentQualifiedName: String?
    ): KotlinSourceSyntax.Declaration? {
        val name = declaration.name ?: return null
        val signature = this.callableSignature(
            declaration.receiverTypeReference,
            declaration.valueParameters,
            declaration.typeReference
        )
        val references = listOfNotNull(declaration.receiverTypeReference, declaration.typeReference) +
            declaration.valueParameters.mapNotNull { parameter -> parameter.typeReference } +
            declaration.typeParameters.mapNotNull { parameter -> parameter.extendsBound } +
            declaration.typeConstraints.mapNotNull { constraint -> constraint.boundTypeReference }
        return this.declaration(
            name,
            if (parentQualifiedName == null) "function" else "method",
            packageName,
            parentQualifiedName,
            signature,
            this.callableTraits(declaration),
            references.flatMap { type -> this.typeNames(type) }.distinct(),
            emptyList(),
            declaration.typeParameters.mapNotNull { parameter -> parameter.name }.toSet()
        )
    }

    private fun propertyDeclaration(
        declaration: KtProperty,
        packageName: String?,
        parentQualifiedName: String?
    ): KotlinSourceSyntax.Declaration? {
        val name = declaration.name ?: return null
        val references = listOfNotNull(declaration.receiverTypeReference, declaration.typeReference)
            .flatMap { type -> this.typeNames(type) }
            .distinct()
        val traits = buildList {
            if (declaration.isVar) add("mutable")
            if (declaration.hasModifier(KtTokens.LATEINIT_KEYWORD)) add("lateinit")
            if (declaration.hasModifier(KtTokens.CONST_KEYWORD)) add("const")
        }
        return this.declaration(
            name,
            if (declaration.hasModifier(KtTokens.CONST_KEYWORD)) "constant" else "property",
            packageName,
            parentQualifiedName,
            declaration.receiverTypeReference?.text?.let { receiver -> this.normalizeType(receiver) },
            traits,
            references,
            emptyList(),
            emptySet()
        )
    }

    private fun parameterProperty(
        parameter: KtParameter,
        packageName: String?,
        parentQualifiedName: String
    ): KotlinSourceSyntax.Declaration? {
        val name = parameter.name ?: return null
        val traits = if (parameter.valOrVarKeyword?.text == "var") listOf("mutable") else emptyList()
        return this.declaration(
            name,
            "property",
            packageName,
            parentQualifiedName,
            null,
            traits,
            parameter.typeReference?.let { type -> this.typeNames(type) }.orEmpty(),
            emptyList(),
            emptySet()
        )
    }

    private fun typeAliasDeclaration(
        declaration: KtTypeAlias,
        packageName: String?,
        parentQualifiedName: String?
    ): KotlinSourceSyntax.Declaration? {
        val name = declaration.name ?: return null
        return this.declaration(
            name,
            "type-alias",
            packageName,
            parentQualifiedName,
            null,
            emptyList(),
            declaration.getTypeReference()?.let { type -> this.typeNames(type) }.orEmpty(),
            emptyList(),
            declaration.typeParameters.mapNotNull { parameter -> parameter.name }.toSet()
        )
    }

    private fun constructorDeclaration(
        declaration: KtSecondaryConstructor,
        packageName: String?,
        parentQualifiedName: String?
    ): KotlinSourceSyntax.Declaration? {
        val parent = parentQualifiedName ?: return null
        val signature = this.callableSignature(null, declaration.valueParameters, null)
        return KotlinSourceSyntax.Declaration(
            "<init>",
            "constructor",
            "$parent.<init>",
            parent,
            signature,
            emptyList(),
            declaration.valueParameters.mapNotNull { parameter -> parameter.typeReference }
                .flatMap { type -> this.typeNames(type) }
                .distinct(),
            emptyList(),
            emptySet()
        )
    }

    private fun declaration(
        name: String?,
        kind: String,
        packageName: String?,
        parentQualifiedName: String?,
        signature: String?,
        traits: List<String>,
        referencedTypes: List<String>,
        superTypes: List<KotlinSourceSyntax.SuperType>,
        typeParameters: Set<String>
    ): KotlinSourceSyntax.Declaration? {
        val declarationName = name ?: return null
        return KotlinSourceSyntax.Declaration(
            declarationName,
            kind,
            this.qualifiedName(packageName, parentQualifiedName, declarationName),
            parentQualifiedName,
            signature,
            traits.distinct().sorted(),
            referencedTypes,
            superTypes,
            typeParameters
        )
    }

    private fun classKind(declaration: KtClassOrObject): String {
        return when {
            declaration is KtObjectDeclaration -> "class"
            declaration is KtClass && declaration.isInterface() -> "interface"
            declaration is KtClass && declaration.isEnum() -> "enum"
            declaration is KtClass && declaration.isAnnotation() -> "annotation"
            else -> "class"
        }
    }

    private fun classTraits(declaration: KtClassOrObject): List<String> {
        return buildList {
            if (declaration is KtObjectDeclaration) add("singleton")
            if (declaration is KtObjectDeclaration && declaration.isCompanion()) add("companion")
            if (declaration.hasModifier(KtTokens.DATA_KEYWORD)) add("data")
            if (declaration.hasModifier(KtTokens.SEALED_KEYWORD)) add("sealed")
            if (declaration.hasModifier(KtTokens.VALUE_KEYWORD)) add("value")
            if (declaration.hasModifier(KtTokens.FUN_KEYWORD)) add("functional")
        }.sorted()
    }

    private fun callableTraits(declaration: KtNamedFunction): List<String> {
        return buildList {
            if (declaration.hasModifier(KtTokens.SUSPEND_KEYWORD)) add("suspend")
            if (declaration.hasModifier(KtTokens.INLINE_KEYWORD)) add("inline")
            if (declaration.hasModifier(KtTokens.OPERATOR_KEYWORD)) add("operator")
            if (declaration.hasModifier(KtTokens.INFIX_KEYWORD)) add("infix")
        }.sorted()
    }

    private fun superTypeKind(
        declaration: KtClassOrObject,
        entry: org.jetbrains.kotlin.psi.KtSuperTypeListEntry
    ): String {
        return when {
            declaration is KtClass && declaration.isInterface() -> "inherits"
            entry is KtSuperTypeCallEntry -> "inherits"
            entry is KtDelegatedSuperTypeEntry -> "implements"
            else -> "implements"
        }
    }

    private fun callableSignature(
        receiver: KtTypeReference?,
        parameters: List<KtParameter>,
        returnType: KtTypeReference?
    ): String {
        val receiverPrefix = receiver?.text?.let { value -> "${this.normalizeType(value)}." }.orEmpty()
        val parameterTypes = parameters.joinToString(",") { parameter ->
            parameter.typeReference?.text?.let { value -> this.normalizeType(value) } ?: "_"
        }
        val returnSuffix = returnType?.text?.let { value -> ":${this.normalizeType(value)}" }.orEmpty()
        return "$receiverPrefix($parameterTypes)$returnSuffix"
    }

    private fun typeNames(type: KtTypeReference): List<String> {
        return Regex("`[^`]+`(?:\\s*\\.\\s*`?[^`\\s<>,?()]+`?)*|[A-Za-z_][\\w]*(?:\\s*\\.\\s*[A-Za-z_][\\w]*)*")
            .findAll(type.text)
            .map { match -> match.value.replace(Regex("\\s*\\.\\s*"), ".").replace("`", "") }
            .filterNot { name -> name in TYPE_SYNTAX_WORDS }
            .distinct()
            .toList()
    }

    private fun normalizeType(value: String): String {
        return value.replace(Regex("\\s+"), "")
    }

    private fun qualifiedName(packageName: String?, parentQualifiedName: String?, name: String): String {
        return listOfNotNull(parentQualifiedName ?: packageName, name).joinToString(".")
    }

    private companion object {
        val TYPE_SYNTAX_WORDS = setOf("in", "out", "reified", "suspend", "dynamic")
    }
}
