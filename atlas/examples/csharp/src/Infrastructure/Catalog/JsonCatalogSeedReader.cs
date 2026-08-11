using System.Text.Json;
using Atlas.Example.Application.Catalog;
using Atlas.Example.Domain.Catalog;

namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Reads an embedded JSON seed through source-generated serializer metadata.
/// </summary>
public sealed class JsonCatalogSeedReader : CatalogSeedReader
{
    private const string Seed = """
        {
          "schemaVersion": 1,
          "items": [
            { "id": "book-1", "title": "Atlas Handbook", "kind": "book", "author": "Star Cruise Studios" },
            { "id": "workshop-1", "title": "Architecture Workshop", "kind": "workshop", "author": null }
          ]
        }
        """;
    private readonly CatalogTitlePolicy titlePolicy;

    /// <summary>
    /// Creates the adapter from the domain title policy it applies during mapping.
    /// </summary>
    public JsonCatalogSeedReader(CatalogTitlePolicy titlePolicy)
    {
        this.titlePolicy = titlePolicy;
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<CatalogItem>> ReadAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var document = JsonSerializer.Deserialize(Seed, CatalogJsonContext.Default.CatalogSeedDocument)
            ?? throw new InvalidOperationException("The catalog seed is empty.");
        if (document.SchemaVersion != CatalogSchema.Version)
        {
            throw new InvalidOperationException("The catalog seed schema version is unsupported.");
        }

        IReadOnlyList<CatalogItem> items = document.Items.Select(this.ToDomainItem).ToArray();
        return Task.FromResult(items);
    }

    private CatalogItem ToDomainItem(CatalogSeedItem item)
    {
        var id = new CatalogItemId(item.Id);
        var title = this.titlePolicy.Normalize(item.Title);
        return item.Kind switch
        {
            "book" => new BookCatalogItem(id, title, item.Author ?? "Unknown"),
            "workshop" => new WorkshopCatalogItem(id, title, DateTimeOffset.Parse("2030-01-02T03:04:05Z")),
            _ => throw new InvalidOperationException($"Unsupported catalog item kind '{item.Kind}'.")
        };
    }
}

