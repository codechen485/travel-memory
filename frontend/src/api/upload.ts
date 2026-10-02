import request from './request'

/**
 * 通用图片上传（旅程封面/头像等）：只存文件返回 URL，不创建照片记录
 *
 * 后端接口：POST /api/photos/upload-image
 */
export function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, { code: number; message: string; data: { url: string } }>(
    '/photos/upload-image',
    formData,
  )
}
