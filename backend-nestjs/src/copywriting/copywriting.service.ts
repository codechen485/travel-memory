import { promises as fs } from 'fs';
import path from 'path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeepSeekService } from './deepseek.service';
import { CacheService } from '../cache/cache.service';
import { CreateCopywritingDto, GenerateCopywritingDto, UpdateCopywritingDto } from './dto/create-copywriting.dto';

@Injectable()
export class CopywritingService {
  constructor(
    private prisma: PrismaService,
    private deepSeek: DeepSeekService,
    private cache: CacheService,
  ) {}

  /**
   * AI 生成文案（不落库）：校验旅程归属与照片归属后调用 DeepSeek
   */
  async generate(userId: number, dto: GenerateCopywritingDto) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: dto.journeyId, userId },
    });
    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }

    let photoUrl = dto.photoUrl ?? null;
    if (dto.photoId) {
      const photo = await this.prisma.photo.findFirst({
        where: { id: dto.photoId, journeyId: dto.journeyId },
      });
      if (!photo) {
        throw new NotFoundException('照片不存在或不属于该旅程');
      }
      photoUrl = photo.originalUrl;
    }

    // 多模态：把本地照片读成 base64 交给 deepseek-flash 自行识别场景
    const imageDataUrl = photoUrl ? await this.toImageDataUrl(photoUrl) : null;
    return this.deepSeek.generateCopywriting({ mood: dto.mood ?? null, imageDataUrl });
  }

  /** 把 /uploads/xxx 的本地照片读成 base64 data URL；读取失败时返回 null（降级为纯文本） */
  private async toImageDataUrl(url: string): Promise<string | null> {
    try {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(url));
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.gif'
            ? 'image/gif'
            : ext === '.webp'
              ? 'image/webp'
              : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.warn('读取照片失败，降级为纯文本生成:', url, error);
      return null;
    }
  }

  /**
   * 保存文案
   */
  async create(userId: number, dto: CreateCopywritingDto) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: dto.journeyId, userId },
    });
    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }

    if (dto.photoId) {
      const photo = await this.prisma.photo.findFirst({
        where: { id: dto.photoId, journeyId: dto.journeyId },
      });
      if (!photo) {
        throw new NotFoundException('照片不存在或不属于该旅程');
      }
    }

    const created = await this.prisma.copywriting.create({
      data: {
        userId,
        journeyId: dto.journeyId,
        photoId: dto.photoId ?? null,
        sceneTag: dto.sceneTag,
        mood: dto.mood ?? null,
        shortVersion: dto.shortVersion,
        narrativeVersion: dto.narrativeVersion,
        poeticVersion: dto.poeticVersion,
        finalVersion: dto.finalVersion,
        isPublic: dto.isPublic ?? false,
      },
      include: { photo: true, journey: { select: { id: true, title: true } } },
    });
    if (created.isPublic) await this.invalidatePublicCache();
    return created;
  }

  /**
   * 我的文案列表（支持旅程/心情筛选，按创建时间倒序）
   */
  async findMy(
    userId: number,
    query: { journeyId?: number; mood?: string },
  ) {
    return this.prisma.copywriting.findMany({
      where: {
        userId,
        ...(query.journeyId ? { journeyId: query.journeyId } : {}),
        ...(query.mood ? { mood: query.mood } : {}),
      },
      include: { photo: true, journey: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 文案详情（归属权校验）
   */
  async findOne(userId: number, id: number) {
    const copywriting = await this.prisma.copywriting.findFirst({
      where: { id },
      include: { photo: true, journey: { select: { id: true, title: true } } },
    });

    if (!copywriting || copywriting.userId !== userId) {
      throw new NotFoundException('文案不存在');
    }

    return copywriting;
  }

  /**
   * 更新文案（最终版本 / 公开状态 / 场景 / 心情）
   */
  async update(userId: number, id: number, dto: UpdateCopywritingDto) {
    await this.findOne(userId, id);

    const data: Record<string, unknown> = {};
    if (dto.finalVersion !== undefined) data.finalVersion = dto.finalVersion;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.sceneTag !== undefined) data.sceneTag = dto.sceneTag;
    if (dto.mood !== undefined) data.mood = dto.mood;

    const updated = await this.prisma.copywriting.update({
      where: { id },
      data,
      include: { photo: true, journey: { select: { id: true, title: true } } },
    });
    // 公开状态/内容变化都可能影响灵感漂流列表，保守失效
    if (updated.isPublic || dto.isPublic !== undefined) await this.invalidatePublicCache();
    return updated;
  }

  /**
   * 删除文案
   */
  async remove(userId: number, id: number) {
    const target = await this.findOne(userId, id);
    await this.prisma.copywriting.delete({ where: { id } });
    if (target.isPublic) await this.invalidatePublicCache();
    return null;
  }

  /**
   * 灵感漂流：公开文案分页列表（不返回用户信息，匿名展示）
   * 匿名高频读、翻页重复命中率高，用 Redis 缓存 30s；任何影响列表的写操作会主动失效。
   */
  async findPublic(query: { page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.cache.remember(`cp:public:p${page}:s${pageSize}`, 30, () =>
      this.queryPublic(page, pageSize),
    );
  }

  private async queryPublic(page: number, pageSize: number) {
    const where = {
      isPublic: true,
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.copywriting.findMany({
        where,
        select: {
          id: true,
          sceneTag: true,
          mood: true,
          shortVersion: true,
          narrativeVersion: true,
          poeticVersion: true,
          finalVersion: true,
          isPublic: true,
          likesCount: true,
          createdAt: true,
          photo: {
            select: { id: true, originalUrl: true, thumbnailUrl: true },
          },
          journey: {
            select: { id: true, title: true },
          },
        },
        orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.copywriting.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /** 失效全部公开文案列表缓存（分页键前缀匹配） */
  private invalidatePublicCache() {
    return this.cache.delPattern('cp:public:*');
  }

  /**
   * 点赞公开文案（likesCount +1）
   */
  async like(id: number) {
    const copywriting = await this.prisma.copywriting.findFirst({
      where: { id, isPublic: true },
    });
    if (!copywriting) {
      throw new NotFoundException('文案不存在或未公开');
    }

    const updated = await this.prisma.copywriting.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });

    // 点赞数影响列表排序（orderBy likesCount），失效缓存
    await this.invalidatePublicCache();
    return { likesCount: updated.likesCount };
  }

  /**
   * 我的收藏列表（按收藏时间降序，个人中心使用）
   */
  async findCollected(userId: number) {
    const collects = await this.prisma.collect.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        copywriting: {
          select: {
            id: true,
            sceneTag: true,
            mood: true,
            shortVersion: true,
            narrativeVersion: true,
            poeticVersion: true,
            finalVersion: true,
            isPublic: true,
            likesCount: true,
            createdAt: true,
            photo: {
              select: { id: true, originalUrl: true, thumbnailUrl: true },
            },
            journey: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    return collects.map((item) => ({
      ...item.copywriting,
      collectedAt: item.createdAt,
    }));
  }

  /**
   * 收藏公开文案（幂等：重复收藏不报错）
   */
  async collect(userId: number, id: number) {
    const copywriting = await this.prisma.copywriting.findFirst({
      where: { id, isPublic: true },
    });
    if (!copywriting) {
      throw new NotFoundException('文案不存在或未公开');
    }

    await this.prisma.collect.upsert({
      where: { userId_copywritingId: { userId, copywritingId: id } },
      update: {},
      create: { userId, copywritingId: id },
    });

    return null;
  }
}
