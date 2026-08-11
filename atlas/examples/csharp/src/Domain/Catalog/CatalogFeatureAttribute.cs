namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Marks a catalog type with one stable feature name.
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public sealed class CatalogFeatureAttribute : Attribute
{
    /// <summary>
    /// Creates a feature marker from a non-empty name.
    /// </summary>
    /// <param name="name">Stable feature name.</param>
    public CatalogFeatureAttribute(string name)
    {
        this.Name = name;
    }

    /// <summary>
    /// Gets the stable feature name.
    /// </summary>
    public string Name { get; }
}

