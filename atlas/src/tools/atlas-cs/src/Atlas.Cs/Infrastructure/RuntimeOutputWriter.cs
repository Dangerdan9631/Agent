namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Writes designed command results to standard output and command errors to standard error.
/// </summary>
public sealed class RuntimeOutputWriter : IRuntimeOutputWriter
{
    private readonly TextWriter output;
    private readonly TextWriter error;

    /// <summary>
    /// Creates a process output adapter from explicit streams.
    /// </summary>
    /// <param name="output">Stream used for successful command results.</param>
    /// <param name="error">Stream used for user-actionable command errors.</param>
    public RuntimeOutputWriter(TextWriter output, TextWriter error)
    {
        this.output = output;
        this.error = error;
    }

    /// <inheritdoc />
    public void WriteLine(string message) => this.output.WriteLine(message);

    /// <inheritdoc />
    public void WriteError(string message) => this.error.WriteLine(message);
}

