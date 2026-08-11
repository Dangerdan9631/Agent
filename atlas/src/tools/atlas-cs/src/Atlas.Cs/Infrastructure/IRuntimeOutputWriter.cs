namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Defines the dedicated user-facing process output contract for the C# tool.
/// </summary>
public interface IRuntimeOutputWriter
{
    /// <summary>
    /// Writes one successful user-facing result.
    /// </summary>
    /// <param name="message">Result text without a trailing newline requirement.</param>
    void WriteLine(string message);

    /// <summary>
    /// Writes one actionable command error.
    /// </summary>
    /// <param name="message">Error text without diagnostic metadata.</param>
    void WriteError(string message);
}

