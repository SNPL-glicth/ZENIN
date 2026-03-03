using System.Collections.Generic;
using System.Threading.Tasks;
using Zenin.Domain.Entities;

namespace Zenin.Infrastructure.Adapters
{
    /// <summary>
    /// Abstracción para persistencia multi-backend.
    /// Permite migración incremental sin modificar core.
    /// </summary>
    public interface IStorageAdapter
    {
        /// <summary>
        /// Guardar lectura de sensor/serie temporal
        /// </summary>
        Task SaveReadingAsync(SensorReading reading);

        /// <summary>
        /// Guardar predicción ML
        /// </summary>
        Task SavePredictionAsync(Prediction prediction);

        /// <summary>
        /// Guardar anomalía detectada
        /// </summary>
        Task SaveAnomalyAsync(AnomalyResult anomaly);

        /// <summary>
        /// Obtener últimas lecturas de una serie
        /// </summary>
        Task<List<SensorReading>> GetLatestReadingsAsync(string seriesId, int limit = 100);

        /// <summary>
        /// Obtener perfil estadístico de serie
        /// </summary>
        Task<SeriesProfile> GetSeriesProfileAsync(string seriesId);
    }
}
