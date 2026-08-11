namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Represents one JSON catalog item before domain mapping.
/// </summary>
/// <param name="Id">Raw stable identity value.</param>
/// <param name="Title">Raw display title.</param>
/// <param name="Kind">Supported item-kind discriminator.</param>
/// <param name="Author">Optional book author name.</param>
public sealed record CatalogSeedItem(string Id, string Title, string Kind, string? Author);
