namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Contains evaluated SDK project properties needed to create portable artifact identities.
/// </summary>
/// <param name="TargetFrameworks">Target framework collection for this evaluation.</param>
/// <param name="PackageId">Evaluated package ID or assembly-name fallback.</param>
/// <param name="AssemblyName">Evaluated assembly display name.</param>
/// <param name="Version">Evaluated package version or stable fallback.</param>
/// <param name="OutputType">Evaluated MSBuild output type.</param>
public sealed record CSharpProjectMetadata(
    IReadOnlyList<string> TargetFrameworks,
    string PackageId,
    string AssemblyName,
    string Version,
    string OutputType);
