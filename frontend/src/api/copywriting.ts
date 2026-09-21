import request from './request'
import type { Mood } from './diary'
import type { PhotoInfo } from './photo'

/**
 * 文案风格类型
 */
export type CopywritingStyle = 'short' | 'narrative' | 'poetic'

/**
 * 已保存的文案
 */
export interface Copywriting {
  id: number
  userId: number
  photoId: number | null
  journeyId: number
  sceneTag: string
  mood: Mood | null
  shortVersion: string
  narrativeVersion: string
  poeticVersion: string
  finalVersion: string
  isPublic: boolean
  likesCount: number
  createdAt: string
  updatedAt: string
  photo?: PhotoInfo | null
  journey?: { id: number; title: string } | null
}

/**
 * AI 生成结果（未保存）
 */
export interface GeneratedCopywriting {
  scene: string
  shortVersion: string
  narrativeVersion: string
  poeticVersion: string
}

export interface GenerateCopywritingParams {
  /** 已上传照片的 ID（从旅程中选择时传） */
  photoId?: number
  /** 照片 URL（新上传时后端已返回记录，一般与 photoId 二选一） */
  photoUrl?: string
  /** 场景标签（海边/山巅/古镇/日落/森林/城市...） */
  sceneTag: string
  /** 心情 */
  mood: Mood
  /** 归属旅程 */
  journeyId?: number
}

export interface SaveCopywritingData {
  photoId?: number | null
  journeyId: number
  sceneTag: string
  mood?: Mood
  shortVersion: string
  narrativeVersion: string
  poeticVersion: string
  /** 用户最终采用的版本（编辑后的文案） */
  finalVersion: string
  /** 是否匿名公开到灵感漂流 */
  isPublic?: boolean
}

export interface CopywritingQuery {
  journeyId?: number
  mood?: Mood
  sceneTag?: string
}

/**
 * AI 生成文案（返回 3 种风格，不落库）
 *
 * 后端接口：POST /api/copywritings/generate
 */
export function generateCopywriting(params: GenerateCopywritingParams) {
  return request.post<any, { code: number; message: string; data: GeneratedCopywriting }>(
    '/copywritings/generate',
    params,
  )
}

/**
 * 保存文案
 *
 * 后端接口：POST /api/copywritings
 */
export function saveCopywriting(data: SaveCopywritingData) {
  return request.post<any, { code: number; message: string; data: Copywriting }>(
    '/copywritings',
    data,
  )
}

/**
 * 我的文案集（支持按旅程/心情/场景筛选）
 *
 * 后端接口：GET /api/copywritings/my
 */
export function getMyCopywritings(query: CopywritingQuery = {}) {
  return request.get<any, { code: number; message: string; data: Copywriting[] }>(
    '/copywritings/my',
    { params: query },
  )
}

/**
 * 文案详情
 *
 * 后端接口：GET /api/copywritings/{id}
 */
export function getCopywriting(id: number) {
  return request.get<any, { code: number; message: string; data: Copywriting }>(
    `/copywritings/${id}`,
  )
}

/**
 * 更新文案（编辑最终版本 / 切换公开状态）
 *
 * 后端接口：PUT /api/copywritings/{id}
 */
export function updateCopywriting(
  id: number,
  data: Partial<Omit<SaveCopywritingData, 'journeyId'>>,
) {
  return request.put<any, { code: number; message: string; data: Copywriting }>(
    `/copywritings/${id}`,
    data,
  )
}

/**
 * 删除文案
 *
 * 后端接口：DELETE /api/copywritings/{id}
 */
export function deleteCopywriting(id: number) {
  return request.delete<any, { code: number; message: string; data: null }>(`/copywritings/${id}`)
}

/**
 * 公开文案查询参数（灵感漂流）
 */
export interface PublicCopywritingQuery {
  sceneTag?: string
  page?: number
  pageSize?: number
}

/**
 * 公开文案分页结果（灵感漂流）
 */
export interface PublicCopywritingPage {
  list: Copywriting[]
  total: number
  page: number
  pageSize: number
}

/**
 * 灵感漂流：公开文案分页列表
 *
 * 后端接口：GET /api/copywritings/public
 */
export function getPublicCopywritings(query: PublicCopywritingQuery = {}) {
  return request.get<any, { code: number; message: string; data: PublicCopywritingPage }>(
    '/copywritings/public',
    { params: query },
  )
}

/**
 * 点赞文案
 *
 * 后端接口：POST /api/copywritings/{id}/like
 */
export function likeCopywriting(id: number) {
  return request.post<any, { code: number; message: string; data: { likesCount: number } }>(
    `/copywritings/${id}/like`,
  )
}

/**
 * 收藏文案
 *
 * 后端接口：POST /api/copywritings/{id}/collect
 */
export function collectCopywriting(id: number) {
  return request.post<any, { code: number; message: string; data: null }>(
    `/copywritings/${id}/collect`,
  )
}
