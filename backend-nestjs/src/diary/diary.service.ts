import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';

@Injectable()
export class DiaryService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建日记（旅程必须存在、属于当前用户、且未封存）
   */
  async create(userId: number, createDiaryDto: CreateDiaryDto) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: createDiaryDto.journeyId, userId },
    });

    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }
    if (journey.status === 'archived') {
      throw new ConflictException('旅程已封存，无法添加日记');
    }

    return this.prisma.diary.create({
      data: {
        journeyId: createDiaryDto.journeyId,
        date: new Date(createDiaryDto.date),
        title: createDiaryDto.title,
        content: createDiaryDto.content ?? '',
        mood: createDiaryDto.mood ?? null,
        locationName: createDiaryDto.locationName ?? null,
      },
      include: { photos: true },
    });
  }

  /**
   * 获取日记详情（含照片）
   */
  async findOne(userId: number, id: number) {
    const diary = await this.prisma.diary.findFirst({
      where: { id },
      include: {
        journey: true,
        photos: true,
      },
    });

    if (!diary || diary.journey.userId !== userId) {
      throw new NotFoundException('日记不存在');
    }

    return diary;
  }

  /**
   * 更新日记（已封存旅程不可编辑）
   */
  async update(userId: number, id: number, updateDiaryDto: UpdateDiaryDto) {
    const diary = await this.getOwnedDiary(userId, id);

    if (diary.journey.status === 'archived') {
      throw new ConflictException('旅程已封存，无法编辑日记');
    }

    const data: Record<string, unknown> = {};

    if (updateDiaryDto.title !== undefined) data.title = updateDiaryDto.title;
    if (updateDiaryDto.content !== undefined) data.content = updateDiaryDto.content;
    if (updateDiaryDto.mood !== undefined) data.mood = updateDiaryDto.mood;
    if (updateDiaryDto.locationName !== undefined) data.locationName = updateDiaryDto.locationName;
    if (updateDiaryDto.date !== undefined) {
      data.date = new Date(updateDiaryDto.date);
    }

    return this.prisma.diary.update({
      where: { id },
      data,
      include: { photos: true },
    });
  }

  /**
   * 删除日记（已封存旅程不可删除；关联照片自动解除引用）
   */
  async remove(userId: number, id: number) {
    const diary = await this.getOwnedDiary(userId, id);

    if (diary.journey.status === 'archived') {
      throw new ConflictException('旅程已封存，无法删除日记');
    }

    await this.prisma.diary.delete({
      where: { id },
    });

    return null;
  }

  /**
   * 查询属于当前用户的日记（含旅程信息用于归属校验）
   */
  private async getOwnedDiary(userId: number, id: number) {
    const diary = await this.prisma.diary.findFirst({
      where: { id },
      include: { journey: true },
    });

    if (!diary || diary.journey.userId !== userId) {
      throw new NotFoundException('日记不存在');
    }

    return diary;
  }
}
