namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Describes one normalized document path and whether its source was generated in memory.
/// </summary>
/// <param name="Path">Portable project-relative or generated document path.</param>
/// <param name="Generated">Whether Roslyn produced the document in memory.</param>
public sealed record CSharpSourcePath(string Path, bool Generated);
