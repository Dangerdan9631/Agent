using System.Text.Json.Serialization;

namespace StarCruiseStudios.Atlas.Cs.Configuration;

/// <summary>
/// Contains the generation policy read from the canonical Atlas configuration document.
/// </summary>
public sealed class AtlasConfiguration
{
    /// <summary>
    /// Gets the supported configuration schema version.
    /// </summary>
    public int SchemaVersion { get; init; }

    /// <summary>
    /// Gets package discovery and classification policy.
    /// </summary>
    public required DiscoveryConfiguration Discovery { get; init; }

    /// <summary>
    /// Gets optional artifact output policy.
    /// </summary>
    public ArtifactConfiguration? Artifacts { get; init; }

    /// <summary>
    /// Contains discovery options relevant to C# projects.
    /// </summary>
    public sealed class DiscoveryConfiguration
    {
        /// <summary>
        /// Gets optional project-directory glob patterns.
        /// </summary>
        public IReadOnlyList<string>? PackageGlobs { get; init; }

        /// <summary>
        /// Gets optional project-directory exclusion patterns.
        /// </summary>
        public IReadOnlyList<string>? ExcludePackageGlobs { get; init; }

        /// <summary>
        /// Gets source roots used when a matching package does not override them.
        /// </summary>
        public IReadOnlyList<string>? DefaultSourceRoots { get; init; }

        /// <summary>
        /// Gets the required explicit package policies.
        /// </summary>
        public required IReadOnlyList<PackagePolicy> Packages { get; init; }
    }

    /// <summary>
    /// Contains artifact-root configuration.
    /// </summary>
    public sealed class ArtifactConfiguration
    {
        /// <summary>
        /// Gets the workspace-relative artifact root.
        /// </summary>
        public string? Root { get; init; }
    }

    /// <summary>
    /// Classifies projects matching an identity or project path.
    /// </summary>
    public sealed class PackagePolicy
    {
        /// <summary>
        /// Gets the match conditions for this policy.
        /// </summary>
        public required PackageMatch Match { get; init; }

        /// <summary>
        /// Gets runtime or support classification.
        /// </summary>
        public required string Classification { get; init; }

        /// <summary>
        /// Gets optional project-local source roots.
        /// </summary>
        public IReadOnlyList<string>? SourceRoots { get; init; }
    }

    /// <summary>
    /// Matches one module identity, project path, or both.
    /// </summary>
    public sealed class PackageMatch
    {
        /// <summary>
        /// Gets an optional module-ID glob.
        /// </summary>
        public string? Name { get; init; }

        /// <summary>
        /// Gets an optional workspace-relative project-directory glob.
        /// </summary>
        public string? Path { get; init; }
    }

    /// <summary>
    /// Retains configuration sections interpreted only by the shared CLI.
    /// </summary>
    [JsonExtensionData]
    public IDictionary<string, System.Text.Json.JsonElement>? AdditionalProperties { get; init; }
}
