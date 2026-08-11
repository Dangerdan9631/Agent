namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Records diagnostic events without coupling application behavior to one logging adapter.
/// </summary>
public interface IAtlasLogger
{
    /// <summary>
    /// Records an informational decision and its structured values.
    /// </summary>
    /// <param name="message">Stable diagnostic message.</param>
    /// <param name="values">Structured values that explain the decision.</param>
    void Info(string message, IReadOnlyDictionary<string, object?> values);

    /// <summary>
    /// Records a failure at the application boundary.
    /// </summary>
    /// <param name="message">Human-readable failure summary.</param>
    void Error(string message);
}

