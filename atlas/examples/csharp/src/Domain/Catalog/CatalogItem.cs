namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Defines the immutable state shared by all catalog item specializations.
/// </summary>
/// <param name="Id">Stable catalog identity.</param>
/// <param name="Title">Non-empty display title.</param>
public abstract record CatalogItem(CatalogItemId Id, string Title);
