namespace Zenin.Application.Common.Interfaces;

public class IngestionResult
{
    /// <summary>numeric | text | mixed</summary>
    public string Classification { get; set; } = "unknown";

    /// <summary>Extracted numeric statistics as JSON-serializable object</summary>
    public object? NumericSummary { get; set; }

    /// <summary>Extracted text content for ML analysis</summary>
    public string? ExtractedText { get; set; }

    /// <summary>Text chunks ready for ML indexing</summary>
    public List<string> TextChunks { get; set; } = new();

    /// <summary>Key metrics extracted from numeric data</summary>
    public object? Metrics { get; set; }

    /// <summary>Row/record count</summary>
    public int RecordCount { get; set; }

    /// <summary>Column names for structured data</summary>
    public List<string> Columns { get; set; } = new();

    /// <summary>Numeric series extracted (column name → values)</summary>
    public Dictionary<string, List<double>> NumericSeries { get; set; } = new();
}

public interface IIngestionService
{
    /// <summary>
    /// Process file content in memory: detect type, extract, clean, normalize, classify.
    /// No file is stored — only processed results are returned.
    /// </summary>
    Task<IngestionResult> ProcessAsync(Stream fileStream, string filename, CancellationToken ct = default);
}
