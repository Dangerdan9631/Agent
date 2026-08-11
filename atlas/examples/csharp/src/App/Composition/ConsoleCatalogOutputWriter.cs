namespace Atlas.Example.App.Composition;

/// <summary>
/// Writes designed catalog output to the process standard output stream.
/// </summary>
public sealed class ConsoleCatalogOutputWriter : CatalogOutputWriter
{
    /// <inheritdoc />
    public void Write(string message) => Console.WriteLine(message);
}

