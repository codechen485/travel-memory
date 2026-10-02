import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true }, // 需要登录
  },
  {
    path: '/journeys',
    name: 'JourneyList',
    component: () => import('@/views/JourneyList.vue'),
    meta: { requiresAuth: true }, // 我的旅程
  },
  {
    path: '/journeys/:id',
    name: 'JourneyDetail',
    component: () => import('@/views/JourneyDetail.vue'),
    meta: { requiresAuth: true }, // 旅程详情（时间线/地图/手帐）
  },
  {
    path: '/diaries/new',
    name: 'DiaryCreate',
    component: () => import('@/views/DiaryEditor.vue'),
    meta: { requiresAuth: true }, // 写日记（需带 journeyId 查询参数）
  },
  {
    path: '/diaries/:id/edit',
    name: 'DiaryEdit',
    component: () => import('@/views/DiaryEditor.vue'),
    meta: { requiresAuth: true }, // 编辑日记
  },
  {
    path: '/copywritings/generate',
    name: 'CopywritingGenerate',
    component: () => import('@/views/CopywritingGenerate.vue'),
    meta: { requiresAuth: true }, // 文案生成（需带 journeyId 查询参数）
  },
  {
    path: '/copywritings',
    name: 'CopywritingList',
    component: () => import('@/views/CopywritingList.vue'),
    meta: { requiresAuth: true }, // 我的文案集
  },
  {
    path: '/inspiration',
    name: 'Inspiration',
    component: () => import('@/views/Inspiration.vue'),
    meta: { requiresAuth: true }, // 灵感漂流（公开文案瀑布流）
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/views/Stats.vue'),
    meta: { requiresAuth: true }, // 旅行统计图表
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }, // 个人中心（资料编辑/收藏列表）
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }, // 不需要登录
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false }, // 不需要登录
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 路由守卫：Vue Router 4 用「返回值」代替已弃用的 next() 回调
router.beforeEach((to) => {
  const token = localStorage.getItem('token')

  // 需要登录但未登录，跳转到登录页
  if (to.meta.requiresAuth && !token) {
    return '/login'
  }
  // 已登录但访问登录/注册页，跳转到首页
  if ((to.path === '/login' || to.path === '/register') && token) {
    return '/'
  }
  // 其余放行
  return true
})

export default router
