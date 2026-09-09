import request from './request'

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  userId: number
  username: string
  email: string
  avatar: string | null
}

/**
 * 用户注册
 */
export function register(data: RegisterData) {
  return request.post<any, { code: number; message: string; data: AuthResponse }>(
    '/auth/register',
    data,
  )
}

/**
 * 用户登录
 */
export function login(data: LoginData) {
  return request.post<any, { code: number; message: string; data: AuthResponse }>(
    '/auth/login',
    data,
  )
}
