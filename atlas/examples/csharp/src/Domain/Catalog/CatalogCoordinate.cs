namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Represents a compact catalog display coordinate.
/// </summary>
public readonly struct CatalogCoordinate
{
    /// <summary>
    /// Creates a coordinate from zero-based row and column values.
    /// </summary>
    public CatalogCoordinate(int row, int column)
    {
        this.Row = row;
        this.Column = column;
    }

    /// <summary>
    /// Gets the zero-based row.
    /// </summary>
    public int Row { get; }

    /// <summary>
    /// Gets the zero-based column.
    /// </summary>
    public int Column { get; }
}

