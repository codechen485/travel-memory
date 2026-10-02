import request from './request'

/** 心情分布项 */
export interface MoodStatItem {
  mood: string
  label: string
  count: number
}

/** 城市足迹项 */
export interface CityStatItem {
  name: string
  count: number
}

/** 每月旅程数项 */
export interface MonthlyStatItem {
  month: string
  count: number
}

/** GET /stats 返回的统计聚合结果 */
export interface MyStats {
  overview: {
    journeys: number
    totalDays: number
    photos: number
    diaries: number
    copywritings: number
  }
  cities: CityStatItem[]
  moodDistribution: MoodStatItem[]
  favoriteMood: string | null
  monthlyJourneys: MonthlyStatItem[]
}

/** 我的旅行统计（后端一次聚合，替代前端逐旅程拉取） */
export function getMyStats() {
  return request.get<any, { code: number; message: string; data: MyStats }>('/stats')
}
