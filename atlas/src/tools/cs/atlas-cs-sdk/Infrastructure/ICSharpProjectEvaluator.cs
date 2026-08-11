namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Evaluates target-specific identity metadata for one C# project file.
/// </summary>
public interface ICSharpProjectEvaluator
{
    /// <summary>
    /// Evaluates every declared target framework for one project.
    /// </summary>
    /// <param name="projectPath">Absolute C# project path.</param>
    /// <returns>Target-specific project metadata in stable framework order.</returns>
    IReadOnlyList<CSharpProjectMetadata> Evaluate(string projectPath);
}
