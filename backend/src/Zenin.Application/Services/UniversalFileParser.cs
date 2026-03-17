using System.Globalization;
using System.Text;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using ExcelDataReader;
using Markdig;
using SixLabors.ImageSharp;
using UglyToad.PdfPig;

namespace Zenin.Application.Services;

public class UniversalFileParser
{
    static UniversalFileParser()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public async Task<ParseResult> ParseAsync(Stream fileStream, string filename)
    {
        var extension = Path.GetExtension(filename).ToLowerInvariant();
        var contentType = "binary";
        var rawText = string.Empty;
        object? normalizedPayload = null;

        try
        {
            switch (extension)
            {
                case ".csv":
                case ".tsv":
                    (contentType, rawText, normalizedPayload) = await ParseCsvAsync(fileStream, extension);
                    break;

                case ".xlsx":
                case ".xls":
                    (contentType, rawText, normalizedPayload) = await ParseExcelAsync(fileStream);
                    break;

                case ".json":
                    (contentType, rawText, normalizedPayload) = await ParseJsonAsync(fileStream);
                    break;

                case ".txt":
                case ".log":
                case ".md":
                    (contentType, rawText, normalizedPayload) = await ParseTextAsync(fileStream, extension);
                    break;

                case ".pdf":
                    (contentType, rawText, normalizedPayload) = await ParsePdfAsync(fileStream);
                    break;

                case ".docx":
                    (contentType, rawText, normalizedPayload) = await ParseDocxAsync(fileStream);
                    break;

                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                case ".bmp":
                case ".webp":
                    (contentType, rawText, normalizedPayload) = await ParseImageAsync(fileStream, extension);
                    break;

                default:
                    contentType = "binary";
                    normalizedPayload = new
                    {
                        mime_type = GetMimeType(extension),
                        size_bytes = fileStream.Length
                    };
                    break;
            }
        }
        catch (Exception ex)
        {
            contentType = "binary";
            rawText = string.Empty;
            normalizedPayload = new
            {
                error = "Failed to parse file",
                error_message = ex.Message,
                extension,
                size_bytes = fileStream.Length
            };
        }

        return new ParseResult
        {
            ContentType = contentType,
            RawText = rawText,
            NormalizedPayload = normalizedPayload
        };
    }

    private async Task<(string, string, object)> ParseCsvAsync(Stream stream, string extension)
    {
        var delimiter = extension == ".tsv" ? "\t" : ",";
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = delimiter,
            HasHeaderRecord = true,
            BadDataFound = null
        };

        using var reader = new StreamReader(stream, Encoding.UTF8);
        using var csv = new CsvReader(reader, config);

        await csv.ReadAsync();
        csv.ReadHeader();
        var headers = csv.HeaderRecord?.ToList() ?? new List<string>();

        var rows = new List<Dictionary<string, string>>();
        var sampleRows = new List<Dictionary<string, string>>();
        var rowCount = 0;

        while (await csv.ReadAsync() && rowCount < 10)
        {
            var row = new Dictionary<string, string>();
            foreach (var header in headers)
            {
                row[header] = csv.GetField(header) ?? "";
            }
            sampleRows.Add(row);
            rowCount++;
        }

        while (await csv.ReadAsync())
        {
            rowCount++;
        }

        var numericColumns = new List<string>();
        var textColumns = new List<string>();

        foreach (var header in headers)
        {
            var isNumeric = sampleRows.All(r =>
                decimal.TryParse(r.GetValueOrDefault(header, ""), out _));
            if (isNumeric)
                numericColumns.Add(header);
            else
                textColumns.Add(header);
        }

        var payload = new
        {
            headers,
            row_count = rowCount,
            sample_rows = sampleRows,
            numeric_columns = numericColumns,
            text_columns = textColumns,
            has_timestamps = false,
            timestamp_column = (string?)null
        };

        var rawText = $"CSV file with {rowCount} rows and {headers.Count} columns: {string.Join(", ", headers)}";

        return ("tabular", rawText, payload);
    }

    private async Task<(string, string, object)> ParseExcelAsync(Stream stream)
    {
        using var reader = ExcelReaderFactory.CreateReader(stream);
        var dataSet = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration
            {
                UseHeaderRow = true
            }
        });

        var sheets = new List<object>();
        var rowCount = 0;

        foreach (System.Data.DataTable table in dataSet.Tables)
        {
            var headers = table.Columns.Cast<System.Data.DataColumn>()
                .Select(c => c.ColumnName).ToList();

            var sampleRows = table.Rows.Cast<System.Data.DataRow>()
                .Take(10)
                .Select(r => headers.ToDictionary(h => h, h => r[h]?.ToString() ?? ""))
                .ToList();

            sheets.Add(new
            {
                sheet_name = table.TableName,
                headers,
                row_count = table.Rows.Count,
                sample_rows = sampleRows
            });

            rowCount += table.Rows.Count;
        }

        var payload = new
        {
            sheets,
            total_rows = rowCount,
            sheet_count = dataSet.Tables.Count
        };

        var rawText = $"Excel file with {dataSet.Tables.Count} sheets and {rowCount} total rows";

        return ("tabular", rawText, payload);
    }

    private async Task<(string, string, object)> ParseJsonAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var content = await reader.ReadToEndAsync();

        var jsonDoc = JsonDocument.Parse(content);
        var keys = jsonDoc.RootElement.EnumerateObject().Select(p => p.Name).ToList();

        var payload = new
        {
            keys,
            depth = CalculateJsonDepth(jsonDoc.RootElement),
            preview = content.Length > 500 ? content[..500] : content
        };

        return ("structured", content, payload);
    }

    private async Task<(string, string, object)> ParseTextAsync(Stream stream, string extension)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var text = await reader.ReadToEndAsync();

        var wordCount = text.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
        var paragraphCount = text.Split(new[] { "\n\n", "\r\n\r\n" }, StringSplitOptions.RemoveEmptyEntries).Length;

        var payload = new
        {
            word_count = wordCount,
            char_count = text.Length,
            paragraph_count = paragraphCount,
            language = "unknown",
            preview = text.Length > 500 ? text[..500] : text,
            full_text = text
        };

        return ("text", text, payload);
    }

    private async Task<(string, string, object)> ParsePdfAsync(Stream stream)
    {
        var sb = new StringBuilder();

        using var document = PdfDocument.Open(stream);
        foreach (var page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }

        var text = sb.ToString();
        var wordCount = text.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;

        var payload = new
        {
            page_count = document.NumberOfPages,
            word_count = wordCount,
            char_count = text.Length,
            preview = text.Length > 500 ? text[..500] : text,
            full_text = text
        };

        return ("text", text, payload);
    }

    private async Task<(string, string, object)> ParseDocxAsync(Stream stream)
    {
        var sb = new StringBuilder();

        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc.MainDocumentPart?.Document.Body;

        if (body != null)
        {
            foreach (var para in body.Elements<Paragraph>())
            {
                sb.AppendLine(para.InnerText);
            }
        }

        var text = sb.ToString();
        var wordCount = text.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
        var paragraphCount = text.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length;

        var payload = new
        {
            word_count = wordCount,
            char_count = text.Length,
            paragraph_count = paragraphCount,
            preview = text.Length > 500 ? text[..500] : text,
            full_text = text
        };

        return ("text", text, payload);
    }

    private async Task<(string, string, object)> ParseImageAsync(Stream stream, string extension)
    {
        using var image = await Image.LoadAsync(stream);

        var payload = new
        {
            width = image.Width,
            height = image.Height,
            format = extension.TrimStart('.').ToUpperInvariant(),
            color_mode = image.PixelType.BitsPerPixel > 8 ? "RGB" : "Grayscale",
            file_size_kb = stream.Length / 1024
        };

        var rawText = $"Image: {image.Width}x{image.Height}, {extension.TrimStart('.')}";

        return ("image", rawText, payload);
    }

    private int CalculateJsonDepth(JsonElement element, int currentDepth = 0)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var maxChildDepth = currentDepth;
            foreach (var property in element.EnumerateObject())
            {
                var childDepth = CalculateJsonDepth(property.Value, currentDepth + 1);
                if (childDepth > maxChildDepth)
                    maxChildDepth = childDepth;
            }
            return maxChildDepth;
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            var maxChildDepth = currentDepth;
            foreach (var item in element.EnumerateArray())
            {
                var childDepth = CalculateJsonDepth(item, currentDepth + 1);
                if (childDepth > maxChildDepth)
                    maxChildDepth = childDepth;
            }
            return maxChildDepth;
        }
        else
        {
            return currentDepth;
        }
    }

    private string GetMimeType(string extension)
    {
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".csv" => "text/csv",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls" => "application/vnd.ms-excel",
            ".json" => "application/json",
            ".txt" => "text/plain",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".webp" => "image/webp",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".zip" => "application/zip",
            ".xml" => "application/xml",
            ".html" or ".htm" => "text/html",
            _ => "application/octet-stream"
        };
    }
}

public class ParseResult
{
    public string ContentType { get; set; } = string.Empty;
    public string RawText { get; set; } = string.Empty;
    public object? NormalizedPayload { get; set; }
}
