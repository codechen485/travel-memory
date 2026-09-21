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
}
