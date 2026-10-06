import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatsService } from './stats.service';

/** 用本地时间构造日期，避免 UTC 解析在负时区下漂一天 */
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('StatsService', () => {
  const prisma = {
    journey: { findMany: vi.fn() },
    copywriting: { count: vi.fn() },
    diary: { findMany: vi.fn() },
  };
  // 缓存透传：remember 直接执行 factory（等价于 Redis 未命中的真实路径）
  const cache = {
    remember: vi.fn((_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()),
  };
  let service: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache.remember.mockImplementation(
      (_key: string, _ttl: number, factory: () => Promise<unknown>) => factory(),
    );
    service = new StatsService(prisma as never, cache as never);
  });

  it('应聚合总览/城市/心情/每月旅程', async () => {
    prisma.journey.findMany.mockResolvedValue([
      {
        id: 1,
        startDate: d(2026, 9, 1),
        endDate: d(2026, 9, 3),
        destinations: ['杭州', '西湖'],
        _count: { photos: 4, diaries: 2 },
      },
      {
        id: 2,
        startDate: d(2026, 8, 10),
        endDate: d(2026, 8, 10),
        destinations: ['杭州'],
        _count: { photos: 1, diaries: 1 },
      },
    ]);
    prisma.copywriting.count.mockResolvedValue(7);
    prisma.diary.findMany.mockResolvedValue([
      { mood: 'peaceful' },
      { mood: 'peaceful' },
      { mood: '自定义心情' },
    ]);

    const res = await service.getMyStats(1);

    expect(cache.remember).toHaveBeenCalledWith('stats:user:1', 60, expect.any(Function));
    // 9/1→9/3 = 3 天，8/10 单日 = 1 天
    expect(res.overview).toEqual({
      journeys: 2,
      totalDays: 4,
      photos: 5,
      diaries: 3,
      copywritings: 7,
    });
    expect(res.cities).toEqual([
      { name: '杭州', count: 2 },
      { name: '西湖', count: 1 },
    ]);
    // 预设 key 映射中文，自定义原样透传；按 count 降序
    expect(res.moodDistribution).toEqual([
      { mood: 'peaceful', label: '平静', count: 2 },
      { mood: '自定义心情', label: '自定义心情', count: 1 },
    ]);
    expect(res.favoriteMood).toBe('peaceful');
    // 按月升序
    expect(res.monthlyJourneys).toEqual([
      { month: '2026-08', count: 1 },
      { month: '2026-09', count: 1 },
    ]);
  });

  it('无数据时各项应为空/零值', async () => {
    prisma.journey.findMany.mockResolvedValue([]);
    prisma.copywriting.count.mockResolvedValue(0);
    prisma.diary.findMany.mockResolvedValue([]);

    const res = await service.getMyStats(1);

    expect(res.overview).toEqual({
      journeys: 0,
      totalDays: 0,
      photos: 0,
      diaries: 0,
      copywritings: 0,
    });
    expect(res.cities).toEqual([]);
    expect(res.moodDistribution).toEqual([]);
    expect(res.favoriteMood).toBeNull();
    expect(res.monthlyJourneys).toEqual([]);
  });

  it('destinations 非数组时应安全跳过', async () => {
    prisma.journey.findMany.mockResolvedValue([
      {
        id: 1,
        startDate: d(2026, 9, 1),
        endDate: d(2026, 9, 1),
        destinations: null,
        _count: { photos: 0, diaries: 0 },
      },
    ]);
    prisma.copywriting.count.mockResolvedValue(0);
    prisma.diary.findMany.mockResolvedValue([]);

    const res = await service.getMyStats(1);
    expect(res.cities).toEqual([]);
    expect(res.overview.totalDays).toBe(1);
  });
});
