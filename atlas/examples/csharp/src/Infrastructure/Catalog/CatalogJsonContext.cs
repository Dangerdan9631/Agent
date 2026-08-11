using System.Text.Json.Serialization;

namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Defines compile-time JSON metadata for the catalog seed contract.
/// </summary>
[JsonSerializable(typeof(CatalogSeedDocument))]
public sealed partial class CatalogJsonContext : JsonSerializerContext;

