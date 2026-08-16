namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Retains a legacy public model location relative to its containing workspace manifest.
/// </summary>
/// <param name="ModuleId">Expected module ID inside the referenced document.</param>
/// <param name="ModelPath">Portable legacy manifest-relative model path.</param>
public sealed record AtlasWorkspaceManifestEntry(string ModuleId, string ModelPath);
