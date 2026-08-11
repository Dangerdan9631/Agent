using Atlas.Example.Lib;
using FluentValidation;
using Spectre.Console;

namespace Atlas.Example.App;

/// <summary>
/// Validates command input, creates a reading-list item, and renders its fields.
/// </summary>
public sealed class ReadingListCommand
{
    private readonly ReadingList readingList;
    private readonly IValidator<ReadingListCommandRequest> validator;

    /// <summary>
    /// Initializes the command with the reading-list behavior it coordinates.
    /// </summary>
    /// <param name="readingList">The library service that creates items.</param>
    public ReadingListCommand(ReadingList readingList)
    {
        this.readingList = readingList;
        validator = new ReadingListCommandRequestValidator();
    }

    /// <summary>
    /// Runs the command for the supplied title.
    /// </summary>
    /// <param name="title">The non-empty title supplied at the command boundary.</param>
    public void Execute(string title)
    {
        var request = new ReadingListCommandRequest(title);
        validator.ValidateAndThrow(request);
        var item = readingList.Add(request.Title);
        AnsiConsole.Write(new Rule(item.Title));
        AnsiConsole.MarkupLine($"[grey]slug:[/] {Markup.Escape(item.Slug)}");
    }

    private sealed record ReadingListCommandRequest(string Title);

    private sealed class ReadingListCommandRequestValidator : AbstractValidator<ReadingListCommandRequest>
    {
        public ReadingListCommandRequestValidator()
        {
            RuleFor(request => request.Title).NotEmpty();
        }
    }
}
