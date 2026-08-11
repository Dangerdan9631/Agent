using Microsoft.Build.Evaluation;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Evaluates SDK project properties at the MSBuild-owning CLI boundary.
/// </summary>
public sealed class CSharpProjectEvaluator : ICSharpProjectEvaluator
{
    /// <summary>
    /// Evaluates target frameworks and identity properties for an SDK project.
    /// </summary>
    /// <param name="projectPath">Absolute project file path.</param>
    /// <returns>One metadata value for each target-specific evaluation.</returns>
    public IReadOnlyList<CSharpProjectMetadata> Evaluate(string projectPath)
    {
        using var collection = new ProjectCollection();
        var outer = collection.LoadProject(projectPath, new Dictionary<string, string>
        {
            ["DesignTimeBuild"] = "true",
            ["SkipCompilerExecution"] = "true"
        }, toolsVersion: null);
        var frameworks = this.TargetFrameworks(outer);
        collection.UnloadAllProjects();

        return frameworks.Select(framework => this.EvaluateTarget(collection, projectPath, framework)).ToArray();
    }

    private CSharpProjectMetadata EvaluateTarget(ProjectCollection collection, string projectPath, string framework)
    {
        var project = collection.LoadProject(projectPath, new Dictionary<string, string>
        {
            ["DesignTimeBuild"] = "true",
            ["SkipCompilerExecution"] = "true",
            ["TargetFramework"] = framework
        }, toolsVersion: null);
        var projectName = Path.GetFileNameWithoutExtension(projectPath);
        var assemblyName = this.Value(project, "AssemblyName", projectName);
        var packageId = this.Value(project, "PackageId", assemblyName);
        var version = this.Value(project, "PackageVersion", this.Value(project, "Version", "0.0.0"));
        var outputType = this.Value(project, "OutputType", "Library");
        collection.UnloadProject(project);
        return new CSharpProjectMetadata([framework], packageId, assemblyName, version, outputType);
    }

    private IReadOnlyList<string> TargetFrameworks(Project project)
    {
        var plural = project.GetPropertyValue("TargetFrameworks")
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (plural.Length > 0)
        {
            return plural.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
        }

        var single = project.GetPropertyValue("TargetFramework").Trim();
        if (single.Length == 0)
        {
            throw new InvalidOperationException($"C# project '{project.FullPath}' does not declare TargetFramework or TargetFrameworks.");
        }

        return [single];
    }

    private string Value(Project project, string propertyName, string fallback)
    {
        var value = project.GetPropertyValue(propertyName).Trim();
        return value.Length == 0 ? fallback : value;
    }
}
