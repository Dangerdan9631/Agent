using Atlas.Example.Lib;

namespace Atlas.Example.App;

/// <summary>
/// Composes and starts the reading-list command-line application.
/// </summary>
public static class Program
{
    /// <summary>
    /// Executes the application with the title provided by the command line.
    /// </summary>
    /// <param name="args">Command-line arguments whose joined value forms the title.</param>
    public static void Main(string[] args)
    {
        var title = args.Length == 0 ? "Domain-Driven Design" : string.Join(' ', args);
        new ReadingListCommand(new ReadingList()).Execute(title);
    }
}
