import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 缓存服务（优雅降级）。
 *
 * 设计要点：
 * - 未配置 REDIS_HOST，或 Redis 连接失败时，本服务的所有方法都安全短路：
 *   get 返回 null（视为未命中）、set/del 变为空操作，调用方自然回落到查库。
 * - 因此「关掉 Redis」等价于「没有缓存」，接口照常工作，绝不抛错。
 * - retryStrategy 限制重试次数后停止，避免 Redis 长期缺失时无限重连刷日志。
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  /** Redis 是否可用（连接就绪且未报错） */
  private available = false;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    if (!host) {
      this.logger.warn('未配置 REDIS_HOST，缓存已关闭（接口将直接查库，不影响可用性）');
      return;
    }

    const port = Number(this.config.get<string>('REDIS_PORT')) || 6379;
    try {
      this.client = new Redis({
        host,
        port,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        // 连续失败若干次后放弃重连（返回 null 停止），降级为直查数据库
        retryStrategy: (times) => (times < 3 ? 200 : null),
      });

      this.client.on('ready', () => {
        this.available = true;
        this.logger.log(`Redis 缓存已连接 ${host}:${port}`);
      });
      this.client.on('error', (err) => {
        this.available = false;
        this.logger.debug(`Redis 不可用，已降级为直查数据库: ${err.message}`);
      });

      // 主动探测一次（不阻塞启动）；失败由 error 事件捕获并降级
      this.client.connect().catch(() => {
        this.available = false;
      });
    } catch {
      this.client = null;
      this.available = false;
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /** 缓存是否处于可用状态 */
  get enabled(): boolean {
    return this.available && this.client !== null;
  }

  /** 读取并反序列化；未命中或不可用时返回 null */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  /** 写入并设置过期秒数；不可用时静默跳过 */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      /* 忽略：写缓存失败不影响主流程 */
    }
  }

  /** 删除单个键 */
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* 忽略 */
    }
  }

  /**
   * 按前缀批量失效（用于列表类缓存在数据变更后清理）。
   * 数据量小，使用 KEYS 足够；生产超大规模应改 SCAN。
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      /* 忽略 */
    }
  }

  /**
   * 读缓存，未命中则执行 factory 计算并回填。
   * Redis 不可用时等价于直接执行 factory。
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
