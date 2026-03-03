using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Zenin.Infrastructure.FeatureFlags
{
    /// <summary>
    /// Implementación de feature flags usando Redis.
    /// Cache local con TTL de 60 segundos para reducir latencia.
    /// </summary>
    public class RedisFeatureFlagService : IFeatureFlagService
    {
        private readonly IConnectionMultiplexer _redis;
        private readonly ILogger<RedisFeatureFlagService> _logger;
        private readonly Dictionary<string, (object Value, DateTime ExpiresAt)> _localCache;
        private readonly TimeSpan _cacheTtl = TimeSpan.FromSeconds(60);

        public RedisFeatureFlagService(
            IConnectionMultiplexer redis,
            ILogger<RedisFeatureFlagService> logger)
        {
            _redis = redis ?? throw new ArgumentNullException(nameof(redis));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _localCache = new Dictionary<string, (object, DateTime)>();
        }

        public async Task<bool> IsEnabledAsync(string flagName)
        {
            return await GetValueAsync(flagName, false);
        }

        public async Task<T> GetValueAsync<T>(string flagName, T defaultValue)
        {
            var cacheKey = $"feature_flag:{flagName}";

            // 1. Check local cache
            if (_localCache.TryGetValue(cacheKey, out var cached))
            {
                if (cached.ExpiresAt > DateTime.UtcNow)
                {
                    return (T)cached.Value;
                }
                else
                {
                    _localCache.Remove(cacheKey);
                }
            }

            // 2. Read from Redis
            try
            {
                var db = _redis.GetDatabase();
                var value = await db.StringGetAsync(cacheKey);

                if (value.HasValue)
                {
                    var parsedValue = ParseValue<T>(value);
                    
                    // Update local cache
                    _localCache[cacheKey] = (parsedValue, DateTime.UtcNow.Add(_cacheTtl));
                    
                    return parsedValue;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read feature flag {FlagName} from Redis", flagName);
            }

            return defaultValue;
        }

        public async Task EnableAsync(string flagName)
        {
            await SetValueAsync(flagName, true);
        }

        public async Task DisableAsync(string flagName)
        {
            await SetValueAsync(flagName, false);
        }

        public async Task SetValueAsync<T>(string flagName, T value)
        {
            var cacheKey = $"feature_flag:{flagName}";

            try
            {
                var db = _redis.GetDatabase();
                await db.StringSetAsync(cacheKey, value.ToString());

                // Invalidate local cache
                _localCache.Remove(cacheKey);

                _logger.LogInformation("Feature flag {FlagName} set to {Value}", flagName, value);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to set feature flag {FlagName}", flagName);
                throw;
            }
        }

        private T ParseValue<T>(RedisValue value)
        {
            var type = typeof(T);

            if (type == typeof(bool))
            {
                return (T)(object)(value == "true" || value == "1");
            }
            else if (type == typeof(int))
            {
                return (T)(object)int.Parse(value);
            }
            else if (type == typeof(string))
            {
                return (T)(object)value.ToString();
            }
            else
            {
                throw new NotSupportedException($"Type {type.Name} not supported for feature flags");
            }
        }
    }
}
