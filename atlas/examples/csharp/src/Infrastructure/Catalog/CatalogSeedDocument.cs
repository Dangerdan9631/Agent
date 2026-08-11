namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Represents the JSON seed payload consumed by the infrastructure adapter.
/// </summary>
/// <param name="SchemaVersion">Seed payload schema version.</param>
/// <param name="Items">Catalog item payloads to import.</param>
public sealed record CatalogSeedDocument(int SchemaVersion, IReadOnlyList<CatalogSeedItem> Items);
