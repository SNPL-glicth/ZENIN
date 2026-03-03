using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using Zenin.Infrastructure.Adapters;
using Zenin.Infrastructure.FeatureFlags;
using Zenin.Infrastructure.Services;

namespace Zenin.API.Extensions
{
    /// <summary>
    /// Extensiones para configurar Dependency Injection del Adapter Layer
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Registra el Adapter Layer para migración incremental
        /// </summary>
        public static IServiceCollection AddAdapterLayer(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // 1. Tenant Resolution
            services.AddHttpContextAccessor();
            services.AddScoped<ITenantResolver, HttpTenantResolver>();

            // 2. Feature Flags (Redis)
            var redisConnection = configuration.GetConnectionString("Redis");
            services.AddSingleton<IConnectionMultiplexer>(sp =>
                ConnectionMultiplexer.Connect(redisConnection));
            
            services.AddSingleton<IFeatureFlagService, RedisFeatureFlagService>();

            // 3. Storage Adapters
            var sqlServerConnection = configuration.GetConnectionString("DefaultConnection");
            var postgresConnection = configuration.GetConnectionString("PostgreSQL");

            // SQL Server Adapter (legacy)
            services.AddScoped<IStorageAdapter>(sp =>
            {
                var logger = sp.GetRequiredService<ILogger<SqlServerAdapter>>();
                return new SqlServerAdapter(sqlServerConnection, logger);
            });

            // PostgreSQL Adapter (nuevo)
            services.AddScoped<PostgreSqlAdapter>(sp =>
            {
                var tenantResolver = sp.GetRequiredService<ITenantResolver>();
                var logger = sp.GetRequiredService<ILogger<PostgreSqlAdapter>>();
                return new PostgreSqlAdapter(postgresConnection, tenantResolver, logger);
            });

            // 4. Dual Write Adapter (orquestador)
            services.AddScoped<IStorageAdapter, DualWriteAdapter>(sp =>
            {
                var sqlServerAdapter = new SqlServerAdapter(
                    sqlServerConnection,
                    sp.GetRequiredService<ILogger<SqlServerAdapter>>());
                
                var postgresAdapter = sp.GetRequiredService<PostgreSqlAdapter>();
                var featureFlags = sp.GetRequiredService<IFeatureFlagService>();
                var logger = sp.GetRequiredService<ILogger<DualWriteAdapter>>();

                return new DualWriteAdapter(
                    sqlServerAdapter,
                    postgresAdapter,
                    featureFlags,
                    logger);
            });

            return services;
        }
    }
}
