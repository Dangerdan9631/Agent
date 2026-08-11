using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Loads target-specific physical and generated documents through MSBuildWorkspace.
/// </summary>
public sealed class CSharpProjectLoader
{
    private readonly IAtlasLogger logger;

    /// <summary>
    /// Creates project loading with one diagnostic boundary.
    /// </summary>
    /// <param name="logger">Logger receiving workspace and compilation decisions.</param>
    public CSharpProjectLoader(IAtlasLogger logger)
    {
        this.logger = logger;
    }

    /// <summary>
    /// Loads and compiles the selected project target.
    /// </summary>
    /// <param name="target">Selected target-specific project descriptor.</param>
    /// <returns>Loaded documents and their live owning workspace.</returns>
    public async Task<LoadedCSharpProject> LoadAsync(CSharpProjectTarget target)
    {
        var workspace = MSBuildWorkspace.Create(new Dictionary<string, string>
        {
            ["TargetFramework"] = target.TargetFramework,
            ["DesignTimeBuild"] = "true",
            ["SkipCompilerExecution"] = "false"
        });
        var workspaceFailures = new List<string>();
        workspace.RegisterWorkspaceFailedHandler(eventArgs => workspaceFailures.Add(eventArgs.Diagnostic.Message));
        try
        {
            var project = await workspace.OpenProjectAsync(target.ProjectPath).ConfigureAwait(false);
            if (project.Language != LanguageNames.CSharp)
            {
                throw new InvalidOperationException($"Atlas C# cannot analyze non-C# project '{target.ProjectPath}'.");
            }

            var compilation = await project.GetCompilationAsync().ConfigureAwait(false)
                ?? throw new InvalidOperationException($"Atlas C# could not compile '{target.ProjectPath}'.");
            var errors = compilation.GetDiagnostics().Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error).ToArray();
            if (errors.Length > 0)
            {
                var detail = string.Join("; ", errors.Take(10).Select(diagnostic => diagnostic.ToString()));
                throw new InvalidOperationException($"Atlas C# compilation failed for '{target.Identity.Id}': {detail}");
            }

            this.logger.Info("Loaded C# compilation.", new Dictionary<string, object?>
            {
                ["module"] = target.Identity.Id,
                ["workspaceDiagnostics"] = workspaceFailures.ToArray()
            });
            var physical = project.Documents.Cast<Document>();
            var generated = (await project.GetSourceGeneratedDocumentsAsync().ConfigureAwait(false)).Cast<Document>();
            return new LoadedCSharpProject(workspace, physical.Concat(generated).ToArray());
        }
        catch
        {
            workspace.Dispose();
            throw;
        }
    }
}
