using FluentValidation;
using Humanizer;

namespace Atlas.Example.Lib;

/// <summary>
/// Validates book titles and creates normalized reading-list items.
/// </summary>
public sealed class ReadingList
{
    private readonly IValidator<ReadingListRequest> validator;

    /// <summary>
    /// Initializes the reading-list service with its title validation policy.
    /// </summary>
    public ReadingList()
    {
        validator = new ReadingListRequestValidator();
    }

    /// <summary>
    /// Creates a validated item from a user-provided title.
    /// </summary>
    /// <param name="title">The non-empty book title to normalize.</param>
    /// <returns>The normalized reading-list item.</returns>
    public ReadingListItem Add(string title)
    {
        var request = new ReadingListRequest(title);
        validator.ValidateAndThrow(request);
        var normalizedTitle = request.Title.Trim().Transform(To.TitleCase);
        return new ReadingListItem(normalizedTitle, normalizedTitle.Kebaberize().ToLowerInvariant());
    }

    private sealed record ReadingListRequest(string Title);

    private sealed class ReadingListRequestValidator : AbstractValidator<ReadingListRequest>
    {
        public ReadingListRequestValidator()
        {
            RuleFor(request => request.Title).NotEmpty();
        }
    }
}
