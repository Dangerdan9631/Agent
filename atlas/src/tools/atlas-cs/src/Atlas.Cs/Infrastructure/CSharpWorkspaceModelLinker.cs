using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Resolves compiler-qualified relationship targets across selected target-specific modules.
/// </summary>
public sealed class CSharpWorkspaceModelLinker
{
    /// <summary>
    /// Links unambiguous local and cross-project targets into portable module models.
    /// </summary>
    /// <param name="modules">All extracted target-specific modules.</param>
    /// <returns>Schema-compatible models in stable module-ID order.</returns>
    public IReadOnlyList<AtlasModuleModel> Link(IReadOnlyList<ExtractedModule> modules)
    {
        var index = modules
            .SelectMany(module => module.Elements.Select(element => new TargetCandidate(module.Target, element)))
            .GroupBy(candidate => this.Key(candidate.Element.QualifiedName, candidate.Element.Signature), StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.ToArray(), StringComparer.Ordinal);
        return modules.OrderBy(module => module.Target.Identity.Id, StringComparer.Ordinal)
            .Select(module => this.LinkModule(module, index))
            .ToArray();
    }

    private AtlasModuleModel LinkModule(
        ExtractedModule module,
        IReadOnlyDictionary<string, TargetCandidate[]> index)
    {
        var identity = new CSharpModelIdentity(module.Target.Identity.Id);
        var relationships = module.Relationships.Select(pending =>
        {
            var candidates = index.GetValueOrDefault(this.Key(pending.TargetQualifiedName, pending.TargetSignature)) ?? [];
            var target = this.ResolveTarget(module.Target, candidates, pending.TargetLabel ?? pending.TargetQualifiedName);
            var targetIdentity = string.Join('\0', target.ModuleId ?? string.Empty, target.ElementId ?? string.Empty, target.Label ?? string.Empty);
            return new AtlasRelationship(
                identity.RelationshipId(pending.SourceElementId, pending.Kind, targetIdentity),
                pending.SourceElementId,
                pending.Kind,
                target);
        })
            .Where(relationship => relationship.Target.ModuleId is not null
                || relationship.Target.ElementId != relationship.SourceElementId)
            .DistinctBy(relationship => relationship.Id, StringComparer.Ordinal)
            .OrderBy(relationship => relationship.Id, StringComparer.Ordinal)
            .ToArray();
        return new AtlasModuleModel(
            1,
            "atlas-cs-1",
            module.Target.Identity,
            "csharp",
            module.Elements.OrderBy(element => element.Id, StringComparer.Ordinal).ToArray(),
            relationships);
    }

    private AtlasRelationshipTarget ResolveTarget(
        CSharpProjectTarget source,
        IReadOnlyList<TargetCandidate> candidates,
        string label)
    {
        var local = candidates.Where(candidate => candidate.Target.Identity.Id == source.Identity.Id).ToArray();
        if (local.Length == 1)
        {
            return new AtlasRelationshipTarget(ElementId: local[0].Element.Id);
        }

        var sameFramework = candidates.Where(candidate => candidate.Target.TargetFramework == source.TargetFramework).ToArray();
        if (sameFramework.Length == 1)
        {
            return new AtlasRelationshipTarget(sameFramework[0].Target.Identity.Id, sameFramework[0].Element.Id, label);
        }

        if (candidates.Count == 1)
        {
            return new AtlasRelationshipTarget(candidates[0].Target.Identity.Id, candidates[0].Element.Id, label);
        }

        return new AtlasRelationshipTarget(Label: label);
    }

    private string Key(string qualifiedName, string? signature) => $"{qualifiedName}\0{signature ?? string.Empty}";

    private sealed record TargetCandidate(CSharpProjectTarget Target, AtlasElement Element);
}
