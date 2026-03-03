using System.Threading.Tasks;

namespace Zenin.Infrastructure.FeatureFlags
{
    /// <summary>
    /// Servicio de feature flags para controlar migración incremental.
    /// 
    /// Flags clave:
    /// - postgresql_dual_write: Escribir en PostgreSQL (default: false)
    /// - postgresql_read_percentage: % de lecturas desde PostgreSQL (0-100)
    /// - tenant_isolation: Activar multi-tenancy (default: false)
    /// </summary>
    public interface IFeatureFlagService
    {
        /// <summary>
        /// Verifica si un feature flag está habilitado
        /// </summary>
        Task<bool> IsEnabledAsync(string flagName);

        /// <summary>
        /// Obtiene el valor de un feature flag con tipo específico
        /// </summary>
        Task<T> GetValueAsync<T>(string flagName, T defaultValue);

        /// <summary>
        /// Habilita un feature flag (admin endpoint)
        /// </summary>
        Task EnableAsync(string flagName);

        /// <summary>
        /// Deshabilita un feature flag
        /// </summary>
        Task DisableAsync(string flagName);

        /// <summary>
        /// Establece un valor numérico (para canary rollouts)
        /// </summary>
        Task SetValueAsync<T>(string flagName, T value);
    }
}
