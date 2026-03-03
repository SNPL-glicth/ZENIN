using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Zenin.Infrastructure.Services
{
    /// <summary>
    /// Resuelve tenant desde HTTP context (JWT claims o headers).
    /// 
    /// Estrategia:
    /// 1. Leer claim "tenant_id" del JWT
    /// 2. Leer header "X-Tenant-Id"
    /// 3. Fallback a tenant default (migración)
    /// </summary>
    public class HttpTenantResolver : ITenantResolver
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<HttpTenantResolver> _logger;
        private readonly Guid _defaultTenantId;

        public HttpTenantResolver(
            IHttpContextAccessor httpContextAccessor,
            ILogger<HttpTenantResolver> logger)
        {
            _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            // TODO: Leer de configuración
            _defaultTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        }

        public Task<Guid> GetCurrentTenantIdAsync()
        {
            var httpContext = _httpContextAccessor.HttpContext;

            if (httpContext == null)
            {
                _logger.LogWarning("No HTTP context available, using default tenant");
                return Task.FromResult(_defaultTenantId);
            }

            // 1. Try JWT claim
            var tenantClaim = httpContext.User?.FindFirst("tenant_id");
            if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var tenantIdFromClaim))
            {
                return Task.FromResult(tenantIdFromClaim);
            }

            // 2. Try header
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader))
            {
                if (Guid.TryParse(tenantHeader.FirstOrDefault(), out var tenantIdFromHeader))
                {
                    return Task.FromResult(tenantIdFromHeader);
                }
            }

            // 3. Fallback to default (during migration)
            _logger.LogDebug("No tenant_id found in JWT or headers, using default tenant");
            return Task.FromResult(_defaultTenantId);
        }

        public Task<string> GetCurrentTenantSlugAsync()
        {
            var httpContext = _httpContextAccessor.HttpContext;

            if (httpContext == null)
            {
                return Task.FromResult("default");
            }

            var slugClaim = httpContext.User?.FindFirst("tenant_slug");
            if (slugClaim != null)
            {
                return Task.FromResult(slugClaim.Value);
            }

            if (httpContext.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader))
            {
                return Task.FromResult(slugHeader.FirstOrDefault() ?? "default");
            }

            return Task.FromResult("default");
        }
    }
}
