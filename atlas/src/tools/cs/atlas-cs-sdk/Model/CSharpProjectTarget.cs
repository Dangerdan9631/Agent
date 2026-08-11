namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Describes one selected SDK project evaluated for one target framework.
/// </summary>
/// <param name="ProjectPath">Absolute SDK project file path.</param>
/// <param name="ProjectRootPath">Absolute owning project directory.</param>
/// <param name="RelativeProjectPath">Portable workspace-relative project directory.</param>
/// <param name="TargetFramework">Evaluated target framework moniker.</param>
/// <param name="Identity">Portable target-specific artifact identity.</param>
/// <param name="SourceRoots">Absolute project-contained source roots.</param>
public sealed record CSharpProjectTarget(
    string ProjectPath,
    string ProjectRootPath,
    string RelativeProjectPath,
    string TargetFramework,
    AtlasArtifactIdentity Identity,
    IReadOnlyList<string> SourceRoots);
