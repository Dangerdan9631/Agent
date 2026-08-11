using Atlas.Example.Application.Catalog;
using Atlas.Example.Domain.Catalog;
using Atlas.Example.Infrastructure.Catalog;

namespace Atlas.Example.App.Composition;

/// <summary>
/// Composes the executable catalog object graph at one explicit boundary.
/// </summary>
[CatalogFeature("catalog-demo")]
public sealed class CatalogApplication
{
    /// <summary>
    /// Creates the fully composed catalog demo.
    /// </summary>
    /// <returns>A ready-to-run catalog demo.</returns>
    public CatalogDemo CreateDemo()
    {
        var repository = new InMemoryCatalogRepository();
        var clock = new FixedCatalogClock(DateTimeOffset.Parse("2030-01-02T03:04:05Z"));
        var titlePolicy = new DefaultCatalogTitlePolicy();
        var seedReader = new JsonCatalogSeedReader(titlePolicy);
        return new CatalogDemo(
            new ImportCatalog(seedReader, repository, clock),
            new CatalogQueryService(repository),
            new ConsoleCatalogOutputWriter());
    }
}

