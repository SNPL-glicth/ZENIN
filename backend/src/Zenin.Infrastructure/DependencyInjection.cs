using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Services;
using Zenin.Domain.Interfaces;
using Zenin.Infrastructure.Persistence;
using Zenin.Infrastructure.Persistence.Repositories;
using Zenin.Infrastructure.Services;

namespace Zenin.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "Zenin_";
        });

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,  // TEMP: Aceptar cualquier issuer
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidAudience = configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Secret"]!)),
                ClockSkew = TimeSpan.Zero
            };
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<PredictionRepository>();
        services.AddScoped<AnomalyRepository>();
        services.AddScoped<MLHealthRepository>();
        services.AddScoped<IAnalysisResultRepository, AnalysisResultRepository>();
        services.AddScoped<IIngestionService, IngestionService>();
        services.AddScoped<IMLSearchService, MLSearchService>();
        services.AddScoped<IIngestionQueueService, IngestionQueueService>();
        services.AddSingleton<INLUService, NLUService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IUserRepository, UserRepository>();

        return services;
    }
}
