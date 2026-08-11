namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Discovers C# project paths contained by a supported solution document.
/// </summary>
public interface ISolutionProjectDiscoverer
{
    /// <summary>
    /// Returns stable absolute C# project paths from one solution.
    /// </summary>
    /// <param name="solutionPath">Absolute `.sln` or `.slnx` path.</param>
    /// <returns>Distinct project paths in deterministic order.</returns>
    Task<IReadOnlyList<string>> DiscoverAsync(string solutionPath);
}
