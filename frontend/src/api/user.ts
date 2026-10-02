import request from './request'

/**
 * 个人资料（个人中心页使用）
 */
export interface UserProfile {
  id: number
  username: string
  nickname: string | null
  email: string
  avatar: string | null
  bio: string | null
  createdAt: string
  _count: {
    journeys: number
    copywritings: number
    collects: number
  }
}

export interface UpdateProfileData {
  nickname?: string
  bio?: string
  avatar?: string
}

/**
 * 获取个人资料（含旅程/文案/收藏计数）
 *
 * 后端接口：GET /api/users/profile
 */
export function getProfile() {
  return request.get<any, { code: number; message: string; data: UserProfile }>('/users/profile')
}

/**
 * 更新昵称/简介/头像
 *
 * 后端接口：PUT /api/users/profile
 */
export function updateProfile(data: UpdateProfileData) {
  return request.put<any, { code: number; message: string; data: UserProfile }>(
    '/users/profile',
    data,
  )
}
