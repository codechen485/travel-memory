import request from './request'

/**
 * 心情：预设 key 或用户自定义文本（后端已改为自由字符串）
 */
export type Mood = string

/**
 * 日记条目（旅程详情接口会包含日记列表）
 */
export interface Diary {
  id: number
  journeyId: number
  date: string
  title: string
  content: string // 富文本 HTML
  mood: Mood | null
  locationName: string | null
  createdAt: string
  updatedAt: string
  photos?: DiaryPhoto[]
}

/**
 * 日记关联照片
 */
export interface DiaryPhoto {
  id: number
  journeyId: number
  diaryId: number | null
  originalUrl: string
  thumbnailUrl: string
  /** 拍摄时间（EXIF 提取，可空） */
  exifTakenAt?: string | null
  /** 拍摄地点坐标（后端 Prisma Decimal 序列化后可能是字符串） */
  latitude?: number | string | null
  longitude?: number | string | null
}

export interface CreateDiaryData {
  journeyId: number
  date: string
  title: string
  content: string
  mood?: Mood
  locationName?: string
}

export interface UpdateDiaryData extends Partial<CreateDiaryData> {}

/**
 * 创建日记
 */
export function createDiary(data: CreateDiaryData) {
  return request.post<any, { code: number; message: string; data: Diary }>('/diaries', data)
}

/**
 * 获取日记详情
 */
export function getDiary(id: number) {
  return request.get<any, { code: number; message: string; data: Diary }>(`/diaries/${id}`)
}

/**
 * 更新日记
 */
export function updateDiary(id: number, data: UpdateDiaryData) {
  return request.put<any, { code: number; message: string; data: Diary }>(`/diaries/${id}`, data)
}

/**
 * 删除日记
 */
export function deleteDiary(id: number) {
  return request.delete<any, { code: number; message: string; data: null }>(`/diaries/${id}`)
}
