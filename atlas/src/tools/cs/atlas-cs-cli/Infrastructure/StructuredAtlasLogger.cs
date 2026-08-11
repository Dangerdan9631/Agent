using System.Text.Json;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Writes optional structured diagnostics to the process error stream.
/// </summary>
public sealed class StructuredAtlasLogger : IAtlasLogger
{
    private readonly TextWriter errorWriter;
    private readonly bool verbose;

    /// <summary>
    /// Creates a logger for one command invocation.
    /// </summary>
    /// <param name="errorWriter">Destination reserved for diagnostics.</param>
    /// <param name="verbose">Whether informational events should be emitted.</param>
    public StructuredAtlasLogger(TextWriter errorWriter, bool verbose)
    {
        this.errorWriter = errorWriter;
        this.verbose = verbose;
    }

    /// <inheritdoc />
    public void Info(string message, IReadOnlyDictionary<string, object?> values)
    {
        if (!this.verbose)
        {
            return;
        }

        this.errorWriter.WriteLine(JsonSerializer.Serialize(new { level = "info", message, values }));
    }

    /// <inheritdoc />
    public void Error(string message)
    {
        this.errorWriter.WriteLine(JsonSerializer.Serialize(new { level = "error", message }));
    }
}

