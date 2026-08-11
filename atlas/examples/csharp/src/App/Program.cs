using Atlas.Example.App.Composition;

namespace Atlas.Example.App;

/// <summary>
/// Hosts the C# example process entry point.
/// </summary>
public static class Program
{
    /// <summary>
    /// Runs the deterministic catalog example.
    /// </summary>
    public static async Task Main()
    {
        await new CatalogApplication().CreateDemo().RunAsync(CancellationToken.None).ConfigureAwait(false);
    }
}

