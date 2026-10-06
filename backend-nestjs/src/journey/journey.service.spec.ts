import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JourneyService } from './journey.service';

describe('JourneyService', () => {
  const prisma = {
    journey: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    copywriting: { findMany: vi.fn() },
  };
  let service: JourneyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JourneyService(prisma as never);
  });

  describe('create', () => {
    const base = {
      title: '杭州之旅',
      destinations: ['杭州'],
      startDate: '2026-09-01',
      endDate: '2026-09-03',
    };

    it('结束日期早于开始日期应抛 400', async () => {
      await expect(
        service.create(1, { ...base, startDate: '2026-09-05', endDate: '2026-09-01' } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.journey.create).not.toHaveBeenCalled();
    });

    it('创建成功应转换日期并带 _count 返回', async () => {
      prisma.journey.create.mockResolvedValue({ id: 1 });
      const res = await service.create(1, base as never);

      expect(prisma.journey.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          title: '杭州之旅',
          destinations: ['杭州'],
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-03'),
          coverImage: null,
          tags: [],
        },
        include: { _count: { select: { diaries: true, photos: true } } },
      });
      expect(res).toEqual({ id: 1 });
    });
  });

  describe('findOne', () => {
    it('旅程不存在应抛 404', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('存在时返回详情', async () => {
      const journey = { id: 1, userId: 1, diaries: [] };
      prisma.journey.findFirst.mockResolvedValue(journey);
      await expect(service.findOne(1, 1)).resolves.toEqual(journey);
    });
  });

  describe('update', () => {
    it('已封存的旅程不可编辑应抛 409', async () => {
      prisma.journey.findFirst.mockResolvedValue({ id: 1, status: 'archived' });
      await expect(service.update(1, 1, { title: 'x' } as never)).rejects.toThrow(
        ConflictException,
      );
    });

    it('更新后的结束日期早于开始日期应抛 400', async () => {
      prisma.journey.findFirst.mockResolvedValue({
        id: 1,
        status: 'ongoing',
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-12'),
      });
      await expect(
        service.update(1, 1, { startDate: '2026-09-20' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('更新成功只提交传入字段', async () => {
      prisma.journey.findFirst.mockResolvedValue({
        id: 1,
        status: 'ongoing',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
      });
      prisma.journey.update.mockResolvedValue({ id: 1, title: '新标题' });

      const res = await service.update(1, 1, { title: '新标题' } as never);

      expect(prisma.journey.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { title: '新标题' } }),
      );
      expect(res.title).toBe('新标题');
    });
  });

  describe('archive', () => {
    it('重复封存应抛 409', async () => {
      prisma.journey.findFirst.mockResolvedValue({ id: 1, status: 'archived' });
      await expect(service.archive(1, 1)).rejects.toThrow(ConflictException);
    });

    it('封存成功应把状态改为 archived', async () => {
      prisma.journey.findFirst.mockResolvedValue({ id: 1, status: 'ongoing' });
      prisma.journey.update.mockResolvedValue({ id: 1, status: 'archived' });
      const res = await service.archive(1, 1);
      expect(prisma.journey.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'archived' } }),
      );
      expect(res.status).toBe('archived');
    });
  });

  describe('remove', () => {
    it('非本人/不存在应抛 404 且不删除', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);
      await expect(service.remove(1, 99)).rejects.toThrow(NotFoundException);
      expect(prisma.journey.delete).not.toHaveBeenCalled();
    });

    it('删除成功返回 null', async () => {
      prisma.journey.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.journey.delete.mockResolvedValue({ id: 1 });
      const res = await service.remove(1, 1);
      expect(prisma.journey.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(res).toBeNull();
    });
  });
});
