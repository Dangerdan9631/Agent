using System.Security.Cryptography;
using System.Text;
using Microsoft.CodeAnalysis;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Produces safe project-relative paths for physical and source-generated C# documents.
/// </summary>
public sealed class CSharpDocumentPathResolver
{
    private readonly Dictionary<string, string> generatedOwners = new(StringComparer.Ordinal);

    /// <summary>
    /// Resolves a portable source path or excludes an ordinary document outside selected source roots.
    /// </summary>
    /// <param name="document">Roslyn document to normalize.</param>
    /// <param name="projectRoot">Owning project root.</param>
    /// <param name="sourceRoots">Selected physical source roots.</param>
    /// <returns>A normalized source descriptor, or <see langword="null"/> when excluded.</returns>
    public CSharpSourcePath? Resolve(Document document, string projectRoot, IReadOnlyList<string> sourceRoots)
    {
        if (document is SourceGeneratedDocument generated)
        {
            return new CSharpSourcePath(this.GeneratedPath(generated), true);
        }

        if (document.FilePath is null)
        {
            return null;
        }

        var fullPath = Path.GetFullPath(document.FilePath);
        if (!sourceRoots.Any(root => this.IsContained(root, fullPath)))
        {
            return null;
        }

        var relative = Path.GetRelativePath(projectRoot, fullPath).Replace('\\', '/');
        if (relative.Split('/').Any(segment => segment is "bin" or "obj"))
        {
            return null;
        }

        if (relative == ".." || relative.StartsWith("../", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"C# source '{fullPath}' escapes project root '{projectRoot}'.");
        }

        return new CSharpSourcePath(relative, false);
    }

    private string GeneratedPath(SourceGeneratedDocument document)
    {
        var components = document.Folders
            .Append(document.HintName)
            .Select(this.SafeSegment)
            .Where(segment => segment.Length > 0)
            .ToArray();
        var candidate = $"generated/{string.Join('/', components.Length == 0 ? [this.SafeSegment(document.Name)] : components)}";
        var owner = document.FilePath ?? document.Id.ToString();
        if (!this.generatedOwners.TryGetValue(candidate, out var existing))
        {
            this.generatedOwners[candidate] = owner;
            return candidate;
        }

        if (StringComparer.Ordinal.Equals(existing, owner))
        {
            return candidate;
        }

        var suffix = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(owner)))[..12].ToLowerInvariant();
        var extension = Path.GetExtension(candidate);
        var stem = extension.Length == 0 ? candidate : candidate[..^extension.Length];
        var resolved = $"{stem}-{suffix}{extension}";
        if (this.generatedOwners.ContainsKey(resolved))
        {
            throw new InvalidOperationException($"Generated C# document path '{candidate}' is not unique.");
        }

        this.generatedOwners[resolved] = owner;
        return resolved;
    }

    private string SafeSegment(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        return new string(value.Select(character => invalid.Contains(character) || character is '/' or '\\' ? '_' : character).ToArray());
    }

    private bool IsContained(string root, string path)
    {
        var relative = Path.GetRelativePath(root, path);
        return relative != ".." && !relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal);
    }
}
