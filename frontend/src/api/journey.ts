import request from './request'
import type { Diary } from './diary'

/**
 * 旅程状态
 */
export type JourneyStatus = 'ongoing' | 'archived'

/**
 * 旅程（列表项）
 */
export interface Journey {
  id: number
  userId: number
  title: string
  coverImage: string | null
  destinations: string[]
  startDate: string
  endDate: string
  status: JourneyStatus
  isPublic: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  /** 旅程下的日记/照片数量（后端 _count 返回） */
  _count?: {
    diaries: number
    photos: number
  }
}

/**
 * 旅程详情（含日记列表）
 */
export interface JourneyDetail extends Journey {
  diaries?: Diary[]
}

export interface CreateJourneyData {
  title: string
  destinations: string[]
  startDate: string // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
  coverImage?: string | null
  tags?: string[]
}

export interface UpdateJourneyData extends Partial<CreateJourneyData> {
  status?: JourneyStatus
  isPublic?: boolean
}

/**
 * 获取我的旅程列表
 */
export function getJourneys() {
  return request.get<any, { code: number; message: string; data: Journey[] }>('/journeys')
}

/**
 * 获取旅程详情（含日记 + 照片）
 */
export function getJourney(id: number) {
  return request.get<any, { code: number; message: string; data: JourneyDetail }>(`/journeys/${id}`)
}

/**
 * 创建旅程
 */
export function createJourney(data: CreateJourneyData) {
  return request.post<any, { code: number; message: string; data: Journey }>('/journeys', data)
}

/**
 * 更新旅程
 */
export function updateJourney(id: number, data: UpdateJourneyData) {
  return request.put<any, { code: number; message: string; data: Journey }>(`/journeys/${id}`, data)
}

/**
 * 删除旅程
 */
export function deleteJourney(id: number) {
  return request.delete<any, { code: number; message: string; data: null }>(`/journeys/${id}`)
}

/**
 * 封存旅程
 */
export function archiveJourney(id: number) {
  return request.post<any, { code: number; message: string; data: Journey }>(
    `/journeys/${id}/archive`,
  )
}
