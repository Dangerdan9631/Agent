package dev.atlas.example.domain.catalog

/**
 * Carries validated catalog seed data into the domain factory.
 *
 * @property id External identifier candidate.
 * @property title External title candidate.
 * @property kind Concrete item specialization.
 * @property contributor Author or facilitator display name.
 */
data class CatalogItemDraft(
    val id: String,
    val title: String,
    val kind: CatalogItemKind,
    val contributor: String
)
