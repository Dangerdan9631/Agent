using StarCruiseStudios.Atlas.Cs.Configuration;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Discovers selected SDK projects and expands them into target-framework-specific modules.
/// </summary>
public sealed class CSharpWorkspaceDiscoverer
{
    private readonly ISolutionProjectDiscoverer solutionDiscoverer;
    private readonly ICSharpProjectEvaluator evaluator;
    private readonly GlobMatcher globMatcher;
    private readonly IAtlasLogger logger;

    /// <summary>
    /// Creates discovery from solution, project-evaluation, matching, and logging collaborators.
    /// </summary>
    public CSharpWorkspaceDiscoverer(
        ISolutionProjectDiscoverer solutionDiscoverer,
        ICSharpProjectEvaluator evaluator,
        GlobMatcher globMatcher,
        IAtlasLogger logger)
    {
        this.solutionDiscoverer = solutionDiscoverer;
        this.evaluator = evaluator;
        this.globMatcher = globMatcher;
        this.logger = logger;
    }

    /// <summary>
    /// Discovers target-specific C# modules selected by Atlas policy.
    /// </summary>
    /// <param name="workspacePath">Canonical workspace root.</param>
    /// <param name="solutionOption">Optional solution path supplied by the command.</param>
    /// <param name="configuration">Validated Atlas configuration.</param>
    /// <returns>Selected module targets in stable module-ID order.</returns>
    public async Task<IReadOnlyList<CSharpProjectTarget>> DiscoverAsync(
        string workspacePath,
        string? solutionOption,
        AtlasConfiguration configuration)
    {
        var solutionPath = this.ResolveSolution(workspacePath, solutionOption);
        var candidates = solutionPath is null
            ? this.EnumerateProjects(workspacePath)
            : await this.solutionDiscoverer.DiscoverAsync(solutionPath).ConfigureAwait(false);
        var selectedProjects = candidates.Where(project => this.IsSelectedProject(workspacePath, project, configuration.Discovery)).ToArray();
        if (selectedProjects.Length == 0)
        {
            throw new InvalidOperationException("No SDK-style C# projects matched Atlas discovery policy.");
        }

        var targets = selectedProjects
            .SelectMany(project => this.ToTargets(workspacePath, project, configuration.Discovery))
            .OrderBy(target => target.Identity.Id, StringComparer.Ordinal)
            .ToArray();
        var duplicate = targets.GroupBy(target => target.Identity.Id, StringComparer.Ordinal).FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
        {
            throw new InvalidOperationException($"C# workspace contains duplicate module ID '{duplicate.Key}'.");
        }

        this.logger.Info("Discovered C# project targets.", new Dictionary<string, object?>
        {
            ["solution"] = solutionPath,
            ["modules"] = targets.Select(target => target.Identity.Id).ToArray()
        });
        return targets;
    }

    private string? ResolveSolution(string workspacePath, string? solutionOption)
    {
        if (solutionOption is not null)
        {
            var explicitPath = Path.GetFullPath(solutionOption, workspacePath);
            if (!File.Exists(explicitPath))
            {
                throw new InvalidOperationException($"Atlas C# solution '{explicitPath}' does not exist.");
            }

            return explicitPath;
        }

        var solutions = Directory.EnumerateFiles(workspacePath, "*.sln", SearchOption.TopDirectoryOnly)
            .Concat(Directory.EnumerateFiles(workspacePath, "*.slnx", SearchOption.TopDirectoryOnly))
            .Order(StringComparer.Ordinal)
            .ToArray();
        return solutions.Length switch
        {
            0 => null,
            1 => solutions[0],
            _ => throw new InvalidOperationException("Atlas found multiple root solutions; select one with --solution.")
        };
    }

    private IReadOnlyList<string> EnumerateProjects(string workspacePath)
    {
        return Directory.EnumerateFiles(workspacePath, "*.csproj", SearchOption.AllDirectories)
            .Where(path => !this.NormalizedRelative(workspacePath, path).Split('/').Any(segment => segment is "bin" or "obj"))
            .Order(StringComparer.Ordinal)
            .ToArray();
    }

    private bool IsSelectedProject(
        string workspacePath,
        string projectPath,
        AtlasConfiguration.DiscoveryConfiguration discovery)
    {
        var projectDirectory = Path.GetDirectoryName(projectPath)!;
        var relativeDirectory = this.NormalizedRelative(workspacePath, projectDirectory);
        var included = discovery.PackageGlobs is null
            || discovery.PackageGlobs.Any(pattern => this.globMatcher.IsMatch(pattern, relativeDirectory));
        var excluded = discovery.ExcludePackageGlobs?.Any(pattern => this.globMatcher.IsMatch(pattern, relativeDirectory)) == true;
        return included && !excluded;
    }

    private IEnumerable<CSharpProjectTarget> ToTargets(
        string workspacePath,
        string projectPath,
        AtlasConfiguration.DiscoveryConfiguration discovery)
    {
        var projectRoot = Path.GetDirectoryName(projectPath)!;
        var relativeRoot = this.NormalizedRelative(workspacePath, projectRoot);
        foreach (var metadata in this.evaluator.Evaluate(projectPath))
        {
            var framework = metadata.TargetFrameworks.Single();
            var moduleId = $"{metadata.PackageId}@{framework}";
            var policy = this.SelectPolicy(moduleId, relativeRoot, discovery.Packages);
            var configuredRoots = policy.SourceRoots ?? discovery.DefaultSourceRoots;
            var roots = configuredRoots is null
                ? new[] { projectRoot }
                : configuredRoots.Select(root => this.ResolveSourceRoot(projectRoot, root)).Order(StringComparer.Ordinal).ToArray();
            var category = metadata.OutputType is "Exe" or "WinExe" ? "dotnet-application" : "dotnet-library";
            yield return new CSharpProjectTarget(
                projectPath,
                projectRoot,
                relativeRoot,
                framework,
                new AtlasArtifactIdentity(moduleId, metadata.AssemblyName, metadata.Version, framework, category),
                roots);
        }
    }

    private AtlasConfiguration.PackagePolicy SelectPolicy(
        string moduleId,
        string relativeRoot,
        IReadOnlyList<AtlasConfiguration.PackagePolicy> policies)
    {
        var matches = policies.Where(policy =>
            (policy.Match.Name is null || this.globMatcher.IsMatch(policy.Match.Name, moduleId))
            && (policy.Match.Path is null || this.globMatcher.IsMatch(policy.Match.Path, relativeRoot))).ToArray();
        if (matches.Length != 1)
        {
            var reason = matches.Length == 0 ? "no" : "multiple";
            throw new InvalidOperationException($"C# module '{moduleId}' at '{relativeRoot}' has {reason} matching package policies.");
        }

        return matches[0];
    }

    private string ResolveSourceRoot(string projectRoot, string configuredRoot)
    {
        var path = Path.GetFullPath(configuredRoot, projectRoot);
        var relative = Path.GetRelativePath(projectRoot, path);
        if (relative == ".." || relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) || !Directory.Exists(path))
        {
            throw new InvalidOperationException($"C# source root '{configuredRoot}' is missing or escapes project '{projectRoot}'.");
        }

        return path;
    }

    private string NormalizedRelative(string root, string path)
    {
        var relative = Path.GetRelativePath(root, path).Replace('\\', '/');
        return relative.Length == 0 ? "." : relative;
    }
}
