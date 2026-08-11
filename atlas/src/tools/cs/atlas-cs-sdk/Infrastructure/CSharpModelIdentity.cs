using System.Net;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Creates deterministic artifact-scoped identities for C# declarations and relationships.
/// </summary>
public sealed class CSharpModelIdentity
{
    private readonly string moduleId;

    /// <summary>
    /// Creates identity generation for one target-specific module.
    /// </summary>
    /// <param name="moduleId">Stable module identity including its target framework.</param>
    public CSharpModelIdentity(string moduleId)
    {
        this.moduleId = moduleId;
    }

    /// <summary>
    /// Creates one stable declaration identity.
    /// </summary>
    /// <param name="kind">Portable declaration kind.</param>
    /// <param name="qualifiedName">Canonical C# declaration name.</param>
    /// <param name="signature">Optional overload discriminator.</param>
    /// <returns>An opaque deterministic element identity.</returns>
    public string ElementId(string kind, string qualifiedName, string? signature = null)
        => string.Join('|', this.moduleId, kind, qualifiedName, signature ?? string.Empty);

    /// <summary>
    /// Creates one stable relationship identity from an explicit portable target.
    /// </summary>
    /// <param name="sourceElementId">Owned relationship source.</param>
    /// <param name="kind">Portable relationship kind.</param>
    /// <param name="targetIdentity">Stable serialized target identity.</param>
    /// <returns>An opaque deterministic relationship identity.</returns>
    public string RelationshipId(string sourceElementId, string kind, string targetIdentity)
        => $"relationship:{WebUtility.UrlEncode(sourceElementId)}>{WebUtility.UrlEncode(targetIdentity)}:{kind}";
}

