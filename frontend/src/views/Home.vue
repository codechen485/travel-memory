<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <h1>🌿 行囊</h1>
        </div>

        <div class="user-info">
          <span class="username">{{ userStore.username }}</span>
          <n-dropdown :options="dropdownOptions" @select="handleDropdownSelect">
            <n-button type="primary" size="small">
              用户菜单
              <template #icon>
                <n-icon :component="ChevronDownOutline" />
              </template>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </nav>

    <!-- 主要内容区 -->
    <main class="main-content">
      <div class="hero-section">
        <h2>欢迎回来，{{ userStore.username }}！</h2>
        <p>开始记录你的旅行故事吧</p>

        <div class="stats-cards">
          <n-card v-for="stat in stats" :key="stat.label" class="stat-card">
            <div class="stat-content">
              <n-icon :component="stat.icon" :size="40" color="#5b8c5a" />
              <div class="stat-info">
                <h3>{{ stat.value }}</h3>
                <p>{{ stat.label }}</p>
              </div>
            </div>
          </n-card>
        </div>

        <div class="action-buttons">
          <n-button type="primary" size="large">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            创建新旅程
          </n-button>

          <n-button size="large">
            <template #icon>
              <n-icon :component="CompassOutline" />
            </template>
            灵感漂流
          </n-button>
        </div>
      </div>

      <!-- 最近旅程 -->
      <section class="recent-journeys">
        <h3>我的旅程</h3>
        <n-empty description="暂无旅程，点击右上角按钮创建第一个旅程吧！" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, h, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { NCard, NButton, NIcon, NDropdown, NEmpty, useMessage } from 'naive-ui'
import {
  ChevronDownOutline,
  AddOutline,
  CompassOutline,
  MapOutline,
  ImageOutline,
  CreateOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5'

interface StatItem {
  label: string
  value: number
  icon: Component
}

const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

const stats: StatItem[] = [
  { label: '旅程', value: 0, icon: MapOutline },
  { label: '照片', value: 0, icon: ImageOutline },
  { label: '日记', value: 0, icon: CreateOutline },
  { label: '文案', value: 0, icon: DocumentTextOutline },
]

const dropdownOptions = [
  {
    label: '退出登录',
    key: 'logout',
  },
]

// 检查是否已登录
onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
  }
})

const handleDropdownSelect = (key: string) => {
  if (key === 'logout') {
    handleLogout()
  }
}

const handleLogout = () => {
  userStore.logout()
  message.success('已退出登录')
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

/* 导航栏 */
.navbar {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0 40px;
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo h1 {
  font-size: 24px;
  color: #5b8c5a;
  margin: 0;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  color: #3d3d3d;
  font-weight: 500;
}

/* 主要内容区 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
}

.hero-section {
  text-align: center;
  margin-bottom: 60px;
}

.hero-section h2 {
  font-size: 36px;
  color: #3d3d3d;
  margin-bottom: 10px;
}

.hero-section > p {
  color: #8fb996;
  font-size: 16px;
  margin-bottom: 40px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(91, 140, 90, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-info h3 {
  font-size: 32px;
  color: #5b8c5a;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.stat-info p {
  color: #8fb996;
  margin: 0;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 60px;
}

/* 最近旅程 */
.recent-journeys {
  background-color: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(91, 140, 90, 0.08);
}

.recent-journeys h3 {
  font-size: 24px;
  color: #3d3d3d;
  margin-bottom: 20px;
}
</style>
