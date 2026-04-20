namespace Zenin.Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public ChatSession Session { get; set; } = null!;

    /// <summary>user | assistant | system</summary>
    public string Role { get; set; } = "user";
    
    public string Content { get; set; } = string.Empty;
    
    /// <summary>Optional link to analysis if message triggered document processing</summary>
    public Guid? AnalysisResultId { get; set; }
    public AnalysisResult? AnalysisResult { get; set; }
    
    public DateTime CreatedAt { get; set; }
}
