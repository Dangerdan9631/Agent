namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Represents a scheduled catalog workshop.
/// </summary>
/// <param name="Id">Stable catalog identity.</param>
/// <param name="Title">Non-empty display title.</param>
/// <param name="StartsAt">Scheduled workshop time with its offset.</param>
public sealed record WorkshopCatalogItem(CatalogItemId Id, string Title, DateTimeOffset StartsAt)
    : CatalogItem(Id, Title);
