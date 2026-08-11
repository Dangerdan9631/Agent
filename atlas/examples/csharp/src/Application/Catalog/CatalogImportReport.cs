namespace Atlas.Example.Application.Catalog;

/// <summary>
/// Reports the deterministic result of one catalog import.
/// </summary>
/// <param name="ImportedCount">Number of successfully imported items.</param>
/// <param name="CompletedAt">Completion time supplied by the application clock.</param>
public sealed record CatalogImportReport(int ImportedCount, DateTimeOffset CompletedAt);
