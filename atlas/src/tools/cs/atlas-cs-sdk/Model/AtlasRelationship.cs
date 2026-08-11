namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Represents one semantic relationship sourced by an owned declaration.
/// </summary>
/// <param name="Id">Stable module-scoped relationship ID.</param>
/// <param name="SourceElementId">ID of an element owned by the source module.</param>
/// <param name="Kind">Portable relationship kind from the module schema.</param>
/// <param name="Target">Linked or unresolved target descriptor.</param>
public sealed record AtlasRelationship(
    string Id,
    string SourceElementId,
    string Kind,
    AtlasRelationshipTarget Target);
