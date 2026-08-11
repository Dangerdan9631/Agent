namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Normalizes catalog titles by trimming surrounding whitespace.
/// </summary>
public sealed class DefaultCatalogTitlePolicy : CatalogTitlePolicy
{
    /// <inheritdoc />
    public string Normalize(string title)
    {
        var normalized = title.Trim();
        return normalized.Length == 0
            ? throw new ArgumentException("Catalog titles must be non-empty.", nameof(title))
            : normalized;
    }
}

