import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';

@Injectable()
export class JourneyService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建旅程
   */
  async create(userId: number, createJourneyDto: CreateJourneyDto) {
    const { title, destinations, startDate, endDate, coverImage, tags } = createJourneyDto;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw new BadRequestException('结束日期不能早于开始日期');
    }

    return this.prisma.journey.create({
      data: {
        userId,
        title,
        destinations,
        startDate: start,
        endDate: end,
        coverImage: coverImage ?? null,
        tags: tags ?? [],
      },
      include: {
        _count: {
          select: { diaries: true, photos: true },
        },
      },
    });
  }

  /**
   * 查询我的旅程列表（按创建时间倒序）
   */
  async findAll(userId: number) {
    return this.prisma.journey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { diaries: true, photos: true },
        },
      },
    });
  }

  /**
   * 查询旅程详情（含日记 + 日记关联照片，按日期倒序）
   */
  async findOne(userId: number, id: number) {
    const journey = await this.prisma.journey.findFirst({
      where: { id, userId },
      include: {
        diaries: {
          orderBy: { date: 'desc' },
          include: {
            photos: true,
          },
        },
        _count: {
          select: { diaries: true, photos: true },
        },
      },
    });

    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }

    return journey;
  }

  /**
   * 更新旅程（已封存的旅程不可编辑）
   */
  async update(userId: number, id: number, updateJourneyDto: UpdateJourneyDto) {
    const existing = await this.getOwnedJourney(userId, id);

    if (existing.status === 'archived') {
      throw new ConflictException('旅程已封存，无法编辑');
    }

    const data: Record<string, unknown> = {};

    if (updateJourneyDto.title !== undefined) {
      data.title = updateJourneyDto.title;
    }
    if (updateJourneyDto.destinations !== undefined) {
      data.destinations = updateJourneyDto.destinations;
    }
    if (updateJourneyDto.coverImage !== undefined) {
      data.coverImage = updateJourneyDto.coverImage;
    }
    if (updateJourneyDto.tags !== undefined) {
      data.tags = updateJourneyDto.tags;
    }
    if (updateJourneyDto.isPublic !== undefined) {
      data.isPublic = updateJourneyDto.isPublic;
    }
    if (updateJourneyDto.startDate !== undefined) {
      data.startDate = new Date(updateJourneyDto.startDate);
    }
    if (updateJourneyDto.endDate !== undefined) {
      data.endDate = new Date(updateJourneyDto.endDate);
    }
    if (updateJourneyDto.status !== undefined) {
      data.status = updateJourneyDto.status;
    }

    // 校验更新后的日期范围
    const start = (data.startDate as Date) ?? existing.startDate;
    const end = (data.endDate as Date) ?? existing.endDate;
    if (end < start) {
      throw new BadRequestException('结束日期不能早于开始日期');
    }

    return this.prisma.journey.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { diaries: true, photos: true },
        },
      },
    });
  }

  /**
   * 删除旅程（级联删除日记和照片记录）
   */
  async remove(userId: number, id: number) {
    await this.getOwnedJourney(userId, id);

    await this.prisma.journey.delete({
      where: { id },
    });

    return null;
  }

  /**
   * 封存旅程（封存后不可编辑，只能翻阅）
   */
  async archive(userId: number, id: number) {
    const existing = await this.getOwnedJourney(userId, id);

    if (existing.status === 'archived') {
      throw new ConflictException('旅程已封存，无需重复封存');
    }

    return this.prisma.journey.update({
      where: { id },
      data: { status: 'archived' },
      include: {
        _count: {
          select: { diaries: true, photos: true },
        },
      },
    });
  }

  /**
   * 查询属于自己的旅程（不存在或不属于当前用户时抛出 404）
   */
  private async getOwnedJourney(userId: number, id: number) {
    const journey = await this.prisma.journey.findFirst({
      where: { id, userId },
    });

    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }

    return journey;
  }

  /**
   * 电子手帐：组装日记 + 照片 + 文案为 HTML 内容
   */
  async generateJournal(userId: number, id: number) {
    const journey = await this.prisma.journey.findFirst({
      where: { id, userId },
      include: {
        diaries: {
          orderBy: { date: 'asc' },
          include: { photos: true },
        },
      },
    });
    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }

    const copywritings = await this.prisma.copywriting.findMany({
      where: { journeyId: journey.id },
    });

    const destinations = Array.isArray(journey.destinations)
      ? (journey.destinations as string[])
      : [];
    const dayCount = Math.max(
      1,
      Math.ceil(
        (journey.endDate.getTime() - journey.startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );
    const photoCount = journey.diaries.reduce((sum, d) => sum + d.photos.length, 0);

    // 文案匹配：优先照片归属，其次同心情
    const findCopywriting = (photoIds: number[], mood: string | null) => {
      const photoIdSet = new Set(photoIds);
      return (
        copywritings.find((item) => item.photoId !== null && photoIdSet.has(item.photoId)) ??
        copywritings.find((item) => mood !== null && item.mood === mood)
      );
    };

    const moodLabels: Record<string, string> = {
      peaceful: '平静',
      amazed: '震撼',
      miss: '思念',
      relieved: '释怀',
      expect: '期待',
      reluctant: '不舍',
      free: '自由',
      healed: '治愈',
    };

    const fmt = (date: Date) =>
      `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

    const sections = journey.diaries
      .map((diary) => {
        const copywriting = findCopywriting(
          diary.photos.map((p) => p.id),
          diary.mood,
        );
        const plainText = diary.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();

        const photos = diary.photos
          .map(
            (photo) =>
              `<img src="${photo.originalUrl}" alt="${diary.title}" />`,
          )
          .join('');

        return `<section class="diary">
          <div class="diary-photos">${photos}</div>
          <div class="diary-text">
            <div class="diary-date">${fmt(diary.date)}${diary.mood ? ' · ' + (moodLabels[diary.mood] ?? diary.mood) : ''}${diary.locationName ? ' · ' + diary.locationName : ''}</div>
            <h3>${diary.title}</h3>
            <p>${plainText}</p>
            ${copywriting ? `<blockquote>${copywriting.finalVersion}</blockquote>` : ''}
          </div>
        </section>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${journey.title} · 电子手帐</title>
<style>
  body { font-family: "Source Han Sans", "Noto Sans SC", sans-serif; background: #f7f5f0; color: #3d3d3d; margin: 0; padding: 40px 20px; }
  .journal { max-width: 720px; margin: 0 auto; background: #fffdf7; border-radius: 8px; box-shadow: 0 10px 32px rgba(61,61,61,0.14); overflow: hidden; }
  .cover { padding: 48px 36px; background: #5b8c5a; color: #fff; }
  .cover h1 { margin: 0 0 12px; font-size: 28px; }
  .cover p { margin: 0 0 4px; opacity: 0.9; font-size: 14px; }
  .stats { display: flex; gap: 24px; padding: 16px 36px; background: rgba(91,140,90,0.08); font-size: 13px; color: #5b8c5a; }
  .diary { display: flex; gap: 16px; padding: 28px 36px; border-bottom: 1px solid #eef2ec; }
  .diary-photos { flex: 1; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
  .diary-photos img { width: 140px; height: 140px; object-fit: cover; border-radius: 4px; border: 4px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
  .diary-text { flex: 1.2; }
  .diary-date { font-size: 12px; color: #8fb996; letter-spacing: 1px; }
  .diary-text h3 { margin: 6px 0 10px; font-size: 18px; }
  .diary-text p { font-size: 14px; line-height: 2; margin: 0; white-space: pre-wrap; }
  blockquote { margin: 14px 0 0; padding: 10px 14px; background: rgba(232,192,122,0.12); border-left: 3px solid #e8c07a; font-size: 13px; color: #7a6a45; font-style: italic; }
  .end { padding: 36px; text-align: center; color: #a8c5a8; letter-spacing: 3px; }
</style>
</head>
<body>
  <div class="journal">
    <div class="cover">
      <h1>${journey.title}</h1>
      <p>${destinations.join(' · ')}</p>
      <p>${fmt(journey.startDate)} — ${fmt(journey.endDate)}</p>
    </div>
    <div class="stats"><span>${dayCount} 天</span><span>${journey.diaries.length} 篇日记</span><span>${photoCount} 张照片</span><span>${copywritings.length} 段文案</span></div>
    ${sections}
    <div class="end">这段旅程，已被好好安放。</div>
  </div>
</body>
</html>`;

    return {
      journeyId: journey.id,
      title: journey.title,
      html,
    };
  }
}
