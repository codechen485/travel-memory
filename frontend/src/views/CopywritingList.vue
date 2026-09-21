<template>
  <div class="copywriting-list-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="nav-left">
          <n-button quaternary size="small" @click="router.push('/')">
            <template #icon>
              <n-icon :component="ArrowBackOutline" />
            </template>
            首页
          </n-button>
        </div>
        <div class="page-title">我的文案集</div>
        <div class="nav-right">
          <n-button size="small" type="primary" @click="handleGenerate">
            <template #icon>
              <n-icon :component="SparklesOutline" />
            </template>
            生成新文案
          </n-button>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <n-select
          v-model:value="filterJourneyId"
          :options="journeyOptions"
          placeholder="按旅程筛选"
          clearable
          size="small"
          class="filter-select"
        />
        <n-select
          v-model:value="filterMood"
          :options="moodOptions"
          placeholder="按心情筛选"
          clearable
          size="small"
          class="filter-select"
        />
        <n-select
          v-model:value="filterScene"
          :options="sceneOptions"
          placeholder="按场景筛选"
          clearable
          size="small"
          class="filter-select"
        />
      </div>

      <n-spin :show="loading">
        <!-- 文案卡片列表 -->
        <div v-if="copywritings.length > 0" class="card-list">
          <div v-for="item in copywritings" :key="item.id" class="copy-card">
            <!-- 左侧照片 -->
            <div v-if="item.photo" class="card-photo" @click="openDetail(item)">
              <img :src="item.photo.thumbnailUrl || item.photo.originalUrl" alt="照片" loading="lazy" />
            </div>

            <!-- 右侧内容 -->
            <div class="card-body">
              <div class="card-tags">
                <span
                  v-if="getSceneOption(item.sceneTag)"
                  class="mini-tag"
                  :style="sceneTagStyle(item.sceneTag)"
                >
                  <n-icon :component="getSceneOption(item.sceneTag)!.icon" :size="12" />
                  {{ getSceneLabel(item.sceneTag) }}
                </span>
                <span
                  v-if="getMoodOption(item.mood)"
                  class="mini-tag"
                  :style="moodTagStyle(item.mood)"
                >
                  <n-icon :component="getMoodOption(item.mood)!.icon" :size="12" />
                  {{ getMoodLabel(item.mood) }}
                </span>
                <n-tag v-if="item.isPublic" size="tiny" round :bordered="false" type="success">
                  已公开
                </n-tag>
              </div>

              <p class="card-text" @click="openDetail(item)">{{ item.finalVersion }}</p>

              <div class="card-footer">
                <span class="card-meta">
                  {{ item.journey?.title ?? '未关联旅程' }} · {{ formatShortDate(item.createdAt) }}
                </span>
                <div class="card-actions">
                  <n-button text size="tiny" type="primary" @click="openDetail(item)">
                    查看全部风格
                  </n-button>
                  <n-popconfirm @positive-click="handleDelete(item.id)">
                    <template #trigger>
                      <n-button text size="tiny" type="error">删除</n-button>
                    </template>
                    确定删除这条文案吗？
                  </n-popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>

        <n-empty v-else-if="!loading" class="list-empty" description="还没有保存的文案">
          <template #icon>
            <n-icon :component="BookmarksOutline" :size="48" color="#A8C5A8" />
          </template>
          <template #extra>
            <n-button size="small" type="primary" @click="handleGenerate">
              去生成第一条文案
            </n-button>
          </template>
        </n-empty>
      </n-spin>
    </main>

    <!-- 文案详情弹窗：三种风格 + 最终版本 -->
    <n-modal
      v-model:show="showDetail"
      preset="card"
      class="detail-modal"
      :title="detailTitle"
      :bordered="false"
    >
      <div v-if="activeDetail" class="detail-content">
        <div v-if="activeDetail.photo" class="detail-photo">
          <img :src="activeDetail.photo.originalUrl" alt="照片" />
        </div>

        <div class="detail-section">
          <div class="section-label">短句版</div>
          <p class="section-text">{{ activeDetail.shortVersion }}</p>
        </div>
        <div class="detail-section">
          <div class="section-label">叙事版</div>
          <p class="section-text">{{ activeDetail.narrativeVersion }}</p>
        </div>
        <div class="detail-section">
          <div class="section-label">诗意版</div>
          <p class="section-text poetic">{{ activeDetail.poeticVersion }}</p>
        </div>
        <div class="detail-section final">
          <div class="section-label">我的最终版本</div>
          <p class="section-text">{{ activeDetail.finalVersion }}</p>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NEmpty,
  NIcon,
  NModal,
  NPopconfirm,
  NSelect,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import {
  ArrowBackOutline,
  BookmarksOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import { getJourneys } from '@/api/journey'
import {
  deleteCopywriting,
  getMyCopywritings,
  type Copywriting,
} from '@/api/copywriting'
import type { Mood } from '@/api/diary'
import { MOOD_OPTIONS, getMoodLabel, getMoodOption } from '@/utils/mood'
import { SCENE_OPTIONS, getSceneLabel, getSceneOption } from '@/utils/scene'
import { formatShortDate } from '@/utils/format'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const copywritings = ref<Copywriting[]>([])

const filterJourneyId = ref<number | null>(null)
const filterMood = ref<Mood | null>(null)
const filterScene = ref<string | null>(null)

const journeyOptions = ref<{ label: string; value: number }[]>([])

const moodOptions = MOOD_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
}))

const sceneOptions = SCENE_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
}))

const showDetail = ref(false)
const activeDetail = ref<Copywriting | null>(null)

const detailTitle = computed(() =>
  activeDetail.value
    ? `${getSceneLabel(activeDetail.value.sceneTag)} · ${getMoodLabel(activeDetail.value.mood)}`
    : '文案详情',
)

watch([filterJourneyId, filterMood, filterScene], () => {
  fetchList()
})

onMounted(() => {
  fetchList()
  fetchJourneys()
})

async function fetchList() {
  loading.value = true
  try {
    const response = await getMyCopywritings({
      journeyId: filterJourneyId.value ?? undefined,
      mood: filterMood.value ?? undefined,
      sceneTag: filterScene.value ?? undefined,
    })
    copywritings.value = response.data
  } catch (error) {
    console.error('获取文案列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchJourneys() {
  try {
    const response = await getJourneys()
    journeyOptions.value = response.data.map((journey) => ({
      label: journey.title,
      value: journey.id,
    }))
  } catch (error) {
    console.error('获取旅程列表失败:', error)
  }
}

function openDetail(item: Copywriting) {
  activeDetail.value = item
  showDetail.value = true
}

async function handleDelete(id: number) {
  try {
    await deleteCopywriting(id)
    message.success('文案已删除')
    copywritings.value = copywritings.value.filter((item) => item.id !== id)
  } catch (error) {
    console.error('删除文案失败:', error)
  }
}

function handleGenerate() {
  router.push('/journeys')
}

function sceneTagStyle(sceneTag: string) {
  const option = getSceneOption(sceneTag)
  if (!option) return {}
  return {
    backgroundColor: `${option.color}1A`,
    color: option.color,
  }
}

function moodTagStyle(mood: Mood | null) {
  const option = getMoodOption(mood)
  if (!option) return {}
  return {
    backgroundColor: `${option.color}1A`,
    color: option.color,
  }
}
</script>

<style scoped>
.copywriting-list-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.navbar {
  background: #fff;
  border-bottom: 1px solid #e8f0e8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.navbar-content {
  max-width: 860px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  font-weight: 600;
  font-size: 15px;
  color: #3d3d3d;
  letter-spacing: 2px;
}

.main-content {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  width: 180px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.copy-card {
  display: flex;
  gap: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(91, 140, 90, 0.06);
  transition: all 0.2s;
}

.copy-card:hover {
  box-shadow: 0 4px 16px rgba(91, 140, 90, 0.12);
}

.card-photo {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
}

.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.mini-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.card-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.8;
  color: #3d3d3d;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.card-meta {
  font-size: 12px;
  color: #9aa89a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.list-empty {
  padding: 60px 0;
}

/* ---- 详情弹窗 ---- */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-photo {
  border-radius: 12px;
  overflow: hidden;
  max-height: 320px;
}

.detail-photo img {
  width: 100%;
  object-fit: cover;
  display: block;
}

.detail-section {
  background: #faf9f6;
  border-radius: 10px;
  padding: 14px 16px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #5b8c5a;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.section-text {
  font-size: 14px;
  line-height: 1.9;
  color: #3d3d3d;
  white-space: pre-wrap;
}

.section-text.poetic {
  text-align: center;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 1px;
}

.detail-section.final {
  background: #f0f5f0;
  border: 1px solid #d4e2d4;
}
</style>
