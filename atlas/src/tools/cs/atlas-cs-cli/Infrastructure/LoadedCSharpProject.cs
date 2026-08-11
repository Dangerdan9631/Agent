using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Keeps an MSBuild workspace alive while SDK analysis consumes compiler documents.
/// </summary>
public sealed class LoadedCSharpProject : IDisposable
{
    private readonly MSBuildWorkspace workspace;

    /// <summary>
    /// Creates a loaded project from its owning workspace and compiler documents.
    /// </summary>
    /// <param name="workspace">Workspace that owns the project snapshot.</param>
    /// <param name="documents">Physical and generated documents selected for analysis.</param>
    public LoadedCSharpProject(MSBuildWorkspace workspace, IReadOnlyList<Document> documents)
    {
        this.workspace = workspace;
        this.Documents = documents;
    }

    /// <summary>
    /// Gets physical and generated documents while the workspace remains alive.
    /// </summary>
    public IReadOnlyList<Document> Documents { get; }

    /// <summary>
    /// Releases the MSBuild workspace and its build-host processes.
    /// </summary>
    public void Dispose()
    {
        this.workspace.Dispose();
    }
}
