namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Identifies one catalog item with a stable non-empty value.
/// </summary>
/// <param name="Value">Non-empty stable identifier value.</param>
public readonly record struct CatalogItemId(string Value);
