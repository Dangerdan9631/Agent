using Atlas.Example.Domain.Catalog;

namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Persists and retrieves catalog items for application use cases.
/// </summary>
public interface CatalogRepository
{
    /// <summary>
    /// Saves one immutable catalog item.
    /// </summary>
    Task SaveAsync(CatalogItem item, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every persisted catalog item in deterministic order.
    /// </summary>
    Task<IReadOnlyList<CatalogItem>> ListAsync(CancellationToken cancellationToken);
}

