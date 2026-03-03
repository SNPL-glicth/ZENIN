using System;
using System.Threading.Tasks;

namespace Zenin.Infrastructure.Services
{
    /// <summary>
    /// Resuelve el tenant actual desde el contexto de la petición.
    /// Extrae tenant_id de JWT claims, headers, o subdomain.
    /// </summary>
    public interface ITenantResolver
    {
        /// <summary>
        /// Obtiene el tenant_id del contexto actual
        /// </summary>
        Task<Guid> GetCurrentTenantIdAsync();

        /// <summary>
        /// Obtiene el tenant slug del contexto actual
        /// </summary>
        Task<string> GetCurrentTenantSlugAsync();
    }
}
