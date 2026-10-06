import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CopywritingService } from './copywriting.service';

describe('CopywritingService', () => {
  const prisma = {
    journey: { findFirst: vi.fn() },
    photo: { findFirst: vi.fn() },
    copywriting: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collect: { upsert: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const deepSeek = { generateCopywriting: vi.fn() };
  const cache = {
    // 透传：直接执行 factory（模拟缓存未命中）
    remember: vi.fn((_k: string, _t: number, factory: () => Promise<unknown>) => factory()),
    delPattern: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  };
  let service: CopywritingService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache.remember.mockImplementation(
      (_k: string, _t: number, factory: () => Promise<unknown>) => factory(),
    );
    service = new CopywritingService(prisma as never, deepSeek as never, cache as never);
  });

  describe('findPublic', () => {
    it('默认分页应缓存并返回列表', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 1 }], 1]);

      const res = await service.findPublic({});

      expect(cache.remember).toHaveBeenCalledWith('cp:public:p1:s20', 30, expect.any(Function));
      expect(res).toEqual({ list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 });
    });

    it('传入页码应体现在缓存键中', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const res = await service.findPublic({ page: 3, pageSize: 10 });
      expect(cache.remember).toHaveBeenCalledWith('cp:public:p3:s10', 30, expect.any(Function));
      expect(res.page).toBe(3);
      expect(res.pageSize).toBe(10);
    });
  });

  describe('findOne', () => {
    it('不存在应抛 404', async () => {
      prisma.copywriting.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('非本人应抛 404', async () => {
      prisma.copywriting.findFirst.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('本人可获取详情', async () => {
      const item = { id: 1, userId: 1 };
      prisma.copywriting.findFirst.mockResolvedValue(item);
      await expect(service.findOne(1, 1)).resolves.toEqual(item);
    });
  });

  describe('like', () => {
    it('文案不存在或未公开应抛 404', async () => {
      prisma.copywriting.findFirst.mockResolvedValue(null);
      await expect(service.like(1)).rejects.toThrow(NotFoundException);
      expect(prisma.copywriting.update).not.toHaveBeenCalled();
    });

    it('点赞成功应自增并失效列表缓存', async () => {
      prisma.copywriting.findFirst.mockResolvedValue({ id: 1, isPublic: true });
      prisma.copywriting.update.mockResolvedValue({ likesCount: 3 });

      const res = await service.like(1);

      expect(prisma.copywriting.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { likesCount: { increment: 1 } },
      });
      expect(res).toEqual({ likesCount: 3 });
      expect(cache.delPattern).toHaveBeenCalledWith('cp:public:*');
    });
  });

  describe('collect', () => {
    it('文案不存在或未公开应抛 404', async () => {
      prisma.copywriting.findFirst.mockResolvedValue(null);
      await expect(service.collect(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('收藏成功应 upsert 幂等并返回 null', async () => {
      prisma.copywriting.findFirst.mockResolvedValue({ id: 5, isPublic: true });
      prisma.collect.upsert.mockResolvedValue({});

      const res = await service.collect(1, 5);

      expect(prisma.collect.upsert).toHaveBeenCalledWith({
        where: { userId_copywritingId: { userId: 1, copywritingId: 5 } },
        update: {},
        create: { userId: 1, copywritingId: 5 },
      });
      expect(res).toBeNull();
    });
  });

  describe('remove', () => {
    it('删除公开文案应失效列表缓存', async () => {
      prisma.copywriting.findFirst.mockResolvedValue({ id: 1, userId: 1, isPublic: true });
      prisma.copywriting.delete.mockResolvedValue({});

      const res = await service.remove(1, 1);

      expect(prisma.copywriting.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(cache.delPattern).toHaveBeenCalledWith('cp:public:*');
      expect(res).toBeNull();
    });

    it('删除私有文案不应触碰列表缓存', async () => {
      prisma.copywriting.findFirst.mockResolvedValue({ id: 1, userId: 1, isPublic: false });
      prisma.copywriting.delete.mockResolvedValue({});

      await service.remove(1, 1);

      expect(cache.delPattern).not.toHaveBeenCalled();
    });
  });
});
