using StarCruiseStudios.Atlas.Cs.Infrastructure;
using Xunit;

namespace StarCruiseStudios.Atlas.Cs.Tests;

/// <summary>
/// Verifies the dedicated C# command boundary and its process-compatible statuses.
/// </summary>
public sealed class AtlasCsCliTests
{
    /// <summary>
    /// Confirms help is successful without starting generation.
    /// </summary>
    [Fact]
    public async Task DisplaysHelpWithoutGenerating()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var cli = new CompositionRoot(new RuntimeOutputWriter(output, error)).CreateCli();

        var exitCode = await cli.RunAsync(["--help"]);

        Assert.Equal(0, exitCode);
        Assert.Contains("atlas-cs generate", output.ToString(), StringComparison.Ordinal);
        Assert.Equal(string.Empty, error.ToString());
    }

    /// <summary>
    /// Confirms unsupported commands report usage errors.
    /// </summary>
    [Fact]
    public async Task RejectsUnsupportedCommands()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var cli = new CompositionRoot(new RuntimeOutputWriter(output, error)).CreateCli();

        var exitCode = await cli.RunAsync(["diagram"]);

        Assert.Equal(2, exitCode);
        Assert.Contains("requires the 'generate' command", error.ToString(), StringComparison.Ordinal);
    }
}

