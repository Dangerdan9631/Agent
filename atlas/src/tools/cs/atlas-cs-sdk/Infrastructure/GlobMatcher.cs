using System.Text;
using System.Text.RegularExpressions;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Matches normalized workspace paths against the glob subset used by Atlas policy.
/// </summary>
public sealed class GlobMatcher
{
    /// <summary>
    /// Determines whether a normalized path matches a glob pattern.
    /// </summary>
    /// <param name="pattern">Atlas glob using slash separators and star wildcards.</param>
    /// <param name="path">Workspace-relative normalized path.</param>
    /// <returns><see langword="true"/> when the complete path matches.</returns>
    public bool IsMatch(string pattern, string path)
    {
        var expression = new StringBuilder("^");
        var normalized = pattern.Replace('\\', '/');
        for (var index = 0; index < normalized.Length; index++)
        {
            var character = normalized[index];
            if (character == '*' && index + 1 < normalized.Length && normalized[index + 1] == '*')
            {
                expression.Append(".*");
                index++;
            }
            else if (character == '*')
            {
                expression.Append("[^/]*");
            }
            else if (character == '?')
            {
                expression.Append("[^/]");
            }
            else
            {
                expression.Append(Regex.Escape(character.ToString()));
            }
        }

        expression.Append('$');
        return Regex.IsMatch(path.Replace('\\', '/'), expression.ToString(), RegexOptions.CultureInvariant);
    }
}

