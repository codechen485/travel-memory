import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeepSeekService } from './deepseek.service';
import { CreateCopywritingDto, GenerateCopywritingDto, UpdateCopywritingDto } from './dto/create-copywriting.dto';

@Injectable()
export class CopywritingService {
  constructor(
    private prisma: PrismaService,
    private deepSeek: DeepSeekService,
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

    if (dto.photoId) {
      const photo = await this.prisma.photo.findFirst({
        where: { id: dto.photoId, journeyId: dto.journeyId },
      });
      if (!photo) {
        throw new NotFoundException('照片不存在或不属于该旅程');
      }
    }

    // MVP 阶段：场景 + 心情直接构造 Prompt（照片视觉识别第二阶段接入多模态）
    return this.deepSeek.generateCopywriting(dto.sceneTag, dto.mood);
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

    return this.prisma.copywriting.create({
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
  }

  /**
   * 我的文案列表（支持旅程/心情/场景筛选，按创建时间倒序）
   */
  async findMy(
    userId: number,
    query: { journeyId?: number; mood?: string; sceneTag?: string },
  ) {
    return this.prisma.copywriting.findMany({
      where: {
        userId,
        ...(query.journeyId ? { journeyId: query.journeyId } : {}),
        ...(query.mood ? { mood: query.mood as never } : {}),
        ...(query.sceneTag ? { sceneTag: query.sceneTag } : {}),
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

    return this.prisma.copywriting.update({
      where: { id },
      data,
      include: { photo: true, journey: { select: { id: true, title: true } } },
    });
  }

  /**
   * 删除文案
   */
  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.prisma.copywriting.delete({ where: { id } });
    return null;
  }
}
