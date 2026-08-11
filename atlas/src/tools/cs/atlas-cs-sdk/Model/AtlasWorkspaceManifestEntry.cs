namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Locates one model relative to its containing workspace manifest.
/// </summary>
/// <param name="ModuleId">Expected module ID inside the referenced document.</param>
/// <param name="ModelPath">Portable manifest-relative model path.</param>
public sealed record AtlasWorkspaceManifestEntry(string ModuleId, string ModelPath);
