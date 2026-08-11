namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Lists the portable module models selected for one generated C# workspace.
/// </summary>
/// <param name="SchemaVersion">Workspace manifest schema version; currently 1.</param>
/// <param name="Modules">Module entries sorted by module ID.</param>
public sealed record AtlasWorkspaceManifest(
    int SchemaVersion,
    IReadOnlyList<AtlasWorkspaceManifestEntry> Modules);
