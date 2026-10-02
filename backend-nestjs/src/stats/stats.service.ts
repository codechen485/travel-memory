import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 心情中文标签（与前端 utils/mood.ts 保持一致） */
const MOOD_LABELS: Record<string, string> = {
  peaceful: '平静',
  amazed: '震撼',
  miss: '思念',
  relieved: '释怀',
  expect: '期待',
  reluctant: '不舍',
  free: '自由',
  healed: '治愈',
};

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 我的旅行统计：总览 + 城市足迹 + 心情分布 + 每月旅程数
   */
  async getMyStats(userId: number) {
    const journeys = await this.prisma.journey.findMany({
      where: { userId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        destinations: true,
        _count: { select: { photos: true, diaries: true } },
      },
    });

    const journeyIds = journeys.map((journey) => journey.id);

    const [copywritingCount, diaries] = await Promise.all([
      this.prisma.copywriting.count({ where: { userId } }),
      this.prisma.diary.findMany({
        where: { journeyId: { in: journeyIds } },
        select: { mood: true },
      }),
    ]);

    // 总览
    const photoCount = journeys.reduce((sum, j) => sum + j._count.photos, 0);
    const diaryCount = journeys.reduce((sum, j) => sum + j._count.diaries, 0);
    const totalDays = journeys.reduce((sum, j) => {
      const diff = j.endDate.getTime() - j.startDate.getTime();
      return sum + Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
    }, 0);

    // 城市足迹（destinations 合并计数，按次数降序）
    const cityCounter = new Map<string, number>();
    for (const journey of journeys) {
      const destinations = Array.isArray(journey.destinations)
        ? (journey.destinations as string[])
        : [];
      for (const city of destinations) {
        const name = city.trim();
        if (!name) continue;
        cityCounter.set(name, (cityCounter.get(name) ?? 0) + 1);
      }
    }
    const cities = [...cityCounter.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 心情分布（日记 mood 计数）+ 最常用心情
    const moodCounter = new Map<string, number>();
    for (const diary of diaries) {
      if (!diary.mood) continue;
      moodCounter.set(diary.mood, (moodCounter.get(diary.mood) ?? 0) + 1);
    }
    const moodDistribution = [...moodCounter.entries()]
      .map(([mood, count]) => ({ mood, label: MOOD_LABELS[mood] ?? mood, count }))
      .sort((a, b) => b.count - a.count);
    const favoriteMood = moodDistribution[0]?.mood ?? null;

    // 每月旅程数（yyyy-MM 分组，升序）
    const monthCounter = new Map<string, number>();
    for (const journey of journeys) {
      const month = `${journey.startDate.getFullYear()}-${String(
        journey.startDate.getMonth() + 1,
      ).padStart(2, '0')}`;
      monthCounter.set(month, (monthCounter.get(month) ?? 0) + 1);
    }
    const monthlyJourneys = [...monthCounter.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));

    return {
      overview: {
        journeys: journeys.length,
        totalDays,
        photos: photoCount,
        diaries: diaryCount,
        copywritings: copywritingCount,
      },
      cities,
      moodDistribution,
      favoriteMood,
      monthlyJourneys,
    };
  }
}
