import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * 全局缓存模块：封装 Redis（ioredis），对上层提供 get/set/del/remember 能力。
 * 采用「优雅降级」设计——Redis 未配置或连不上时自动退化为直查数据库，
 * 绝不影响接口可用性（与本项目 DeepSeek 缺 key 降级同一思路）。
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
