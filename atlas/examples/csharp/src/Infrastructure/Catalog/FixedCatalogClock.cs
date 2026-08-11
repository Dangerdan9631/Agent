using Atlas.Example.Application.Catalog;

namespace Atlas.Example.Infrastructure.Catalog;

/// <summary>
/// Supplies one fixed timestamp so the example remains deterministic.
/// </summary>
public sealed class FixedCatalogClock : CatalogClock
{
    private readonly DateTimeOffset timestamp;

    /// <summary>
    /// Creates a clock from one immutable timestamp.
    /// </summary>
    public FixedCatalogClock(DateTimeOffset timestamp)
    {
        this.timestamp = timestamp;
    }

    /// <inheritdoc />
    public DateTimeOffset Current() => this.timestamp;
}

