namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Retains a relationship target identity until all selected modules have been extracted.
/// </summary>
/// <param name="SourceElementId">ID of the owned source declaration.</param>
/// <param name="Kind">Portable relationship kind.</param>
/// <param name="TargetQualifiedName">Compiler-qualified target name.</param>
/// <param name="TargetSignature">Optional overload-disambiguating target signature.</param>
/// <param name="TargetLabel">Optional human-readable fallback label.</param>
public sealed record PendingRelationship(
    string SourceElementId,
    string Kind,
    string TargetQualifiedName,
    string? TargetSignature,
    string? TargetLabel);
