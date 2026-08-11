using Atlas.Example.Domain.Catalog;

namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Reads catalog items from an external seed representation.
/// </summary>
public interface CatalogSeedReader
{
    /// <summary>
    /// Returns validated catalog items from the configured seed.
    /// </summary>
    Task<IReadOnlyList<CatalogItem>> ReadAsync(CancellationToken cancellationToken);
}

