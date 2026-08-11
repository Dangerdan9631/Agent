using System.Text.Json;

namespace Atlas.Example.Verification;

/// <summary>
/// Verifies the complete persisted artifact contract produced by the C# example.
/// </summary>
public static class Program
{
    private static readonly string[] ExpectedScopes =
    [
        "folder:Atlas.Example.App@net8.0:Composition",
        "folder:Atlas.Example.Application@net8.0:Catalog",
        "folder:Atlas.Example.Infrastructure@net8.0:Catalog",
        "group:csharp-catalog-adapters",
        "group:csharp-catalog-core",
        "landscape",
        "package:Atlas.Example.App@net8.0",
        "package:Atlas.Example.Application@net8.0",
        "package:Atlas.Example.Domain@net8.0",
        "package:Atlas.Example.Infrastructure@net8.0"
    ];

    /// <summary>
    /// Validates models and diagrams under the supplied artifact root.
    /// </summary>
    /// <param name="arguments">One optional artifact-root path.</param>
    /// <returns>Zero when every artifact contract is correct.</returns>
    public static int Main(string[] arguments)
    {
        var artifactRoot = Path.GetFullPath(arguments.FirstOrDefault() ?? "architecture");
        var verifier = new ArtifactVerifier(artifactRoot);
        var count = verifier.Verify();
        Console.WriteLine($"Verified {count} generated C# diagram scopes and portable models.");
        return 0;
    }

    private sealed class ArtifactVerifier
    {
        private readonly string artifactRoot;

        internal ArtifactVerifier(string artifactRoot)
        {
            this.artifactRoot = artifactRoot;
        }

        internal int Verify()
        {
            this.VerifyModels();
            using var index = this.Read("atlas-diagrams.json");
            var diagrams = index.RootElement.GetProperty("diagrams").EnumerateArray().ToArray();
            var scopes = diagrams.Select(diagram => diagram.GetProperty("scope").GetString()).ToArray();
            this.Assert(scopes.SequenceEqual(ExpectedScopes), "diagram scopes differ from the C# example contract");
            foreach (var diagram in diagrams)
            {
                this.VerifyDiagram(diagram);
            }

            this.VerifyRepresentativeEdges(diagrams);
            return diagrams.Length;
        }

        private void VerifyModels()
        {
            using var manifest = this.Read("models/atlas-workspace.json");
            var entries = manifest.RootElement.GetProperty("modules").EnumerateArray().ToArray();
            this.Assert(entries.Length == 4, "manifest must contain four target-specific runtime modules");
            var kinds = new HashSet<string>(StringComparer.Ordinal);
            var relationshipKinds = new HashSet<string>(StringComparer.Ordinal);
            var foundGenerated = false;
            foreach (var entry in entries)
            {
                var relativePath = $"models/{entry.GetProperty("modelPath").GetString()}";
                using var model = this.Read(relativePath);
                this.Assert(model.RootElement.GetProperty("sourceLanguage").GetString() == "csharp", $"{relativePath} has incorrect source language");
                foreach (var element in model.RootElement.GetProperty("elements").EnumerateArray())
                {
                    kinds.Add(element.GetProperty("kind").GetString()!);
                    if (element.TryGetProperty("sourcePath", out var sourcePath))
                    {
                        var path = sourcePath.GetString()!;
                        this.Assert(!Path.IsPathRooted(path) && !path.Split('/').Contains("..", StringComparer.Ordinal), $"{relativePath} has a non-portable source path");
                        foundGenerated |= path.StartsWith("generated/", StringComparison.Ordinal);
                    }
                }

                foreach (var relationship in model.RootElement.GetProperty("relationships").EnumerateArray())
                {
                    relationshipKinds.Add(relationship.GetProperty("kind").GetString()!);
                }
            }

            foreach (var requiredKind in new[] { "annotation", "class", "constant", "constructor", "delegate", "enum", "interface", "method", "property", "record", "source-unit", "struct" })
            {
                this.Assert(kinds.Contains(requiredKind), $"portable models are missing C# declaration kind '{requiredKind}'");
            }

            foreach (var requiredKind in new[] { "calls", "contains", "implements", "imports", "inherits", "references" })
            {
                this.Assert(relationshipKinds.Contains(requiredKind), $"portable models are missing relationship kind '{requiredKind}'");
            }

            this.Assert(foundGenerated, "portable models do not include source-generator output");
        }

        private void VerifyDiagram(JsonElement diagram)
        {
            var scope = diagram.GetProperty("scope").GetString()!;
            using var graph = this.Read(diagram.GetProperty("graphPath").GetString()!);
            using var layout = this.Read(diagram.GetProperty("layoutPath").GetString()!);
            var nodes = graph.RootElement.GetProperty("elements").GetProperty("nodes").EnumerateArray().ToArray();
            var edges = graph.RootElement.GetProperty("elements").GetProperty("edges").EnumerateArray().ToArray();
            this.Assert(nodes.Length > 0, $"{scope} must contain nodes");
            var nodeIds = nodes.Select(node => node.GetProperty("data").GetProperty("id").GetString()!).ToArray();
            this.Assert(nodeIds.Distinct(StringComparer.Ordinal).Count() == nodeIds.Length, $"{scope} has duplicate node IDs");
            var knownNodes = nodeIds.ToHashSet(StringComparer.Ordinal);
            var edgeIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var edge in edges)
            {
                var data = edge.GetProperty("data");
                var id = data.GetProperty("id").GetString()!;
                this.Assert(edgeIds.Add(id), $"{scope} has duplicate edge IDs");
                this.Assert(knownNodes.Contains(data.GetProperty("source").GetString()!), $"{scope} has an unknown edge source");
                this.Assert(knownNodes.Contains(data.GetProperty("target").GetString()!), $"{scope} has an unknown edge target");
            }

            var leafIds = nodes
                .Where(node => !node.GetProperty("data").TryGetProperty("compound", out var compound) || !compound.GetBoolean())
                .Select(node => node.GetProperty("data").GetProperty("id").GetString()!)
                .ToHashSet(StringComparer.Ordinal);
            var positioned = layout.RootElement.GetProperty("positions").EnumerateArray()
                .Select(position => position.GetProperty("nodeId").GetString()!)
                .ToArray();
            this.Assert(positioned.ToHashSet(StringComparer.Ordinal).SetEquals(leafIds), $"{scope} layout does not cover every leaf node");
            var hidden = layout.RootElement.GetProperty("hiddenRelationshipIds").EnumerateArray().Select(value => value.GetString()!);
            this.Assert(hidden.All(edgeIds.Contains), $"{scope} layout hides an unknown relationship");
            foreach (var node in nodes.Where(node => node.GetProperty("data").TryGetProperty("sourcePath", out _)))
            {
                this.Assert(node.GetProperty("data").GetProperty("sourceLanguage").GetString() == "csharp", $"{scope} contains non-C# source metadata");
            }
        }

        private void VerifyRepresentativeEdges(IReadOnlyList<JsonElement> diagrams)
        {
            var landscape = diagrams.Single(diagram => diagram.GetProperty("scope").GetString() == "landscape");
            using var graph = this.Read(landscape.GetProperty("graphPath").GetString()!);
            this.AssertEdge(graph.RootElement, "InMemoryCatalogRepository", "CatalogRepository");
            this.AssertEdge(graph.RootElement, "CreateDemo", ".ctor");

            var domain = diagrams.Single(diagram => diagram.GetProperty("scope").GetString() == "package:Atlas.Example.Domain@net8.0");
            using var domainGraph = this.Read(domain.GetProperty("graphPath").GetString()!);
            this.AssertEdge(domainGraph.RootElement, "BookCatalogItem", "CatalogItem");
        }

        private void AssertEdge(JsonElement graph, string sourceLabel, string targetLabel)
        {
            var nodes = graph.GetProperty("elements").GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("data"))
                .Where(data => data.TryGetProperty("label", out _))
                .ToDictionary(data => data.GetProperty("id").GetString()!, data => data.GetProperty("label").GetString()!, StringComparer.Ordinal);
            var edges = graph.GetProperty("elements").GetProperty("edges").EnumerateArray().Select(edge => edge.GetProperty("data")).ToArray();
            var found = edges.Any(edge =>
                nodes.GetValueOrDefault(edge.GetProperty("source").GetString()!) == sourceLabel
                && nodes.GetValueOrDefault(edge.GetProperty("target").GetString()!) == targetLabel);
            this.Assert(found, $"diagram is missing representative edge {sourceLabel} -> {targetLabel}");
        }

        private JsonDocument Read(string relativePath)
        {
            var path = Path.GetFullPath(relativePath, this.artifactRoot);
            var relative = Path.GetRelativePath(this.artifactRoot, path);
            this.Assert(relative != ".." && !relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal), $"artifact path escapes output root: {relativePath}");
            this.Assert(File.Exists(path), $"artifact file does not exist: {relativePath}");
            return JsonDocument.Parse(File.ReadAllText(path));
        }

        private void Assert(bool condition, string message)
        {
            if (!condition)
            {
                throw new InvalidOperationException($"C# example verification failed: {message}.");
            }
        }
    }
}
