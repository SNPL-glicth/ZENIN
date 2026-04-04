namespace Zenin.Application.DTOs;

public class MLHealthDto
{
    public string Status { get; set; } = "unknown";
    public int PredictionsTotal { get; set; }
    public int AnomaliesTotal { get; set; }
    public DateTime? LastPredictionAt { get; set; }
}
