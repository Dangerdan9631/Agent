namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Represents one declaration owned by an Atlas module.
/// </summary>
/// <param name="Id">Stable module-scoped declaration ID.</param>
/// <param name="Name">Short declaration label.</param>
/// <param name="Kind">Portable declaration kind from the module schema.</param>
/// <param name="QualifiedName">Compiler-qualified declaration name.</param>
/// <param name="Signature">Optional overload-disambiguating signature.</param>
/// <param name="ParentId">Optional ID of the owning declaration.</param>
/// <param name="SourcePath">Optional portable path relative to the project.</param>
/// <param name="Traits">Optional sorted semantic modifiers.</param>
public sealed record AtlasElement(
    string Id,
    string Name,
    string Kind,
    string QualifiedName,
    string? Signature = null,
    string? ParentId = null,
    string? SourcePath = null,
    IReadOnlyList<string>? Traits = null);
