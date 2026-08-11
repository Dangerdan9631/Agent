namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Captures resolved command options for one C# workspace generation.
/// </summary>
/// <param name="WorkspacePath">Optional workspace root path.</param>
/// <param name="ConfigurationPath">Optional configuration path relative to the workspace.</param>
/// <param name="OutputPath">Optional artifact-root override relative to the workspace.</param>
/// <param name="SolutionPath">Optional solution path relative to the workspace.</param>
/// <param name="Verbose">Whether detailed structured diagnostics are enabled.</param>
public sealed record GenerationRequest(
    string? WorkspacePath,
    string? ConfigurationPath,
    string? OutputPath,
    string? SolutionPath,
    bool Verbose);
