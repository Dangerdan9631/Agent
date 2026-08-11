namespace Atlas.Example.App.Composition;

/// <summary>
/// Defines the app's single user-facing output boundary.
/// </summary>
public interface CatalogOutputWriter
{
    /// <summary>
    /// Writes one completed catalog result.
    /// </summary>
    void Write(string message);
}

