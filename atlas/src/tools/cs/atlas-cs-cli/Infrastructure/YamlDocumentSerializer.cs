using System.Text.Json;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Converts Atlas YAML documents to typed values and deterministic YAML text at filesystem boundaries.
/// </summary>
public sealed class YamlDocumentSerializer
{
    private readonly IDeserializer deserializer = new DeserializerBuilder()
        .WithAttemptingUnquotedStringTypeDeserialization()
        .Build();
    private readonly ISerializer serializer = new SerializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
        .Build();

    /// <summary>
    /// Deserializes one YAML document through its JSON-compatible object representation.
    /// </summary>
    /// <typeparam name="T">Typed Atlas document model.</typeparam>
    /// <param name="yaml">UTF-8 YAML document text.</param>
    /// <returns>The deserialized Atlas model.</returns>
    public T Deserialize<T>(string yaml)
    {
        var json = this.ToJson(yaml);
        return JsonSerializer.Deserialize<T>(json, JsonOptions.Value)
            ?? throw new InvalidOperationException("Atlas YAML document could not be deserialized.");
    }

    /// <summary>
    /// Converts one YAML document into JSON text for JSON Schema evaluation.
    /// </summary>
    /// <param name="yaml">UTF-8 YAML document text.</param>
    /// <returns>Equivalent JSON document text.</returns>
    public string ToJson(string yaml)
    {
        var value = this.deserializer.Deserialize<object?>(yaml);
        return JsonSerializer.Serialize(this.ToJsonCompatibleValue(value), JsonOptions.Value);
    }

    /// <summary>
    /// Serializes one typed Atlas value as deterministic camel-case YAML.
    /// </summary>
    /// <typeparam name="T">Typed Atlas document model.</typeparam>
    /// <param name="value">Model value to serialize.</param>
    /// <returns>YAML document text with a trailing newline.</returns>
    public string Serialize<T>(T value)
    {
        var yaml = this.serializer.Serialize(value);
        return yaml.EndsWith('\n') ? yaml : yaml + Environment.NewLine;
    }

    private object? ToJsonCompatibleValue(object? value)
    {
        return value switch
        {
            IDictionary<object, object> mapping => mapping.ToDictionary(
                entry => Convert.ToString(entry.Key, System.Globalization.CultureInfo.InvariantCulture)
                    ?? throw new InvalidOperationException("Atlas YAML mapping keys must be text."),
                entry => this.ToJsonCompatibleValue(entry.Value),
                StringComparer.Ordinal),
            IEnumerable<object> sequence => sequence.Select(this.ToJsonCompatibleValue).ToArray(),
            _ => value
        };
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
