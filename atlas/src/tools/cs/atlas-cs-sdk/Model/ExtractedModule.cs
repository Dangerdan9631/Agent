namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Holds one unlinked module and the semantic target keys needed for workspace linking.
/// </summary>
/// <param name="Target">Owning target-specific project descriptor.</param>
/// <param name="Elements">Extracted portable declarations.</param>
/// <param name="Relationships">Semantic relationships awaiting workspace linking.</param>
public sealed record ExtractedModule(
    CSharpProjectTarget Target,
    IReadOnlyList<AtlasElement> Elements,
    IReadOnlyList<PendingRelationship> Relationships);
