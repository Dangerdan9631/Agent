using StarCruiseStudios.Atlas.Cs.Application;
using StarCruiseStudios.Atlas.Cs.Configuration;
using StarCruiseStudios.Atlas.Cs.Infrastructure;
using StarCruiseStudios.Atlas.Cs.Presentation;

namespace StarCruiseStudios.Atlas.Cs;

/// <summary>
/// Wires the C# generator runtime at the executable composition boundary.
/// </summary>
public sealed class CompositionRoot
{
    private readonly IRuntimeOutputWriter outputWriter;

    /// <summary>
    /// Creates composition using one user-facing output adapter.
    /// </summary>
    /// <param name="outputWriter">Dedicated command result boundary.</param>
    public CompositionRoot(IRuntimeOutputWriter outputWriter)
    {
        this.outputWriter = outputWriter;
    }

    /// <summary>
    /// Creates the configured command application.
    /// </summary>
    /// <returns>A command boundary with lazily selected logging verbosity.</returns>
    public AtlasCsCli CreateCli()
    {
        var schemaDirectory = Path.Combine(AppContext.BaseDirectory, "schemas");
        return new AtlasCsCli(verbose =>
        {
            var logger = new StructuredAtlasLogger(Console.Error, verbose);
            return new GenerateCSharpModels(
                new AtlasConfigurationLoader(Path.Combine(schemaDirectory, "atlas.schema.json")),
                new CSharpWorkspaceDiscoverer(
                    new SolutionProjectDiscoverer(),
                    new CSharpProjectEvaluator(),
                    new GlobMatcher(),
                    logger),
                new CSharpModuleExtractor(logger),
                new CSharpWorkspaceModelLinker(),
                new AtlasModelDocumentWriter(schemaDirectory),
                logger);
        }, this.outputWriter);
    }
}

