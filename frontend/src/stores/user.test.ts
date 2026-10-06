import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// mock 路由：store 的 logout 会调用 router.push('/login')
const pushMock = vi.fn()
vi.mock('@/router', () => ({
  default: { push: (...args: unknown[]) => pushMock(...args) },
}))

// mock 认证接口：避免真实 axios 与 naive-ui discrete api 进入测试环境
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))

import { useUserStore } from './user'
import { login, register } from '@/api/auth'

const loginMock = vi.mocked(login)
const registerMock = vi.mocked(register)

const sampleAuth = {
  token: 'tk-123',
  userId: 7,
  username: 'xing',
  email: 'x@y.com',
  avatar: null,
}

beforeEach(() => {
  localStorage.clear()
  pushMock.mockClear()
  loginMock.mockReset()
  registerMock.mockReset()
  setActivePinia(createPinia())
})

describe('useUserStore - 初始化', () => {
  it('从 localStorage 读取登录态', () => {
    localStorage.setItem('token', 'abc')
    localStorage.setItem('userId', '42')
    localStorage.setItem('username', 'me')
    const store = useUserStore()
    expect(store.token).toBe('abc')
    expect(store.userId).toBe(42)
    expect(store.isLoggedIn).toBe(true)
  })
  it('无 token 时未登录、userId 归 0', () => {
    const store = useUserStore()
    expect(store.isLoggedIn).toBe(false)
    expect(store.userId).toBe(0)
  })
})

describe('useUserStore - userLogin / userRegister', () => {
  it('登录成功写入 token 与用户信息、置 isLoggedIn、同步 localStorage', async () => {
    loginMock.mockResolvedValue({ data: sampleAuth } as never)
    const store = useUserStore()
    const ok = await store.userLogin({ username: 'xing', password: 'pw' })
    expect(ok).toBe(true)
    expect(store.token).toBe('tk-123')
    expect(store.username).toBe('xing')
    expect(store.isLoggedIn).toBe(true)
    expect(localStorage.getItem('token')).toBe('tk-123')
    expect(loginMock).toHaveBeenCalledTimes(1)
  })

  it('登录失败返回 false 且不写入登录态', async () => {
    loginMock.mockRejectedValue(new Error('401'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useUserStore()
    const ok = await store.userLogin({ username: 'x', password: 'y' })
    expect(ok).toBe(false)
    expect(store.isLoggedIn).toBe(false)
    spy.mockRestore()
  })

  it('注册成功走 setUserInfo 并返回 true', async () => {
    registerMock.mockResolvedValue({ data: sampleAuth } as never)
    const store = useUserStore()
    const ok = await store.userRegister({
      username: 'xing',
      email: 'x@y.com',
      password: 'pw',
    })
    expect(ok).toBe(true)
    expect(store.email).toBe('x@y.com')
    expect(localStorage.getItem('userId')).toBe('7')
  })
})

describe('useUserStore - setProfileInfo / logout', () => {
  it('setProfileInfo 写入并同步 localStorage', () => {
    const store = useUserStore()
    store.setProfileInfo({ avatar: 'a.png', nickname: '小明', bio: '爱旅行' })
    expect(store.nickname).toBe('小明')
    expect(store.bio).toBe('爱旅行')
    expect(localStorage.getItem('avatar')).toBe('a.png')
    expect(localStorage.getItem('nickname')).toBe('小明')
    expect(localStorage.getItem('bio')).toBe('爱旅行')
  })

  it('setProfileInfo 传空值会移除对应 localStorage 键', () => {
    localStorage.setItem('nickname', 'old')
    localStorage.setItem('avatar', 'old.png')
    const store = useUserStore()
    store.setProfileInfo({ avatar: null, nickname: null, bio: null })
    expect(localStorage.getItem('nickname')).toBeNull()
    expect(localStorage.getItem('avatar')).toBeNull()
    expect(localStorage.getItem('bio')).toBeNull()
  })

  it('logout 清空状态、清 localStorage 并跳转登录页', async () => {
    loginMock.mockResolvedValue({ data: sampleAuth } as never)
    const store = useUserStore()
    await store.userLogin({ username: 'xing', password: 'pw' })
    expect(store.isLoggedIn).toBe(true)

    store.logout()
    expect(store.token).toBe('')
    expect(store.userId).toBe(0)
    expect(store.isLoggedIn).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('username')).toBeNull()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })
})
