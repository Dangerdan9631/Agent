using Atlas.Example.Application.Catalog;

namespace Atlas.Example.App.Composition;

/// <summary>
/// Runs the catalog import and renders one deterministic summary.
/// </summary>
public sealed class CatalogDemo
{
    private readonly ImportCatalog importCatalog;
    private readonly CatalogQueryService queryService;
    private readonly CatalogOutputWriter outputWriter;

    /// <summary>
    /// Creates the demo from application behavior and its output boundary.
    /// </summary>
    public CatalogDemo(
        ImportCatalog importCatalog,
        CatalogQueryService queryService,
        CatalogOutputWriter outputWriter)
    {
        this.importCatalog = importCatalog;
        this.queryService = queryService;
        this.outputWriter = outputWriter;
    }

    /// <summary>
    /// Executes the deterministic catalog scenario.
    /// </summary>
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        var report = await this.importCatalog.ExecuteAsync(cancellationToken).ConfigureAwait(false);
        var items = await this.queryService.ListAsync(cancellationToken).ConfigureAwait(false);
        this.outputWriter.Write($"Imported {report.ImportedCount} catalog items; repository contains {items.Count}.");
    }
}

