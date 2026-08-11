namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Identifies an owned, cross-module, or unresolved relationship target.
/// </summary>
/// <param name="ModuleId">Optional module ID for cross-module targets.</param>
/// <param name="ElementId">Optional declaration ID for resolved targets.</param>
/// <param name="Label">Optional compiler-qualified fallback label.</param>
public sealed record AtlasRelationshipTarget(
    string? ModuleId = null,
    string? ElementId = null,
    string? Label = null);
