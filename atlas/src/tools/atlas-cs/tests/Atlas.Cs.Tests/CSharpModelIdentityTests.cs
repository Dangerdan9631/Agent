using StarCruiseStudios.Atlas.Cs.Infrastructure;
using Xunit;

namespace StarCruiseStudios.Atlas.Cs.Tests;

/// <summary>
/// Verifies deterministic and overload-aware portable C# identities.
/// </summary>
public sealed class CSharpModelIdentityTests
{
    /// <summary>
    /// Confirms overload signatures produce distinct declaration identities.
    /// </summary>
    [Fact]
    public void DistinguishesOverloadedMembers()
    {
        var identity = new CSharpModelIdentity("Catalog@net8.0");

        var first = identity.ElementId("method", "Catalog.Service.Find", "(string):Catalog.Item");
        var second = identity.ElementId("method", "Catalog.Service.Find", "(int):Catalog.Item");

        Assert.NotEqual(first, second);
    }
}
