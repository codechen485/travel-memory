import axios from 'axios'
import { createDiscreteApi } from 'naive-ui'

const { message } = createDiscreteApi(['message'])

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data

    // 如果返回的状态码不是 200，说明接口有问题
    if (res.code !== 200) {
      message.error(res.message || '请求失败')

      // 401: token 过期或未授权
      if (res.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        window.location.href = '/login'
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  (error) => {
    console.error('请求错误:', error)

    if (error.response) {
      // 判断是否是认证相关接口
      const isAuthApi = error.config?.url?.includes('/auth/')

      switch (error.response.status) {
        case 401:
          // 如果是登录/注册接口返回401，显示具体错误信息，不清除token
          if (isAuthApi) {
            message.error(error.response.data?.message || '用户名或密码错误')
          } else {
            // 其他接口返回401，说明token失效，需要重新登录
            message.error('未授权，请重新登录')
            localStorage.removeItem('token')
            localStorage.removeItem('userId')
            localStorage.removeItem('username')
            window.location.href = '/login'
          }
          break
        case 403:
          message.error('拒绝访问')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器内部错误')
          break
        default:
          message.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error('请求配置错误')
    }

    return Promise.reject(error)
  },
)

export default request
