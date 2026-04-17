using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;
using Zenin.API.Middleware;
using Zenin.Application;
using Zenin.Infrastructure;
using Zenin.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Configurar puerto para Railway
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext} - {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/zenin-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Logging.ClearProviders();
builder.Logging.AddSerilog();
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Test logging immediately
var testLogger = Log.ForContext<Program>();
testLogger.Information("[PROGRAM] Serilog initialized successfully - logs should appear now");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Zenin API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new()
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"];
        if (!string.IsNullOrEmpty(allowedOrigins))
        {
            policy.WithOrigins(allowedOrigins.Split(','));
        }
        else
        {
            // Development: allow common Vite origins
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
                "http://localhost:40679",
                "http://127.0.0.1:40679"
            );
        }
        policy.AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Auto-create/migrate database schema on startup (development)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.EnsureCreatedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapGet("/", () => new { service = "Zenin API", version = "1.0.0", status = "running" });

var actualPort = Environment.GetEnvironmentVariable("PORT") ?? "5000";

// Logs en Console y Serilog
Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
Console.WriteLine("🚀 Zenin API iniciada correctamente");
Console.WriteLine($" Puerto: {actualPort}");
Console.WriteLine($" Swagger UI: http://localhost:{actualPort}/swagger");
Console.WriteLine($" Health Check: http://localhost:{actualPort}/health");
Console.WriteLine($" API Base: http://localhost:{actualPort}/");

Log.Information("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
Log.Information("🚀 Zenin API iniciada correctamente");
Log.Information(" Puerto: {Port}", actualPort);
Log.Information(" Swagger UI: http://localhost:{Port}/swagger", actualPort);
Log.Information(" Health Check: http://localhost:{Port}/health", actualPort);
Log.Information(" API Base: http://localhost:{Port}/", actualPort);

app.Run();
