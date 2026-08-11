namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Imports validated seed items through the catalog repository port.
/// </summary>
public sealed class ImportCatalog
{
    private readonly CatalogSeedReader seedReader;
    private readonly CatalogRepository repository;
    private readonly CatalogClock clock;

    /// <summary>
    /// Creates the use case from its required application ports.
    /// </summary>
    public ImportCatalog(CatalogSeedReader seedReader, CatalogRepository repository, CatalogClock clock)
    {
        this.seedReader = seedReader;
        this.repository = repository;
        this.clock = clock;
    }

    /// <summary>
    /// Imports every seed item and returns the completed report.
    /// </summary>
    public async Task<CatalogImportReport> ExecuteAsync(CancellationToken cancellationToken)
    {
        var items = await this.seedReader.ReadAsync(cancellationToken).ConfigureAwait(false);
        foreach (var item in items)
        {
            await this.repository.SaveAsync(item, cancellationToken).ConfigureAwait(false);
        }

        return new CatalogImportReport(items.Count, this.clock.Current());
    }
}

