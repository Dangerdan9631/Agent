using StarCruiseStudios.Atlas.Cs.Infrastructure;

namespace StarCruiseStudios.Atlas.Cs;

/// <summary>
/// Hosts the process entry point for the `atlas-cs` .NET tool.
/// </summary>
public static class Program
{
    /// <summary>
    /// Registers MSBuild and delegates the process invocation to the command application.
    /// </summary>
    /// <param name="arguments">Command-line arguments after the executable name.</param>
    /// <returns>A process-compatible completion status.</returns>
    public static async Task<int> Main(string[] arguments)
    {
        new MsBuildRegistrar().Register();
        var cli = new CompositionRoot(new RuntimeOutputWriter(Console.Out, Console.Error)).CreateCli();
        return await cli.RunAsync(arguments).ConfigureAwait(false);
    }
}

