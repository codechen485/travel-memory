import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, register, type LoginData, type RegisterData, type AuthResponse } from '@/api/auth'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const token = ref<string>(localStorage.getItem('token') || '')
  const userId = ref<number>(Number(localStorage.getItem('userId')) || 0)
  const username = ref<string>(localStorage.getItem('username') || '')
  const email = ref<string>(localStorage.getItem('email') || '')
  const avatar = ref<string | null>(localStorage.getItem('avatar') || null)
  const nickname = ref<string | null>(localStorage.getItem('nickname') || null)
  const bio = ref<string | null>(localStorage.getItem('bio') || null)

  // 是否已登录
  const isLoggedIn = ref<boolean>(!!token.value)

  /**
   * 用户登录
   */
  async function userLogin(loginData: LoginData) {
    try {
      const response = await login(loginData)

      // 保存用户信息和 token
      setUserInfo(response.data)

      return true
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  /**
   * 用户注册
   */
  async function userRegister(registerData: RegisterData) {
    try {
      const response = await register(registerData)

      // 保存用户信息和 token
      setUserInfo(response.data)

      return true
    } catch (error) {
      console.error('注册失败:', error)
      return false
    }
  }

  /**
   * 设置用户信息
   */
  function setUserInfo(userInfo: AuthResponse) {
    token.value = userInfo.token
    userId.value = userInfo.userId
    username.value = userInfo.username
    email.value = userInfo.email
    avatar.value = userInfo.avatar

    // 保存到 localStorage
    localStorage.setItem('token', userInfo.token)
    localStorage.setItem('userId', String(userInfo.userId))
    localStorage.setItem('username', userInfo.username)
    localStorage.setItem('email', userInfo.email)
    if (userInfo.avatar) {
      localStorage.setItem('avatar', userInfo.avatar)
    }

    isLoggedIn.value = true
  }

  /**
   * 同步个人资料（个人中心编辑后调用）
   */
  function setProfileInfo(profile: { avatar: string | null; nickname: string | null; bio: string | null }) {
    avatar.value = profile.avatar
    nickname.value = profile.nickname
    bio.value = profile.bio

    if (profile.avatar) {
      localStorage.setItem('avatar', profile.avatar)
    } else {
      localStorage.removeItem('avatar')
    }
    if (profile.nickname) {
      localStorage.setItem('nickname', profile.nickname)
    } else {
      localStorage.removeItem('nickname')
    }
    if (profile.bio) {
      localStorage.setItem('bio', profile.bio)
    } else {
      localStorage.removeItem('bio')
    }
  }

  /**
   * 退出登录
   */
  function logout() {
    // 清空用户信息
    token.value = ''
    userId.value = 0
    username.value = ''
    email.value = ''
    avatar.value = null
    isLoggedIn.value = false

    // 清除 localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('email')
    localStorage.removeItem('avatar')
    localStorage.removeItem('nickname')
    localStorage.removeItem('bio')

    // 跳转到登录页
    router.push('/login')
  }

  return {
    token,
    userId,
    username,
    email,
    avatar,
    nickname,
    bio,
    isLoggedIn,
    userLogin,
    userRegister,
    setProfileInfo,
    logout,
  }
})
