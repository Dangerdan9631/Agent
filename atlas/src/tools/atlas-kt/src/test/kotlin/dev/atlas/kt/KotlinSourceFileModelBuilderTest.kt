package dev.atlas.kt

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/** Exercises portable source extraction over Kotlin's full declaration hierarchy. */
class KotlinSourceFileModelBuilderTest {
    /** Keeps cross-module relationship identities unique at declaration granularity. */
    @Test
    fun distinguishesTargetsWithinOneExternalModule() {
        val identity = KotlinModelIdentity("sample:application:1")
        val first = identity.relationshipId(
            "source",
            "references",
            KotlinAtlasRelationshipTarget("sample:domain:1", "first", "sample.First")
        )
        val second = identity.relationshipId(
            "source",
            "references",
            KotlinAtlasRelationshipTarget("sample:domain:1", "second", "sample.Second")
        )

        assertNotEquals(first, second)
    }

    /** Verifies declaration kinds, parents, signatures, traits, and local semantic targets. */
    @Test
    fun extractsNestedDeclarationsAndSemanticRelationships() {
        val model = KotlinSourceFileModelBuilder("sample:domain:1", "src/main/kotlin/sample/Domain.kt").build(
            """package sample

import external.Remote

interface Contract
open class Base
annotation class Marker
typealias Label = String

enum class Status { READY }

object Registry {
    const val NAME: String = "atlas"

    class Nested(val contract: Contract) : Base(), Contract {
        var count: Int = 0
        fun load(input: Label): Status = Status.READY
    }
}

fun top(value: Contract): Registry.Nested = Registry.Nested(value)
val remote: Remote? = null
"""
        )

        val byName = model.elements.groupBy { element -> element.qualifiedName }
        val namespace = byName.getValue("sample").single()
        val sourceUnit = byName.getValue("src/main/kotlin/sample/Domain.kt").single()
        val registry = byName.getValue("sample.Registry").single()
        val nested = byName.getValue("sample.Registry.Nested").single()
        val contractProperty = byName.getValue("sample.Registry.Nested.contract").single()
        val load = byName.getValue("sample.Registry.Nested.load").single()

        assertEquals("namespace", namespace.kind)
        assertEquals(namespace.id, sourceUnit.parentId)
        assertEquals("src/main/kotlin/sample/Domain.kt", sourceUnit.sourcePath)
        assertEquals(sourceUnit.id, registry.parentId)
        assertEquals(listOf("singleton"), registry.traits)
        assertEquals(registry.id, nested.parentId)
        assertEquals(nested.id, contractProperty.parentId)
        assertEquals("property", contractProperty.kind)
        assertEquals("method", load.kind)
        assertEquals("(Label):Status", load.signature)
        assertEquals("constant", byName.getValue("sample.Registry.NAME").single().kind)
        assertEquals("constant", byName.getValue("sample.Status.READY").single().kind)
        assertEquals("type-alias", byName.getValue("sample.Label").single().kind)
        assertEquals("function", byName.getValue("sample.top").single().kind)
        assertEquals("property", byName.getValue("sample.remote").single().kind)

        val base = byName.getValue("sample.Base").single()
        val contract = byName.getValue("sample.Contract").single()
        assertTrue(model.relationships.any { relationship ->
            relationship.sourceElementId == nested.id && relationship.kind == "inherits" &&
                relationship.target.elementId == base.id
        })
        assertTrue(model.relationships.any { relationship ->
            relationship.sourceElementId == nested.id && relationship.kind == "implements" &&
                relationship.target.elementId == contract.id
        })
        assertTrue(model.relationships.any { relationship ->
            relationship.sourceElementId == sourceUnit.id && relationship.kind == "imports" &&
                relationship.target.label == "external.Remote"
        })
        assertNotNull(model.relationships.singleOrNull { relationship ->
            relationship.sourceElementId == load.id && relationship.kind == "references" &&
                relationship.target.elementId == byName.getValue("sample.Status").single().id
        })
    }
}
