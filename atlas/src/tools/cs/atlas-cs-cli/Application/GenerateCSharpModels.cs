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
        CSharpProjectLoader projectLoader,
        CSharpModuleExtractor extractor,
        CSharpWorkspaceModelLinker linker,
        AtlasModelDocumentWriter writer,
        IAtlasLogger logger)
    {
        this.configurationLoader = configurationLoader;
        this.discoverer = discoverer;
        this.projectLoader = projectLoader;
        this.extractor = extractor;
        this.linker = linker;
        this.writer = writer;
        this.logger = logger;
    }

    /// <summary>
    /// Generates every selected module model and returns the absolute manifest path.
    /// </summary>
    /// <param name="request">Command paths and diagnostic preference.</param>
    /// <returns>Absolute path to the generated workspace manifest.</returns>
    public async Task<string> ExecuteAsync(GenerationRequest request)
    {
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
        return await this.writer.WriteAsync(Path.Combine(artifactRoot, "models"), models).ConfigureAwait(false);
    }
}
