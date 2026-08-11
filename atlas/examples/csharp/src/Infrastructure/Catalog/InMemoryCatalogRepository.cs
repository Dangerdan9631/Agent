using Atlas.Example.Application.Catalog;
using Atlas.Example.Domain.Catalog;

namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Stores catalog items in deterministic insertion order for the example runtime.
/// </summary>
public sealed class InMemoryCatalogRepository : CatalogRepository
{
    private readonly List<CatalogItem> items = [];

    /// <inheritdoc />
    public Task SaveAsync(CatalogItem item, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        this.items.Add(item);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<CatalogItem>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult<IReadOnlyList<CatalogItem>>(this.items.ToArray());
    }
}

