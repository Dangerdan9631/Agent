using System.Text.Json;
using System.Diagnostics;
using Xunit;

namespace StarCruiseStudios.Atlas.Cs.Tests;

/// <summary>
/// Verifies complete deterministic generation from a multi-target SDK project.
/// </summary>
public sealed class CSharpGenerationIntegrationTests
{
    /// <summary>
    /// Rejects compilations with errors instead of emitting an incomplete architecture model.
    /// </summary>
    [Fact]
    public async Task RejectsCompilationErrors()
    {
        using var workspace = new TemporaryWorkspace();
        workspace.Write("Broken.csproj", "<Project Sdk=\"Microsoft.NET.Sdk\"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>");
        workspace.Write("Broken.cs", "namespace Broken; public sealed class Example { public MissingType Value { get; } }");
        workspace.Write("atlas.config.json", """
            {
              "schemaVersion": 1,
              "discovery": {
                "packageGlobs": ["."],
                "packages": [
                  { "match": { "name": "Broken@*" }, "classification": "runtime" }
                ]
              }
            }
            """);
        workspace.Restore();

        var exitCode = await Program.Main(["generate", "--workspace", workspace.Path]);

        Assert.Equal(1, exitCode);
        Assert.False(File.Exists(System.IO.Path.Combine(workspace.Path, "architecture", "models", "atlas-workspace.json")));
    }

    /// <summary>
    /// Generates one model per target framework and retains representative C# semantics.
    /// </summary>
    [Fact]
    public async Task GeneratesDeterministicMultiTargetModels()
    {
        using var workspace = new TemporaryWorkspace();
        workspace.Write("Fixture.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFrameworks>net8.0;net9.0</TargetFrameworks>
                <PackageId>Atlas.Cs.Fixture</PackageId>
                <Version>2.3.4</Version>
              </PropertyGroup>
            </Project>
            """);
        workspace.Write("Source.cs", """
            using System;
            namespace Atlas.Cs.Fixture;
            public interface IContract { string Read(int value); }
            public abstract class Base { }
            public readonly struct Coordinate { public Coordinate(int row) { Row = row; } public int Row { get; } }
            public sealed record Request(int Value);
            public delegate string Formatter(string value);
            [AttributeUsage(AttributeTargets.Class)]
            public sealed class MarkerAttribute : Attribute { }
            [Marker]
            public sealed class Worker : Base, IContract
            {
                public Worker() { }
                public string Name { get; set; } = "atlas";
                public string Read(int value) => Helper.Format(value);
            }
            public static class Helper
            {
                public static string Format(int value) => value.ToString();
            }
            """);
        workspace.Write("atlas.config.json", """
            {
              "schemaVersion": 1,
              "discovery": {
                "packageGlobs": ["."],
                "packages": [
                  { "match": { "name": "Atlas.Cs.Fixture@*" }, "classification": "runtime" }
                ]
              },
              "artifacts": { "root": "architecture" }
            }
            """);
        workspace.Restore();

        var firstExitCode = await Program.Main(["generate", "--workspace", workspace.Path]);
        Assert.Equal(0, firstExitCode);
        var first = workspace.ReadGeneratedJson();
        var secondExitCode = await Program.Main(["generate", "--workspace", workspace.Path]);
        Assert.Equal(0, secondExitCode);
        var second = workspace.ReadGeneratedJson();

        Assert.Equal(first.Keys.Order(), second.Keys.Order());
        foreach (var path in first.Keys)
        {
            Assert.Equal(first[path], second[path]);
        }

        using var manifest = JsonDocument.Parse(first["atlas-workspace.json"]);
        var moduleIds = manifest.RootElement.GetProperty("modules").EnumerateArray()
            .Select(entry => entry.GetProperty("moduleId").GetString()!)
            .ToArray();
        Assert.Equal(["Atlas.Cs.Fixture@net8.0", "Atlas.Cs.Fixture@net9.0"], moduleIds);
        using var model = JsonDocument.Parse(first["Atlas.Cs.Fixture%40net8.0.atlas-module.json"]);
        var kinds = model.RootElement.GetProperty("elements").EnumerateArray()
            .Select(element => element.GetProperty("kind").GetString())
            .ToHashSet(StringComparer.Ordinal);
        Assert.Contains("annotation", kinds);
        Assert.Contains("delegate", kinds);
        Assert.Contains("record", kinds);
        Assert.Contains("struct", kinds);
        var declarations = model.RootElement.GetProperty("elements").EnumerateArray().ToArray();
        Assert.Contains(declarations, element =>
            element.GetProperty("kind").GetString() == "property"
            && element.GetProperty("qualifiedName").GetString() == "Atlas.Cs.Fixture.Request.Value");
        Assert.Contains(declarations, element =>
            element.GetProperty("kind").GetString() == "constructor"
            && element.GetProperty("qualifiedName").GetString() == "Atlas.Cs.Fixture.Request..ctor");
        var relationshipKinds = model.RootElement.GetProperty("relationships").EnumerateArray()
            .Select(relationship => relationship.GetProperty("kind").GetString())
            .ToHashSet(StringComparer.Ordinal);
        Assert.Contains("calls", relationshipKinds);
        Assert.Contains("implements", relationshipKinds);
        Assert.Contains("inherits", relationshipKinds);
        Assert.Contains("references", relationshipKinds);
        Assert.All(first.Values, value => Assert.DoesNotContain(workspace.Path.Replace('\\', '/'), value, StringComparison.Ordinal));
    }

    private sealed class TemporaryWorkspace : IDisposable
    {
        internal TemporaryWorkspace()
        {
            this.Path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), $"atlas-cs-test-{Guid.NewGuid():N}");
            Directory.CreateDirectory(this.Path);
        }

        internal string Path { get; }

        internal void Write(string relativePath, string content)
        {
            var path = System.IO.Path.Combine(this.Path, relativePath);
            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
            File.WriteAllText(path, content);
        }

        internal IReadOnlyDictionary<string, string> ReadGeneratedJson()
        {
            var models = System.IO.Path.Combine(this.Path, "architecture", "models");
            return Directory.EnumerateFiles(models, "*.json")
                .ToDictionary(path => System.IO.Path.GetFileName(path)!, File.ReadAllText, StringComparer.Ordinal);
        }

        internal void Restore()
        {
            var startInfo = new ProcessStartInfo("dotnet", "restore --nologo")
            {
                WorkingDirectory = this.Path,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false
            };
            startInfo.Environment.Remove("MSBUILD_EXE_PATH");
            startInfo.Environment.Remove("MSBuildSDKsPath");
            using var process = Process.Start(startInfo)
                ?? throw new InvalidOperationException("Could not start dotnet restore for the C# test workspace.");
            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException($"C# test workspace restore failed: {process.StandardOutput.ReadToEnd()} {process.StandardError.ReadToEnd()}");
            }
        }

        public void Dispose()
        {
            if (Directory.Exists(this.Path))
            {
                Directory.Delete(this.Path, recursive: true);
            }
        }
    }
}
