using StarCruiseStudios.Atlas.Cs.Infrastructure;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Presentation;

/// <summary>
/// Parses the dedicated C# generator command and invokes one generation workflow.
/// </summary>
public sealed class AtlasCsCli
{
    private const string Usage = "Usage: atlas-cs generate [--workspace PATH] [--config PATH] [--output PATH] [--solution PATH] [--verbose]";
    private readonly Func<bool, StarCruiseStudios.Atlas.Cs.Application.GenerateCSharpModels> workflowFactory;
    private readonly IRuntimeOutputWriter outputWriter;

    /// <summary>
    /// Creates the command boundary from a workflow factory and output adapter.
    /// </summary>
    public AtlasCsCli(
        Func<bool, StarCruiseStudios.Atlas.Cs.Application.GenerateCSharpModels> workflowFactory,
        IRuntimeOutputWriter outputWriter)
    {
        this.workflowFactory = workflowFactory;
        this.outputWriter = outputWriter;
    }

    /// <summary>
    /// Executes one command and returns a process-compatible exit status.
    /// </summary>
    /// <param name="arguments">Arguments after the executable name.</param>
    /// <returns>Zero for success, one for generation failure, or two for invalid input.</returns>
    public async Task<int> RunAsync(IReadOnlyList<string> arguments)
    {
        if (arguments.Count == 1 && arguments[0] is "--help" or "-h")
        {
            this.outputWriter.WriteLine(Usage);
            return 0;
        }

        if (arguments.Count == 0 || arguments[0] != "generate")
        {
            this.outputWriter.WriteError("atlas-cs requires the 'generate' command.");
            this.outputWriter.WriteError(Usage);
            return 2;
        }

        try
        {
            var request = this.Parse(arguments.Skip(1).ToArray());
            var manifest = await this.workflowFactory(request.Verbose).ExecuteAsync(request).ConfigureAwait(false);
            this.outputWriter.WriteLine($"Generated Atlas workspace manifest at {manifest}.");
            return 0;
        }
        catch (ArgumentException error)
        {
            this.outputWriter.WriteError(error.Message);
            this.outputWriter.WriteError(Usage);
            return 2;
        }
        catch (Exception error)
        {
            this.outputWriter.WriteError($"atlas-cs generation failed: {error.Message}");
            return 1;
        }
    }

    private GenerationRequest Parse(IReadOnlyList<string> arguments)
    {
        string? workspace = null;
        string? configuration = null;
        string? output = null;
        string? solution = null;
        var verbose = false;
        for (var index = 0; index < arguments.Count; index++)
        {
            var option = arguments[index];
            if (option == "--verbose")
            {
                verbose = true;
                continue;
            }

            if (option is "--help" or "-h")
            {
                throw new ArgumentException(Usage);
            }

            if (option is not ("--workspace" or "--config" or "--output" or "--solution"))
            {
                throw new ArgumentException($"Unknown atlas-cs option '{option}'.");
            }

            if (++index >= arguments.Count || string.IsNullOrWhiteSpace(arguments[index]))
            {
                throw new ArgumentException($"atlas-cs option '{option}' requires a non-empty value.");
            }

            var value = arguments[index];
            switch (option)
            {
                case "--workspace": workspace = value; break;
                case "--config": configuration = value; break;
                case "--output": output = value; break;
                case "--solution": solution = value; break;
            }
        }

        return new GenerationRequest(workspace, configuration, output, solution, verbose);
    }
}

