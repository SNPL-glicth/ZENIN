FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/Zenin.API/Zenin.API.csproj", "src/Zenin.API/"]
COPY ["src/Zenin.Application/Zenin.Application.csproj", "src/Zenin.Application/"]
COPY ["src/Zenin.Domain/Zenin.Domain.csproj", "src/Zenin.Domain/"]
COPY ["src/Zenin.Infrastructure/Zenin.Infrastructure.csproj", "src/Zenin.Infrastructure/"]

RUN dotnet restore "src/Zenin.API/Zenin.API.csproj" --no-cache

COPY . .
WORKDIR "/src/src/Zenin.API"
RUN dotnet build "Zenin.API.csproj" -c Release -o /app/build --no-restore

FROM build AS publish
RUN dotnet publish "Zenin.API.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

ENTRYPOINT ["dotnet", "Zenin.API.dll"]
