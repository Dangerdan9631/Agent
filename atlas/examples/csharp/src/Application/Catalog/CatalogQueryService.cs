using Atlas.Example.Domain.Catalog;

namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Provides read-only catalog queries through the repository port.
/// </summary>
public sealed class CatalogQueryService
{
    private readonly CatalogRepository repository;

    /// <summary>
    /// Creates catalog queries from one repository port.
    /// </summary>
    public CatalogQueryService(CatalogRepository repository)
    {
        this.repository = repository;
    }

    /// <summary>
    /// Returns all catalog items in repository order.
    /// </summary>
    public Task<IReadOnlyList<CatalogItem>> ListAsync(CancellationToken cancellationToken)
        => this.repository.ListAsync(cancellationToken);
}

