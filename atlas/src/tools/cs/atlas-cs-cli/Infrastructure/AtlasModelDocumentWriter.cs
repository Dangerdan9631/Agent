using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Validates and writes deterministic Atlas module documents to derived model paths.
/// </summary>
public sealed class AtlasModelDocumentWriter
{
    private readonly JsonSchema moduleSchema;
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
    /// <param name="schemaDirectory">Directory containing the module schema.</param>
    /// <param name="documentSerializer">YAML document serialization boundary.</param>
    public AtlasModelDocumentWriter(string schemaDirectory, YamlDocumentSerializer documentSerializer)
    {
        this.documentSerializer = documentSerializer;
        var buildOptions = new BuildOptions { SchemaRegistry = new SchemaRegistry() };
        this.moduleSchema = JsonSchema.FromText(
            File.ReadAllText(Path.Combine(schemaDirectory, "atlas-module.schema.json")),
            buildOptions);
    }

    /// <summary>
    /// Writes all models and returns their containing directory.
    /// </summary>
    /// <param name="modelsDirectory">Destination directory reserved for generated models.</param>
    /// <param name="models">Linked portable module models.</param>
    /// <returns>Absolute path to the generated model directory.</returns>
    public async Task<string> WriteAsync(string modelsDirectory, IReadOnlyList<AtlasModuleModel> models)
    {
        Directory.CreateDirectory(modelsDirectory);
        foreach (var model in models.OrderBy(model => model.Module.Id, StringComparer.Ordinal))
        {
            var fileName = $"{Uri.EscapeDataString(model.Module.Id)}.atlas.module.yml";
            var document = this.ToVersionTwoDocument(model);
            var yaml = this.SerializeAndValidate(document, this.moduleSchema, $"module '{model.Module.Id}'");
            await File.WriteAllTextAsync(Path.Combine(modelsDirectory, fileName), yaml).ConfigureAwait(false);
        }
        return Path.GetFullPath(modelsDirectory);
    }

    /// <summary>
    /// Writes one module model to the target-derived output selected by the workflow.
    /// </summary>
    /// <param name="outputPath">Absolute or project-relative `.atlas.module.yml` destination.</param>
    /// <param name="model">One target-specific linked model.</param>
    /// <returns>Absolute generated model path.</returns>
    public async Task<string> WriteModelAsync(string outputPath, AtlasModuleModel model)
    {
        var absolutePath = Path.GetFullPath(outputPath);
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
        var document = this.ToVersionTwoDocument(model);
        var yaml = this.SerializeAndValidate(document, this.moduleSchema, $"module '{model.Module.Id}'");
        await File.WriteAllTextAsync(absolutePath, yaml).ConfigureAwait(false);
        return absolutePath;
    }

    /// <summary>
    /// Converts linked compiler facts into the closed version-two generated document.
    /// </summary>
    /// <param name="model">Linked C# model using SDK-internal compatibility values.</param>
    /// <returns>Schema-compatible deterministic mapping.</returns>
    private IReadOnlyDictionary<string, object> ToVersionTwoDocument(AtlasModuleModel model)
    {
        return new Dictionary<string, object>
        {
            ["schemaVersion"] = 2,
            ["generator"] = new Dictionary<string, object> { ["name"] = "atlas-cs", ["version"] = "0.1.0" },
            ["source"] = new Dictionary<string, object> { ["language"] = "csharp" },
            ["module"] = new Dictionary<string, object>
            {
                ["id"] = model.Module.Id,
                ["name"] = model.Module.DisplayName,
                ["version"] = model.Module.Version,
                ["variant"] = model.Module.Variant,
                ["category"] = model.Module.Category
            },
            ["elements"] = model.Elements.OrderBy(element => element.Id, StringComparer.Ordinal)
                .Select(this.ToVersionTwoElement).ToArray(),
            ["relationships"] = model.Relationships.OrderBy(relationship => relationship.Id, StringComparer.Ordinal)
                .Select(this.ToVersionTwoRelationship).ToArray()
        };
    }

    /// <summary>
    /// Converts one compiler element without persisting SDK compatibility fields.
    /// </summary>
    /// <param name="element">Extracted C# element.</param>
    /// <returns>Version-two element mapping.</returns>
    private IReadOnlyDictionary<string, object> ToVersionTwoElement(AtlasElement element)
    {
        var value = new Dictionary<string, object>
        {
            ["id"] = element.Id,
            ["kind"] = element.Kind,
            ["name"] = element.Name,
            ["qualifiedName"] = element.QualifiedName,
            ["visibility"] = "unknown"
        };
        if (element.ParentId is not null) value["parentId"] = element.ParentId;
        if (element.Traits is { Count: > 0 }) value["traits"] = element.Traits.Distinct(StringComparer.Ordinal).OrderBy(trait => trait, StringComparer.Ordinal).ToArray();
        if (element.Kind is "function" or "local-function" or "constructor" or "method")
        {
            var signature = new Dictionary<string, object>
            {
                ["typeParameters"] = Array.Empty<string>(),
                ["parameters"] = Array.Empty<string>()
            };
            if (element.Kind != "constructor") signature["returns"] = new Dictionary<string, object> { ["kind"] = "unknown" };
            value["signature"] = signature;
        }
        return value;
    }

    /// <summary>
    /// Converts one relationship and selects exactly one discriminated target shape.
    /// </summary>
    /// <param name="relationship">Linked C# semantic relationship.</param>
    /// <returns>Version-two relationship mapping.</returns>
    private IReadOnlyDictionary<string, object> ToVersionTwoRelationship(AtlasRelationship relationship)
    {
        return new Dictionary<string, object>
        {
            ["id"] = relationship.Id,
            ["sourceElementId"] = relationship.SourceElementId,
            ["kind"] = relationship.Kind,
            ["target"] = this.ToVersionTwoTarget(relationship.Target)
        };
    }

    /// <summary>
    /// Converts one linked target into an element, module, or external discriminator.
    /// </summary>
    /// <param name="target">SDK compatibility target.</param>
    /// <returns>Closed target mapping.</returns>
    private IReadOnlyDictionary<string, object> ToVersionTwoTarget(AtlasRelationshipTarget target)
    {
        if (target.ElementId is not null)
        {
            var element = new Dictionary<string, object> { ["type"] = "element", ["elementId"] = target.ElementId };
            if (target.ModuleId is not null) element["moduleId"] = target.ModuleId;
            return element;
        }
        if (target.ModuleId is not null)
        {
            return new Dictionary<string, object> { ["type"] = "module", ["moduleId"] = target.ModuleId };
        }
        var label = target.Label ?? throw new InvalidOperationException("Atlas C# relationship target has no identity.");
        return new Dictionary<string, object> { ["type"] = "external", ["id"] = label, ["name"] = label };
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
