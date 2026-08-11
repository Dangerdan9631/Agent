namespace Atlas.Example.Lib;

/// <summary>
/// Represents a validated book title and its stable normalized slug.
/// </summary>
/// <param name="Title">The normalized display title.</param>
/// <param name="Slug">The lowercase, hyphen-delimited stable identifier.</param>
public sealed record ReadingListItem(string Title, string Slug);
