package dev.atlas.example.infrastructure.catalog

/**
 * Provides a deterministic seed document for the runnable catalog demonstration.
 */
const val DEFAULT_CATALOG_SEED = """
{
  "schemaVersion": 1,
  "items": [
    { "id": "atlas-guide", "title": "atlas architecture guide", "kind": "book", "contributor": "Avery Architect" },
    { "id": "dependency-lab", "title": "dependency mapping lab", "kind": "workshop", "contributor": "Casey Cartographer" }
  ]
}
"""
