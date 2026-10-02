import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** 个人资料安全字段（不含 password） */
const PROFILE_SELECT = {
  id: true,
  username: true,
  nickname: true,
  email: true,
  avatar: true,
  bio: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 个人中心资料（含旅程/文案/收藏计数）
   */
  async getProfile(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...PROFILE_SELECT,
        _count: {
          select: { journeys: true, copywritings: true, collects: true },
        },
      },
    });
  }

  /**
   * 更新昵称/简介/头像（空字符串视为清空）
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname || null } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio || null } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar || null } : {}),
      },
      select: PROFILE_SELECT,
    });
  }
}
