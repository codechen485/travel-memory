import request from './request'

/** 照片的最小展示信息（DiaryPhoto 与 Photo 均可赋值给该类型） */
export interface PhotoInfo {
  id: number
  originalUrl: string
  thumbnailUrl: string
}

export interface Photo extends PhotoInfo {
  journeyId: number
  diaryId: number | null
  width?: number | null
  height?: number | null
  fileSize?: number | null
  exifTakenAt?: string | null
  latitude?: number | null
  longitude?: number | null
  aiSceneTags?: string[]
  createdAt: string
  updatedAt: string
}

export interface UploadPhotoParams {
  journeyId: number
  diaryId?: number
  file: File
  /** 上传进度回调（0-100） */
  onProgress?: (percent: number) => void
}

/**
 * 上传单张照片
 *
 * 后端接口：POST /api/photos/upload（multipart/form-data）
 */
export function uploadPhoto(params: UploadPhotoParams) {
  const { journeyId, diaryId, file, onProgress } = params

  const formData = new FormData()
  formData.append('file', file)
  formData.append('journeyId', String(journeyId))
  if (diaryId) {
    formData.append('diaryId', String(diaryId))
  }

  return request.post<any, { code: number; message: string; data: Photo }>(
    '/photos/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
      // 照片上传允许更长时间
      timeout: 60000,
    },
  )
}

/**
 * 获取照片详情
 */
export function getPhoto(id: number) {
  return request.get<any, { code: number; message: string; data: Photo }>(`/photos/${id}`)
}

/**
 * 删除照片
 */
export function deletePhoto(id: number) {
  return request.delete<any, { code: number; message: string; data: null }>(`/photos/${id}`)
}
