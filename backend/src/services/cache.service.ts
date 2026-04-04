import { createClient } from "redis";
import { env } from "../utils/config";
import { logger } from "../utils/logger";

type CacheRecord = {
  value: string;
  expiresAt: number;
};

type CacheClient = {
  isOpen: boolean;
  on(event: "error", listener: (error: Error) => void): unknown;
  connect(): Promise<void>;
  quit(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  del(keys: string[]): Promise<unknown>;
  flushDb(): Promise<unknown>;
};

type CacheClientFactory = (options: { url: string }) => CacheClient;

const defaultCacheClientFactory: CacheClientFactory = ({ url }) =>
  createClient({ url }) as unknown as CacheClient;

export class CacheService {
  private redisClient: CacheClient | null = null;
  private memory = new Map<string, CacheRecord>();

  constructor(private readonly clientFactory: CacheClientFactory = defaultCacheClientFactory) {}

  async connect() {
    if (!env.REDIS_ENABLED) {
      logger.info("Redis cache disabled, using in-memory cache");
      return;
    }

    const redisClient = this.clientFactory({ url: env.redisUrl });

    redisClient.on("error", (error) => {
      logger.error(
        { error: error.message },
        "Redis client error, requests will continue without hard failure"
      );
    });

    try {
      await redisClient.connect();
      this.redisClient = redisClient;
      logger.info("Redis cache connected");
    } catch (error) {
      this.redisClient = null;
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown Redis error" },
        "Redis cache connection failed, falling back to in-memory cache"
      );

      if (redisClient.isOpen) {
        await redisClient.quit().catch(() => undefined);
      }
    }
  }

  async disconnect() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }

  getHealthStatus() {
    return this.redisClient?.isOpen ? ("up" as const) : ("degraded" as const);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisClient?.isOpen) {
      const value = await this.redisClient.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    const cached = this.memory.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }

    return JSON.parse(cached.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    const serialized = JSON.stringify(value);

    if (this.redisClient?.isOpen) {
      await this.redisClient.set(key, serialized, { EX: ttlSeconds });
      return;
    }

    this.memory.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);

    if (existing !== null) {
      return existing;
    }

    const loaded = await loader();
    await this.set(key, loaded, ttlSeconds);
    return loaded;
  }

  async invalidatePrefix(prefix: string) {
    if (this.redisClient?.isOpen) {
      const keys = await this.redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return;
    }

    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }
  }

  async clear() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.flushDb();
      return;
    }

    this.memory.clear();
  }
}

export const cacheService = new CacheService();
