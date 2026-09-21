<template>
  <div class="journey-list-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <h1 @click="router.push('/')">🌿 行囊</h1>
        </div>

        <div class="nav-actions">
          <n-button quaternary @click="router.push('/')">
            <template #icon>
              <n-icon :component="HomeOutline" />
            </template>
            首页
          </n-button>
          <n-dropdown :options="dropdownOptions" @select="handleDropdownSelect">
            <n-button type="primary" size="small">
              {{ userStore.username }}
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
      <div class="page-header">
        <div>
          <h2>我的旅程</h2>
          <p>每一次出发，都值得被好好安放</p>
        </div>
        <n-button type="primary" size="large" @click="openCreateModal">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          创建旅程
        </n-button>
      </div>

      <n-spin :show="loading">
        <!-- 旅程卡片网格 -->
        <div v-if="journeys.length > 0" class="journeys-grid">
          <div
            v-for="journey in journeys"
            :key="journey.id"
            class="journey-card"
            @click="goDetail(journey.id)"
          >
            <div class="card-cover" :style="getCoverStyle(journey)">
              <n-tag
                v-if="journey.status === 'archived'"
                class="status-tag"
                size="small"
                type="warning"
                round
              >
                已封存
              </n-tag>
              <div class="cover-overlay"></div>
            </div>

            <div class="card-body">
              <h3 class="card-title">{{ journey.title }}</h3>

              <div class="card-destinations">
                <n-tag
                  v-for="destination in journey.destinations.slice(0, 3)"
                  :key="destination"
                  size="small"
                  round
                  :bordered="false"
                  :color="{ color: '#F0F5F0', textColor: '#5B8C5A' }"
                >
                  📍 {{ destination }}
                </n-tag>
                <n-tag
                  v-if="journey.destinations.length > 3"
                  size="small"
                  round
                  :bordered="false"
                  :color="{ color: '#F0F5F0', textColor: '#8FB996' }"
                >
                  +{{ journey.destinations.length - 3 }}
                </n-tag>
              </div>

              <div class="card-date">
                <n-icon :component="CalendarOutline" :size="16" color="#8FB996" />
                <span>{{ formatDate(journey.startDate) }} — {{ formatDate(journey.endDate) }}</span>
              </div>

              <div class="card-footer">
                <div class="card-stats">
                  <span>
                    <n-icon :component="DocumentTextOutline" :size="15" color="#8FB996" />
                    {{ journey._count?.diaries ?? 0 }} 篇日记
                  </span>
                  <span>
                    <n-icon :component="ImageOutline" :size="15" color="#8FB996" />
                    {{ journey._count?.photos ?? 0 }} 张照片
                  </span>
                  <span>{{ daysBetween(journey.startDate, journey.endDate) }} 天</span>
                </div>

                <div class="card-actions" @click.stop>
                  <n-button size="tiny" quaternary @click="openEditModal(journey)">
                    <template #icon>
                      <n-icon :component="CreateOutline" />
                    </template>
                    编辑
                  </n-button>
                  <n-popconfirm @positive-click="handleDelete(journey.id)">
                    <template #trigger>
                      <n-button size="tiny" quaternary type="error">
                        <template #icon>
                          <n-icon :component="TrashOutline" />
                        </template>
                        删除
                      </n-button>
                    </template>
                    确定删除这段旅程吗？相关的日记和照片也会一并删除。
                  </n-popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="empty-state">
          <n-empty description="行囊还是空的">
            <template #icon>
              <n-icon :component="MapOutline" :size="48" color="#A8C5A8" />
            </template>
            <template #extra>
              <n-button size="small" @click="openCreateModal">开始第一段旅程</n-button>
            </template>
          </n-empty>
        </div>
      </n-spin>
    </main>

    <!-- 创建/编辑旅程弹窗 -->
    <JourneyFormModal
      v-model:show="showFormModal"
      :journey="editingJourney"
      @saved="fetchJourneys"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDropdown,
  NEmpty,
  NIcon,
  NPopconfirm,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import {
  AddOutline,
  CalendarOutline,
  ChevronDownOutline,
  CreateOutline,
  DocumentTextOutline,
  HomeOutline,
  ImageOutline,
  MapOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { deleteJourney, getJourneys, type Journey } from '@/api/journey'
import { useUserStore } from '@/stores/user'
import { daysBetween, formatDate, getCoverGradient } from '@/utils/format'
import JourneyFormModal from '@/components/JourneyFormModal.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

const journeys = ref<Journey[]>([])
const loading = ref(false)
const showFormModal = ref(false)
const editingJourney = ref<Journey | null>(null)

const dropdownOptions = [{ label: '退出登录', key: 'logout' }]

onMounted(() => {
  fetchJourneys()
  // 首页“创建新旅程”按钮通过 ?create=1 自动打开创建弹窗
  if (route.query.create === '1') {
    openCreateModal()
  }
})

async function fetchJourneys() {
  loading.value = true
  try {
    const response = await getJourneys()
    journeys.value = response.data
  } catch (error) {
    console.error('获取旅程列表失败:', error)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingJourney.value = null
  showFormModal.value = true
}

function openEditModal(journey: Journey) {
  editingJourney.value = journey
  showFormModal.value = true
}

function goDetail(id: number) {
  router.push(`/journeys/${id}`)
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

async function handleDelete(id: number) {
  try {
    await deleteJourney(id)
    message.success('旅程已删除')
    fetchJourneys()
  } catch (error) {
    console.error('删除旅程失败:', error)
  }
}

function handleDropdownSelect(key: string) {
  if (key === 'logout') {
    userStore.logout()
    message.success('已退出登录')
  }
}
</script>

<style scoped>
.journey-list-container {
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
  cursor: pointer;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 主要内容区 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.page-header h2 {
  font-size: 32px;
  color: #3d3d3d;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.page-header p {
  color: #8fb996;
  margin: 0;
  font-size: 15px;
}

/* 旅程卡片网格 */
.journeys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.journey-card {
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(91, 140, 90, 0.08);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.journey-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 28px rgba(91, 140, 90, 0.16);
}

.card-cover {
  height: 160px;
  position: relative;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.12), transparent 40%);
}

.status-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.card-body {
  padding: 18px 20px 16px;
}

.card-title {
  font-size: 18px;
  color: #3d3d3d;
  margin: 0 0 12px 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-destinations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8fb996;
  font-size: 13px;
  margin-bottom: 14px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f0f0eb;
  padding-top: 12px;
}

.card-stats {
  display: flex;
  gap: 12px;
  color: #8fb996;
  font-size: 12px;
}

.card-stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

/* 空状态 */
.empty-state {
  padding: 80px 0;
  display: flex;
  justify-content: center;
}
</style>
