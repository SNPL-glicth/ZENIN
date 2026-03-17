using System.Text.Json;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Services;

namespace Zenin.Infrastructure.Services;

public class IngestionService : IIngestionService
{
    private readonly UniversalFileParser _parser;

    public IngestionService(UniversalFileParser parser)
    {
        _parser = parser;
    }

    public async Task<IngestionResult> ProcessAsync(Stream fileStream, string filename, CancellationToken ct = default)
    {
        var parseResult = await _parser.ParseAsync(fileStream, filename);
        var result = new IngestionResult();

        switch (parseResult.ContentType)
        {
            case "tabular":
            case "numeric":
                result.Classification = "numeric";
                ProcessNumeric(parseResult, result);
                break;

            case "text":
            case "document":
            case "markdown":
                result.Classification = "text";
                ProcessText(parseResult, result);
                break;

            case "structured":
                result.Classification = DetermineStructuredClassification(parseResult);
                if (result.Classification == "numeric" || result.Classification == "mixed")
                    ProcessNumeric(parseResult, result);
                if (result.Classification == "text" || result.Classification == "mixed")
                    ProcessText(parseResult, result);
                break;

            default:
                result.Classification = "text";
                ProcessText(parseResult, result);
                break;
        }

        return result;
    }

    private void ProcessNumeric(ParseResult parseResult, IngestionResult result)
    {
        if (parseResult.NormalizedPayload == null) return;

        try
        {
            var json = JsonSerializer.Serialize(parseResult.NormalizedPayload);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("rows", out var rows))
            {
                ProcessTabularData(root, rows, result);
            }
            else if (root.ValueKind == JsonValueKind.Array)
            {
                ProcessArrayData(root, result);
            }

            result.NumericSummary = BuildNumericSummary(result);
        }
        catch
        {
            result.NumericSummary = new { error = "Failed to extract numeric data" };
        }
    }

    private void ProcessTabularData(JsonElement root, JsonElement rows, IngestionResult result)
    {
        if (root.TryGetProperty("headers", out var headers))
        {
            foreach (var h in headers.EnumerateArray())
                result.Columns.Add(h.GetString() ?? "");
        }

        var numericColumns = new Dictionary<string, List<double>>();
        int rowCount = 0;

        foreach (var row in rows.EnumerateArray())
        {
            rowCount++;
            if (row.ValueKind == JsonValueKind.Array)
            {
                int colIdx = 0;
                foreach (var cell in row.EnumerateArray())
                {
                    var colName = colIdx < result.Columns.Count ? result.Columns[colIdx] : $"col_{colIdx}";
                    if (cell.ValueKind == JsonValueKind.Number && cell.TryGetDouble(out var val))
                    {
                        if (!numericColumns.ContainsKey(colName))
                            numericColumns[colName] = new List<double>();
                        numericColumns[colName].Add(val);
                    }
                    else if (cell.ValueKind == JsonValueKind.String && double.TryParse(cell.GetString(), out var parsed))
                    {
                        if (!numericColumns.ContainsKey(colName))
                            numericColumns[colName] = new List<double>();
                        numericColumns[colName].Add(parsed);
                    }
                    colIdx++;
                }
            }
            else if (row.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in row.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetDouble(out var val))
                    {
                        if (!numericColumns.ContainsKey(prop.Name))
                            numericColumns[prop.Name] = new List<double>();
                        numericColumns[prop.Name].Add(val);
                    }
                    else if (prop.Value.ValueKind == JsonValueKind.String && double.TryParse(prop.Value.GetString(), out var parsed))
                    {
                        if (!numericColumns.ContainsKey(prop.Name))
                            numericColumns[prop.Name] = new List<double>();
                        numericColumns[prop.Name].Add(parsed);
                    }
                }
            }
        }

        result.RecordCount = rowCount;
        result.NumericSeries = numericColumns;
    }

    private void ProcessArrayData(JsonElement root, IngestionResult result)
    {
        var numericColumns = new Dictionary<string, List<double>>();
        int rowCount = 0;

        foreach (var item in root.EnumerateArray())
        {
            rowCount++;
            if (item.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in item.EnumerateObject())
                {
                    if (!result.Columns.Contains(prop.Name))
                        result.Columns.Add(prop.Name);

                    if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetDouble(out var val))
                    {
                        if (!numericColumns.ContainsKey(prop.Name))
                            numericColumns[prop.Name] = new List<double>();
                        numericColumns[prop.Name].Add(val);
                    }
                }
            }
            else if (item.ValueKind == JsonValueKind.Number && item.TryGetDouble(out var val))
            {
                const string colName = "value";
                if (!numericColumns.ContainsKey(colName))
                    numericColumns[colName] = new List<double>();
                numericColumns[colName].Add(val);
            }
        }

        result.RecordCount = rowCount;
        result.NumericSeries = numericColumns;
    }

    /// <summary>
    /// Raw metadata only — NO calculations. ML computes all statistics.
    /// </summary>
    private static object BuildNumericSummary(IngestionResult result)
    {
        return new
        {
            record_count = result.RecordCount,
            numeric_columns = result.NumericSeries.Count,
            total_columns = result.Columns.Count,
            column_names = result.NumericSeries.Keys.ToList(),
            values_per_column = result.NumericSeries.ToDictionary(kv => kv.Key, kv => kv.Value.Count)
        };
    }

    private void ProcessText(ParseResult parseResult, IngestionResult result)
    {
        var text = parseResult.RawText ?? "";

        if (string.IsNullOrWhiteSpace(text) && parseResult.NormalizedPayload != null)
        {
            text = JsonSerializer.Serialize(parseResult.NormalizedPayload);
        }

        result.ExtractedText = text;
        result.TextChunks = ChunkText(text, maxChunkSize: 1000, overlap: 200);
        result.RecordCount = result.TextChunks.Count;

        result.NumericSummary = new
        {
            total_characters = text.Length,
            total_chunks = result.TextChunks.Count,
            word_count = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length
        };
    }

    private string DetermineStructuredClassification(ParseResult parseResult)
    {
        if (parseResult.NormalizedPayload == null) return "text";

        try
        {
            var json = JsonSerializer.Serialize(parseResult.NormalizedPayload);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            bool hasNumeric = false;
            bool hasText = false;

            if (root.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in root.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var prop in item.EnumerateObject())
                        {
                            if (prop.Value.ValueKind == JsonValueKind.Number)
                                hasNumeric = true;
                            else if (prop.Value.ValueKind == JsonValueKind.String)
                                hasText = true;
                        }
                    }
                    if (hasNumeric && hasText) break;
                }
            }

            if (hasNumeric && hasText) return "mixed";
            if (hasNumeric) return "numeric";
            return "text";
        }
        catch
        {
            return "text";
        }
    }

    private static List<string> ChunkText(string text, int maxChunkSize, int overlap)
    {
        var chunks = new List<string>();
        if (string.IsNullOrWhiteSpace(text)) return chunks;

        int start = 0;
        while (start < text.Length)
        {
            int end = Math.Min(start + maxChunkSize, text.Length);
            var chunk = text[start..end].Trim();
            if (!string.IsNullOrWhiteSpace(chunk))
                chunks.Add(chunk);

            if (end >= text.Length) break;
            start = end - overlap;
        }

        return chunks;
    }

}
