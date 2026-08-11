namespace StarCruiseStudios.Atlas.Cs.Model;

/// <summary>
/// Identifies one independently modeled C# project target.
/// </summary>
/// <param name="Id">Unique module ID in `PackageId@TargetFramework` form.</param>
/// <param name="DisplayName">Human-readable evaluated assembly name.</param>
/// <param name="Version">Evaluated project package version.</param>
/// <param name="Variant">Target framework that distinguishes this compilation.</param>
/// <param name="Category">Portable application or library category.</param>
public sealed record AtlasArtifactIdentity(
    string Id,
    string DisplayName,
    string Version,
    string Variant,
    string Category);
