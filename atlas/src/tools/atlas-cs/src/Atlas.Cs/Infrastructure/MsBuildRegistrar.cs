using Microsoft.Build.Locator;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Registers the installed .NET SDK before any MSBuild-backed workspace is created.
/// </summary>
public sealed class MsBuildRegistrar
{
    /// <summary>
    /// Registers the default installed MSBuild instance exactly once.
    /// </summary>
    public void Register()
    {
        if (!MSBuildLocator.IsRegistered)
        {
            MSBuildLocator.RegisterDefaults();
        }
    }
}

