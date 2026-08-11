using StarCruiseStudios.Atlas.Cs.Infrastructure;
using Xunit;

namespace StarCruiseStudios.Atlas.Cs.Tests;

/// <summary>
/// Verifies Atlas project and module glob matching.
/// </summary>
public sealed class GlobMatcherTests
{
    /// <summary>
    /// Confirms single and recursive wildcards retain path-separator semantics.
    /// </summary>
    [Fact]
    public void MatchesAtlasGlobSubset()
    {
        var matcher = new GlobMatcher();

        Assert.True(matcher.IsMatch("src/*", "src/domain"));
        Assert.False(matcher.IsMatch("src/*", "src/domain/generated"));
        Assert.True(matcher.IsMatch("Atlas.Example.*@*", "Atlas.Example.Domain@net8.0"));
        Assert.True(matcher.IsMatch("src/**", "src/domain/generated"));
    }
}
