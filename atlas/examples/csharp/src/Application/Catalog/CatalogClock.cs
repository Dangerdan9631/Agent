namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Supplies application time without coupling use cases to the system clock.
/// </summary>
public interface CatalogClock
{
    /// <summary>
    /// Returns the current application timestamp.
    /// </summary>
    DateTimeOffset Current();
}

