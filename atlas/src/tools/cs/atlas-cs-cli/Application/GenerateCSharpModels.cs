using StarCruiseStudios.Atlas.Cs.Configuration;
using StarCruiseStudios.Atlas.Cs.Infrastructure;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Application;

/// <summary>
/// Coordinates configuration, C# discovery, semantic extraction, linking, and persistence.
/// </summary>
public sealed class GenerateCSharpModels
{
    private readonly AtlasConfigurationLoader configurationLoader;
    private readonly CSharpWorkspaceDiscoverer discoverer;
    private readonly ICSharpProjectEvaluator projectEvaluator;
    private readonly CSharpProjectLoader projectLoader;
    private readonly CSharpModuleExtractor extractor;
    private readonly CSharpWorkspaceModelLinker linker;
    private readonly AtlasModelDocumentWriter writer;
    private readonly IAtlasLogger logger;

    /// <summary>
    /// Creates the generation workflow from focused collaborators.
    /// </summary>
    public GenerateCSharpModels(
        AtlasConfigurationLoader configurationLoader,
        CSharpWorkspaceDiscoverer discoverer,
        ICSharpProjectEvaluator projectEvaluator,
        CSharpProjectLoader projectLoader,
        CSharpModuleExtractor extractor,
        CSharpWorkspaceModelLinker linker,
        AtlasModelDocumentWriter writer,
        IAtlasLogger logger)
    {
        this.configurationLoader = configurationLoader;
        this.discoverer = discoverer;
        this.projectEvaluator = projectEvaluator;
        this.projectLoader = projectLoader;
        this.extractor = extractor;
        this.linker = linker;
        this.writer = writer;
        this.logger = logger;
    }

    /// <summary>
    /// Generates every selected module model and returns their containing directory.
    /// </summary>
    /// <param name="request">Command paths and diagnostic preference.</param>
    /// <returns>Absolute path to the generated model directory or target-derived model file.</returns>
    public async Task<string> ExecuteAsync(GenerationRequest request)
    {
        if (request.ProjectPath is not null)
        {
            return await this.GenerateConfiguredProjectAsync(request).ConfigureAwait(false);
        }

        var workspacePath = Path.GetFullPath(request.WorkspacePath ?? Directory.GetCurrentDirectory());
        if (!Directory.Exists(workspacePath))
        {
            throw new InvalidOperationException($"Atlas C# workspace '{workspacePath}' is not a directory.");
        }

        var configurationPath = request.ConfigurationPath is null
            ? Path.Combine(workspacePath, "atlas.config.yml")
            : Path.GetFullPath(request.ConfigurationPath, workspacePath);
        if (!File.Exists(configurationPath))
        {
            throw new InvalidOperationException($"Atlas configuration '{configurationPath}' does not exist.");
        }

        var configuration = await this.configurationLoader.LoadAsync(configurationPath).ConfigureAwait(false);
        var targets = await this.discoverer.DiscoverAsync(workspacePath, request.SolutionPath, configuration).ConfigureAwait(false);
        var extracted = new List<ExtractedModule>();
        foreach (var target in targets)
        {
            using var loadedProject = await this.projectLoader.LoadAsync(target).ConfigureAwait(false);
            extracted.Add(await this.extractor.ExtractAsync(target, loadedProject.Documents).ConfigureAwait(false));
        }

        var models = this.linker.Link(extracted);
        var configuredOutput = configuration.Artifacts?.Root ?? "architecture";
        var artifactRoot = Path.GetFullPath(request.OutputPath ?? configuredOutput, workspacePath);
        this.logger.Info("Writing C# Atlas models.", new Dictionary<string, object?>
        {
            ["workspace"] = workspacePath,
            ["configuration"] = configurationPath,
            ["output"] = artifactRoot,
            ["modules"] = models.Select(model => model.Module.Id).ToArray()
        });
        return await this.writer.WriteAsync(Path.Combine(artifactRoot, "model"), models).ConfigureAwait(false);
    }

    private async Task<string> GenerateConfiguredProjectAsync(GenerationRequest request)
    {
        if (request.TargetFramework is null || request.OutputPath is null)
        {
            throw new ArgumentException("Module-local C# generation requires --project, --target-framework, and --output.");
        }

        var projectPath = Path.GetFullPath(request.ProjectPath!);
        if (!File.Exists(projectPath))
        {
            throw new ArgumentException($"C# project '{projectPath}' does not exist.");
        }

        var metadata = this.projectEvaluator.Evaluate(projectPath)
            .SingleOrDefault(value => value.TargetFrameworks.Single() == request.TargetFramework)
            ?? throw new ArgumentException($"C# project '{projectPath}' does not define target '{request.TargetFramework}'.");
        var projectRoot = Path.GetDirectoryName(projectPath)!;
        var category = metadata.OutputType is "Exe" or "WinExe" ? "dotnet-application" : "dotnet-library";
        var target = new CSharpProjectTarget(
            projectPath,
            projectRoot,
            ".",
            request.TargetFramework,
            new AtlasArtifactIdentity(
                $"{metadata.PackageId}@{request.TargetFramework}",
                metadata.PackageId,
                metadata.Version,
                request.TargetFramework,
                category),
            [projectRoot]);
        using var loadedProject = await this.projectLoader.LoadAsync(target).ConfigureAwait(false);
        var extracted = await this.extractor.ExtractAsync(target, loadedProject.Documents).ConfigureAwait(false);
        var model = this.linker.Link([extracted]).Single();
        var outputRoot = Path.GetFullPath(request.OutputPath, projectRoot);
        var targetName = $"{Path.GetFileNameWithoutExtension(projectPath)}-{request.TargetFramework}";
        if (targetName.Any(character => !char.IsAsciiLetterOrDigit(character) && character is not ('.' or '_' or '-')))
        {
            throw new ArgumentException($"C# build target '{targetName}' cannot form a model filename.");
        }
        var outputPath = Path.Combine(outputRoot, "model", $"{targetName}.atlas.module.yml");
        this.logger.Info("Writing configured C# Atlas module.", new Dictionary<string, object?>
        {
            ["module"] = target.Identity.Id,
            ["targetFramework"] = target.TargetFramework,
            ["output"] = outputPath
        });
        return await this.writer.WriteModelAsync(outputPath, model).ConfigureAwait(false);
    }
}
