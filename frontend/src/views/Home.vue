<template>
  <div class="home-container">
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <!-- 主要内容区 -->
    <main class="main-content">
      <!-- 问候页头：左问候语 + 右主操作（与子页 page-header 语言统一） -->
      <section class="greet-header">
        <div>
          <h2>欢迎回来，{{ userStore.username }}</h2>
          <p>开始记录你的旅行故事吧</p>
        </div>
        <div class="greet-actions">
          <n-button type="primary" @click="handleCreateJourney">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            创建新旅程
          </n-button>
          <n-button @click="handleGoInspiration">
            <template #icon>
              <n-icon :component="CompassOutline" />
            </template>
            灵感漂流
          </n-button>
        </div>
      </section>

      <!-- 动态风景轮播 + 治愈文案（素材配置见 src/config/hero.ts） -->
      <section v-if="HERO_SLIDES.length" class="hero-carousel">
        <n-carousel
          autoplay
          :interval="6000"
          effect="fade"
          hoverable
          show-dots
          class="hero-carousel-box"
        >
          <div
            v-for="slide in HERO_SLIDES"
            :key="slide.src"
            class="carousel-slide"
            :style="{ backgroundImage: `url(${slide.src})` }"
          >
            <div class="slide-overlay"></div>
            <p class="slide-quote">{{ slide.quote }}</p>
          </div>
        </n-carousel>
      </section>

      <!-- 统计数据条：整合白卡 4 等分 + 竖分隔线 -->
      <section class="stats-bar">
        <div v-for="stat in stats" :key="stat.label" class="stat-cell">
          <n-icon :component="stat.icon" :size="26" color="#5b8c5a" />
          <div class="stat-info">
            <h3>{{ stat.value }}</h3>
            <p>{{ stat.label }}</p>
          </div>
        </div>
      </section>

      <!-- 今日推荐：按日期种子随机一条公开文案（空则隐藏） -->
      <section v-if="todayPick" class="today-pick">
        <div class="pick-head">
          <h3>✦ 今日推荐</h3>
          <span class="pick-date">{{ todayLabel }}</span>
        </div>
        <div class="pick-body">
          <div
            v-if="todayPick.photo"
            class="pick-photo"
            :style="{
              backgroundImage: `url(${todayPick.photo.thumbnailUrl || todayPick.photo.originalUrl})`,
            }"
          ></div>
          <div class="pick-main">
            <p class="pick-quote">“{{ todayPick.finalVersion }}”</p>
            <div class="pick-meta">
              <n-tag
                v-if="todayPick.sceneTag"
                size="small"
                :bordered="false"
                :color="{ color: '#eef2ee', textColor: '#6b7a6b' }"
              >
                {{ getSceneLabel(todayPick.sceneTag) }}
              </n-tag>
              <n-tag
                v-if="todayPick.mood"
                size="small"
                :bordered="false"
                :color="{
                  color: `${getMoodOption(todayPick.mood)?.color}1A`,
                  textColor: getMoodOption(todayPick.mood)?.color,
                }"
              >
                {{ getMoodLabel(todayPick.mood) }}
              </n-tag>
              <span class="pick-likes">♥ {{ todayPick.likesCount }}</span>
              <span v-if="todayPick.journey" class="pick-source">
                来自《{{ todayPick.journey.title }}》
              </span>
            </div>
          </div>
          <div class="pick-actions">
            <n-button secondary size="small" :disabled="pickCollected" @click="handleCollectPick">
              {{ pickCollected ? '已收藏' : '收藏' }}
            </n-button>
            <n-button text type="primary" size="small" @click="router.push('/inspiration')">
              去灵感漂流 →
            </n-button>
          </div>
        </div>
      </section>

      <!-- 最近旅程 -->
      <section class="recent-journeys">
        <div class="section-header">
          <h3>我的旅程</h3>
          <n-button text type="primary" @click="router.push('/journeys')">
            查看全部 →
          </n-button>
        </div>

        <div v-if="recentJourneys.length > 0" class="recent-journeys-grid">
          <div
            v-for="journey in recentJourneys"
            :key="journey.id"
            class="recent-journey-card"
            @click="router.push(`/journeys/${journey.id}`)"
          >
            <div class="recent-card-cover" :style="getCoverStyle(journey)"></div>
            <div class="recent-card-body">
              <h4>{{ journey.title }}</h4>
              <p>📍 {{ journey.destinations.join(' · ') }}</p>
              <span>{{ formatShortDate(journey.startDate) }} — {{ formatShortDate(journey.endDate) }}</span>
            </div>
          </div>
        </div>
        <n-empty v-else description="暂无旅程，点击上方按钮创建第一个旅程吧！" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { NButton, NIcon, NEmpty, NCarousel, NTag, useMessage } from 'naive-ui'
import {
  AddOutline,
  CompassOutline,
  MapOutline,
  ImageOutline,
  CreateOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5'
import { getJourneys, type Journey } from '@/api/journey'
import { getPublicCopywritings, getMyCopywritings, collectCopywriting, type Copywriting } from '@/api/copywriting'
import { getSceneLabel } from '@/utils/scene'
import { getMoodLabel, getMoodOption } from '@/utils/mood'
import { formatShortDate, getCoverGradient } from '@/utils/format'
import { HERO_SLIDES } from '@/config/hero'
import AppNavbar from '@/components/AppNavbar.vue'

interface StatItem {
  label: string
  value: number
  icon: Component
}

const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

const journeys = ref<Journey[]>([])
const myCopyCount = ref(0)

/** 今日推荐（公开文案按日期种子随机一条） */
const todayPick = ref<Copywriting | null>(null)
const pickCollected = ref(false)

/** 今日日期标签 */
const todayLabel = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
})

const stats = computed<StatItem[]>(() => [
  { label: '旅程', value: journeys.value.length, icon: MapOutline },
  {
    label: '照片',
    value: journeys.value.reduce((sum, j) => sum + (j._count?.photos ?? 0), 0),
    icon: ImageOutline,
  },
  {
    label: '日记',
    value: journeys.value.reduce((sum, j) => sum + (j._count?.diaries ?? 0), 0),
    icon: CreateOutline,
  },
  { label: '文案', value: myCopyCount.value, icon: DocumentTextOutline },
])

/** 最近 3 个旅程 */
const recentJourneys = computed(() => journeys.value.slice(0, 3))

// 检查是否已登录 + 加载旅程数据
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  try {
    const response = await getJourneys()
    journeys.value = response.data
  } catch (error) {
    console.error('获取旅程列表失败:', error)
  }

  fetchTodayPick()
  fetchMyCopyCount()
})

/** 拉取今日推荐：同一天种子相同，选中固定，每天换一条 */
async function fetchTodayPick() {
  try {
    const res = await getPublicCopywritings({ page: 1, pageSize: 50 })
    const list = res.data.list
    if (!list.length) return
    const now = new Date()
    const seed = now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate()
    todayPick.value = list[seed % list.length] ?? null
  } catch (error) {
    console.error('获取今日推荐失败:', error)
  }
}

/** 我的文案数（数据条用） */
async function fetchMyCopyCount() {
  try {
    const res = await getMyCopywritings()
    myCopyCount.value = res.data.length
  } catch (error) {
    console.error('获取文案数失败:', error)
  }
}

/** 收藏今日推荐 */
async function handleCollectPick() {
  if (!todayPick.value) return
  try {
    await collectCopywriting(todayPick.value.id)
    pickCollected.value = true
    message.success('已加入收藏')
  } catch (error) {
    console.error('收藏失败:', error)
  }
}

function getCoverStyle(journey: Journey) {
  if (journey.coverImage) {
    return {
      backgroundImage: `url(${journey.coverImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: getCoverGradient(journey.id) }
}

function handleCreateJourney() {
  router.push('/journeys?create=1')
}

function handleGoInspiration() {
  router.push('/inspiration')
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

/* 主要内容区 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 60px;
}

/* 风景轮播 */
.hero-carousel {
  margin-bottom: 28px;
  animation: fade-up 0.5s ease 0.06s both;
}

.hero-carousel-box {
  height: 380px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.carousel-slide {
  position: relative;
  height: 380px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45), transparent 55%);
}

.slide-quote {
  position: relative;
  margin: 0;
  padding: 28px 36px;
  color: #fff;
  font-size: 22px;
  letter-spacing: 2px;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

@media (max-width: 640px) {
  .hero-carousel-box,
  .carousel-slide {
    height: 240px;
  }

  .slide-quote {
    font-size: 16px;
    padding: 18px 20px;
  }

  .main-content {
    padding: 20px 16px 40px;
  }

  /* 放大轮播指示点触摸热区：外框透明扩到 32px 便于点按，可见小圆点用伪元素绘制并保持原配色 */
  .hero-carousel-box :deep(.n-carousel__dots--dot .n-carousel__dot) {
    width: 32px;
    height: 32px;
    background-color: transparent !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-carousel-box :deep(.n-carousel__dots--dot .n-carousel__dot)::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.3);
    transition: background-color 0.3s ease;
  }

  .hero-carousel-box :deep(.n-carousel__dots--dot .n-carousel__dot--active)::after {
    background-color: #fff;
  }
}

/* 今日推荐卡片 */
.today-pick {
  background-color: white;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: var(--shadow-card, 0 4px 20px rgba(91, 140, 90, 0.08));
  margin-bottom: 28px;
  animation: fade-up 0.5s ease 0.18s both;
}

.pick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pick-head h3 {
  margin: 0;
  font-size: 18px;
  color: #3d3d3d;
  font-weight: 600;
}

.pick-date {
  font-size: 13px;
  color: #8fb996;
}

.pick-body {
  display: flex;
  gap: 20px;
}

.pick-photo {
  width: 200px;
  height: 150px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.pick-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}

.pick-quote {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 20px;
  line-height: 1.7;
  color: #3d3d3d;
}

.pick-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pick-likes {
  color: #c98c8c;
  font-size: 13px;
}

.pick-source {
  color: #8fb996;
  font-size: 13px;
}

.pick-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .pick-body {
    flex-direction: column;
  }

  .pick-photo {
    width: 100%;
    height: 160px;
  }

  .pick-actions {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }
}

/* 问候页头 */
.greet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  animation: fade-up 0.5s ease both;
}

.greet-header h2 {
  font-size: 30px;
  color: #3d3d3d;
  margin: 0 0 6px;
  font-weight: 600;
}

.greet-header p {
  margin: 0;
  color: #8fb996;
  font-size: 15px;
}

.greet-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 统计数据条（整合白卡 4 等分 + 竖分隔线） */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background-color: white;
  border-radius: 16px;
  box-shadow: var(--shadow-card, 0 4px 20px rgba(91, 140, 90, 0.08));
  padding: 22px 8px;
  margin-bottom: 28px;
  animation: fade-up 0.5s ease 0.12s both;
}

.stat-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-left: 1px solid #f0eee6;
}

.stat-cell:first-child {
  border-left: none;
}

.stat-info h3 {
  font-size: 26px;
  color: var(--color-primary, #5b8c5a);
  margin: 0 0 2px 0;
  font-weight: 600;
  line-height: 1.2;
}

.stat-info p {
  color: var(--color-secondary, #8fb996);
  margin: 0;
  font-size: 13px;
}

@media (max-width: 640px) {
  .greet-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 16px;
    padding: 18px 8px;
  }

  .stat-cell:nth-child(3) {
    border-left: none;
  }
}

/* 最近旅程 */
.recent-journeys {
  background-color: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: var(--shadow-card, 0 4px 20px rgba(91, 140, 90, 0.08));
  /* 入场动画：淡入上浮，与上方区块错落 */
  animation: fade-up 0.5s ease 0.24s both;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 24px;
  color: #3d3d3d;
  margin: 0;
}

.recent-journeys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.recent-journey-card {
  background-color: #faf9f5;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.recent-journey-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.recent-card-cover {
  height: 120px;
}

.recent-card-body {
  padding: 14px 16px;
}

.recent-card-body h4 {
  font-size: 16px;
  color: var(--color-text, #3d3d3d);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-card-body p {
  color: var(--color-primary, #5b8c5a);
  font-size: 13px;
  margin: 0 0 6px 0;
}

.recent-card-body span {
  color: var(--color-secondary, #8fb996);
  font-size: 12px;
}
</style>
