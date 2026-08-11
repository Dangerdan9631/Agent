namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Describes one deterministic language-neutral model produced from a C# project target.
/// </summary>
/// <param name="SchemaVersion">Portable module schema version; currently 1.</param>
/// <param name="GeneratorVersion">Stable generator contract version.</param>
/// <param name="Module">Identity of the modeled project target.</param>
/// <param name="SourceLanguage">Language discriminator; always `csharp`.</param>
/// <param name="Elements">Owned declarations sorted by stable ID.</param>
/// <param name="Relationships">Owned semantic relationships sorted by stable ID.</param>
public sealed record AtlasModuleModel(
    int SchemaVersion,
    string GeneratorVersion,
    AtlasArtifactIdentity Module,
    string SourceLanguage,
    IReadOnlyList<AtlasElement> Elements,
    IReadOnlyList<AtlasRelationship> Relationships);
