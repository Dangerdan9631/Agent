using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Validates and writes deterministic Atlas module documents and their workspace manifest.
/// </summary>
public sealed class AtlasModelDocumentWriter
{
    private readonly JsonSchema moduleSchema;
    private readonly JsonSchema workspaceSchema;
    private readonly JsonSerializerOptions jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true
    };
    private readonly YamlDocumentSerializer documentSerializer;

    /// <summary>
    /// Creates a writer from canonical packaged schemas.
    /// </summary>
    /// <param name="schemaDirectory">Directory containing module and workspace schemas.</param>
    /// <param name="documentSerializer">YAML document serialization boundary.</param>
    public AtlasModelDocumentWriter(string schemaDirectory, YamlDocumentSerializer documentSerializer)
    {
        this.documentSerializer = documentSerializer;
        var buildOptions = new BuildOptions { SchemaRegistry = new SchemaRegistry() };
        this.moduleSchema = JsonSchema.FromText(
            File.ReadAllText(Path.Combine(schemaDirectory, "atlas-module.schema.json")),
            buildOptions);
        this.workspaceSchema = JsonSchema.FromText(
            File.ReadAllText(Path.Combine(schemaDirectory, "atlas-workspace.schema.json")),
            buildOptions);
    }

    /// <summary>
    /// Writes all models and returns the absolute workspace-manifest path.
    /// </summary>
    /// <param name="modelsDirectory">Destination directory reserved for generated models.</param>
    /// <param name="models">Linked portable module models.</param>
    /// <returns>Absolute path to `atlas.manifest.yml`.</returns>
    public async Task<string> WriteAsync(string modelsDirectory, IReadOnlyList<AtlasModuleModel> models)
    {
        Directory.CreateDirectory(modelsDirectory);
        var entries = new List<AtlasWorkspaceManifestEntry>();
        foreach (var model in models.OrderBy(model => model.Module.Id, StringComparer.Ordinal))
        {
            var fileName = $"{Uri.EscapeDataString(model.Module.Id)}.atlas.module.yml";
            var yaml = this.SerializeAndValidate(model, this.moduleSchema, $"module '{model.Module.Id}'");
            await File.WriteAllTextAsync(Path.Combine(modelsDirectory, fileName), yaml).ConfigureAwait(false);
            entries.Add(new AtlasWorkspaceManifestEntry(model.Module.Id, fileName));
        }

        var manifest = new AtlasWorkspaceManifest(1, entries);
        var manifestYaml = this.SerializeAndValidate(manifest, this.workspaceSchema, "workspace manifest");
        var manifestPath = Path.Combine(modelsDirectory, "atlas.manifest.yml");
        await File.WriteAllTextAsync(manifestPath, manifestYaml).ConfigureAwait(false);
        return Path.GetFullPath(manifestPath);
    }

    private string SerializeAndValidate<T>(T value, JsonSchema schema, string label)
    {
        var json = JsonSerializer.Serialize(value, this.jsonOptions) + Environment.NewLine;
        using var document = JsonDocument.Parse(json);
        var result = schema.Evaluate(document.RootElement, new EvaluationOptions { OutputFormat = OutputFormat.List });
        if (!result.IsValid)
        {
            var details = string.Join("; ", (result.Details ?? []).Where(detail => !detail.IsValid).Select(detail => detail.InstanceLocation.ToString()));
            throw new InvalidOperationException($"Atlas {label} failed schema validation: {details}.");
        }

        return this.documentSerializer.Serialize(value);
    }
}
