namespace Atlas.Example.Domain.Catalog;

/// <summary>
/// Defines catalog title normalization behavior.
/// </summary>
public interface CatalogTitlePolicy
{
    /// <summary>
    /// Normalizes one candidate catalog title.
    /// </summary>
    /// <param name="title">Candidate title to normalize.</param>
    /// <returns>A valid normalized catalog title.</returns>
    string Normalize(string title);
}

