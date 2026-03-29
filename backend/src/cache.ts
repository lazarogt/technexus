import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";

const cacheEnabled = process.env.REDIS_ENABLED === "true";
const redisUrl = process.env.REDIS_URL ?? "redis://redis:6379";

export const cacheTtls = {
  products: Number(process.env.CACHE_TTL_PRODUCTS ?? 120),
  categories: Number(process.env.CACHE_TTL_CATEGORIES ?? 300),
  profile: Number(process.env.CACHE_TTL_PROFILE ?? 90),
  search: Number(process.env.CACHE_TTL_SEARCH ?? 60)
} as const;

const memoryCache = new Map<string, { expiresAt: number; value: string }>();

let redisClient: RedisClientType | null = null;
let redisReady = false;

const logCacheEvent = (message: string): void => {
  logger.info(`[cache] ${message}`);
};

const getMemoryValue = (key: string): string | null => {
  const entry = memoryCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
};

const setMemoryValue = (key: string, value: string, ttlSeconds: number): void => {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};

const deleteMemoryPrefix = (prefix: string): void => {
  Array.from(memoryCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  });
};

export const connectToCache = async (): Promise<void> => {
  if (!cacheEnabled) {
    logCacheEvent("Redis cache is disabled. Using in-memory fallback.");
    return;
  }

  try {
    redisClient = createClient({
      url: redisUrl
    });

    redisClient.on("error", (error) => {
      redisReady = false;
      logger.error("Redis client error", error);
    });

    await redisClient.connect();
    redisReady = true;
    logCacheEvent(`Connected to Redis at ${redisUrl}.`);
  } catch (error) {
    redisClient = null;
    redisReady = false;
    logger.error("Unable to connect to Redis cache. Falling back to direct reads.", error);
  }
};

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  try {
    if (redisClient && redisReady) {
      const raw = await redisClient.get(key);

      if (raw) {
        logCacheEvent(`HIT ${key}`);
        return JSON.parse(raw) as T;
      }

      logCacheEvent(`MISS ${key}`);
      return null;
    }

    const raw = getMemoryValue(key);

    if (raw) {
      logCacheEvent(`HIT ${key} (memory)`);
      return JSON.parse(raw) as T;
    }

    logCacheEvent(`MISS ${key} (memory)`);
    return null;
  } catch (error) {
    logger.error(`Unable to read cache key ${key}`, error);
    return null;
  }
};

export const setCachedJson = async (
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);

    if (redisClient && redisReady) {
      await redisClient.set(key, serialized, {
        EX: ttlSeconds
      });
      logCacheEvent(`SET ${key} ttl=${ttlSeconds}s`);
      return;
    }

    setMemoryValue(key, serialized, ttlSeconds);
    logCacheEvent(`SET ${key} ttl=${ttlSeconds}s (memory)`);
  } catch (error) {
    logger.error(`Unable to write cache key ${key}`, error);
  }
};

export const getOrSetCachedJson = async <T>(input: {
  key: string;
  ttlSeconds: number;
  loader: () => Promise<T>;
}): Promise<T> => {
  const cached = await getCachedJson<T>(input.key);

  if (cached !== null) {
    return cached;
  }

  const value = await input.loader();
  await setCachedJson(input.key, value, input.ttlSeconds);
  return value;
};

export const deleteCachedJson = async (key: string): Promise<void> => {
  try {
    if (redisClient && redisReady) {
      await redisClient.del(key);
      logCacheEvent(`DEL ${key}`);
      return;
    }

    memoryCache.delete(key);
    logCacheEvent(`DEL ${key} (memory)`);
  } catch (error) {
    logger.error(`Unable to delete cache key ${key}`, error);
  }
};

export const invalidateCachePrefix = async (prefix: string): Promise<void> => {
  try {
    if (redisClient && redisReady) {
      const matchingKeys = await redisClient.keys(`${prefix}*`);

      if (matchingKeys.length > 0) {
        await redisClient.del(matchingKeys);
      }
    }

    deleteMemoryPrefix(prefix);
    logCacheEvent(`INVALIDATE ${prefix}*`);
  } catch (error) {
    logger.error(`Unable to invalidate cache prefix ${prefix}`, error);
  }
};
