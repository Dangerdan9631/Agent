namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Represents a cataloged book and its author.
/// </summary>
/// <param name="Id">Stable catalog identity.</param>
/// <param name="Title">Non-empty display title.</param>
/// <param name="Author">Non-empty author display name.</param>
public sealed record BookCatalogItem(CatalogItemId Id, string Title, string Author)
    : CatalogItem(Id, Title);
