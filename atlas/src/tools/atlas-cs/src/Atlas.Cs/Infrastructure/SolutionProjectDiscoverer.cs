using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Reads C# project paths from supported solution documents through Roslyn's MSBuild workspace.
/// </summary>
public sealed class SolutionProjectDiscoverer
{
    /// <summary>
    /// Returns absolute C# project paths contained by a solution.
    /// </summary>
    /// <param name="solutionPath">Absolute `.sln` or `.slnx` path.</param>
    /// <returns>Distinct project paths sorted with ordinal semantics.</returns>
    public async Task<IReadOnlyList<string>> DiscoverAsync(string solutionPath)
    {
        using var workspace = MSBuildWorkspace.Create();
        var failures = new List<string>();
        workspace.RegisterWorkspaceFailedHandler(eventArgs => failures.Add(eventArgs.Diagnostic.Message));
        var solution = await workspace.OpenSolutionAsync(solutionPath).ConfigureAwait(false);
        var projects = solution.Projects
            .Where(project => project.Language == LanguageNames.CSharp && project.FilePath is not null)
            .Select(project => Path.GetFullPath(project.FilePath!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.Ordinal)
            .ToArray();
        if (projects.Length == 0)
        {
            var detail = failures.Count == 0 ? "no C# projects were found" : string.Join("; ", failures);
            throw new InvalidOperationException($"Atlas could not load C# projects from '{solutionPath}': {detail}.");
        }

        return projects;
    }
}
