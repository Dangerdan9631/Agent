using System.Text.Json;
using Json.Schema;

namespace StarCruiseStudios.Atlas.Cs.Configuration;

/// <summary>
/// Loads and schema-validates the canonical Atlas configuration document.
/// </summary>
public sealed class AtlasConfigurationLoader
{
    private readonly string schemaPath;

    /// <summary>
    /// Creates a loader using the packaged Atlas configuration schema.
    /// </summary>
    /// <param name="schemaPath">Path to the canonical configuration schema.</param>
    public AtlasConfigurationLoader(string schemaPath)
    {
        this.schemaPath = schemaPath;
    }

    /// <summary>
    /// Loads one configuration document and rejects schema-invalid input.
    /// </summary>
    /// <param name="configurationPath">Absolute path to the configuration document.</param>
    /// <returns>The validated C# generation configuration.</returns>
    public async Task<AtlasConfiguration> LoadAsync(string configurationPath)
    {
        var configurationText = await File.ReadAllTextAsync(configurationPath).ConfigureAwait(false);
        var schemaText = await File.ReadAllTextAsync(this.schemaPath).ConfigureAwait(false);
        var schema = JsonSchema.FromText(schemaText, new BuildOptions
        {
            SchemaRegistry = new SchemaRegistry()
        });
        using var document = JsonDocument.Parse(configurationText);
        var evaluation = schema.Evaluate(document.RootElement, new EvaluationOptions { OutputFormat = OutputFormat.List });
        if (!evaluation.IsValid)
        {
            var details = string.Join("; ", (evaluation.Details ?? [])
                .Where(detail => !detail.IsValid)
                .Select(detail => detail.InstanceLocation.ToString())
                .Distinct(StringComparer.Ordinal));
            throw new InvalidOperationException(
                $"Atlas configuration '{configurationPath}' does not satisfy schema version 1: {details}.");
        }

        return JsonSerializer.Deserialize<AtlasConfiguration>(configurationText, JsonOptions.Value)
            ?? throw new InvalidOperationException($"Atlas configuration '{configurationPath}' could not be loaded.");
    }

    private static class JsonOptions
    {
        internal static readonly JsonSerializerOptions Value = new()
        {
            PropertyNameCaseInsensitive = false,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
}
