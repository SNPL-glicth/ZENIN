using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Zenin.Application.Services;

namespace Zenin.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddScoped<Services.UniversalFileParser>();
        services.AddHttpClient();
        
        // Auth services
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IAuthService, AuthService>();
        
        return services;
    }
}
