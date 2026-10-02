<template>
  <div class="journey-detail-container">
    <!-- 导航栏（全局组件，页面操作放入 actions 插槽） -->
    <AppNavbar>
      <template #actions>
        <n-button quaternary size="small" @click="openEditModal">
          <template #icon>
            <n-icon :component="CreateOutline" />
          </template>
          编辑
        </n-button>
        <n-button
          v-if="journey && journey.status === 'ongoing'"
          quaternary
          size="small"
          type="warning"
          @click="handleArchive"
        >
          <template #icon>
            <n-icon :component="ArchiveOutline" />
          </template>
          封存
        </n-button>
        <n-tag v-else-if="journey" type="warning" size="small" round>已封存</n-tag>
      </template>
    </AppNavbar>

    <main class="main-content">
      <n-button quaternary size="small" class="back-link" @click="router.push('/journeys')">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        我的旅程
      </n-button>
      <n-spin :show="loading">
        <template v-if="journey">
          <!-- 顶部：封面 + 标题 + 日期 + 统计 -->
          <header class="detail-header" :style="coverStyle">
            <div class="header-overlay"></div>
            <div class="header-content">
              <h2 class="journey-title">{{ journey.title }}</h2>
              <div class="journey-meta">
                <span class="meta-item">
                  <n-icon :component="LocationOutline" />
                  {{ journey.destinations.join(' · ') }}
                </span>
                <span class="meta-item">
                  <n-icon :component="CalendarOutline" />
                  {{ formatDate(journey.startDate) }} — {{ formatDate(journey.endDate) }}
                </span>
              </div>
              <div class="journey-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ dayCount }}</span>
                  <span class="stat-label">天</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">{{ diaries.length }}</span>
                  <span class="stat-label">篇日记</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">{{ photoCount }}</span>
                  <span class="stat-label">张照片</span>
                </div>
              </div>
              <div v-if="journey.tags.length > 0" class="journey-tags">
                <n-tag
                  v-for="tag in journey.tags"
                  :key="tag"
                  size="small"
                  round
                  :bordered="false"
                  :color="{ color: 'rgba(255, 255, 255, 0.85)', textColor: '#5B8C5A' }"
                >
                  # {{ tag }}
                </n-tag>
              </div>
            </div>
          </header>

          <!-- Tab 切换：时间线 / 手帐 -->
          <div class="detail-body">
            <n-tabs type="line" animated default-value="timeline">
              <!-- 时间线视图 -->
              <n-tab-pane name="timeline" tab="时间线">
                <div class="timeline-toolbar">
                  <n-button
                    v-if="journey && journey.status === 'ongoing'"
                    type="primary"
                    @click="handleWriteDiary"
                  >
                    <template #icon>
                      <n-icon :component="CreateOutline" />
                    </template>
                    写日记
                  </n-button>
                  <n-button
                    :type="journey && journey.status === 'ongoing' ? 'default' : 'primary'"
                    @click="handleGenerateCopywriting()"
                  >
                    <template #icon>
                      <n-icon :component="SparklesOutline" />
                    </template>
                    生成文案
                  </n-button>
                </div>

                <div v-if="diaries.length > 0" class="timeline">
                  <div
                    v-for="group in diaryGroups"
                    :key="group.date"
                    class="timeline-group"
                  >
                    <div class="timeline-date">
                      <span class="date-text">{{ formatShortDate(group.date) }}</span>
                      <span class="date-weekday">{{ formatWeekday(group.date) }}</span>
                    </div>
                    <div class="timeline-line">
                      <div class="timeline-dot"></div>
                      <div
                        v-for="diary in group.items"
                        :key="diary.id"
                        class="diary-card"
                      >
                        <div class="diary-card-header">
                          <div class="diary-title-wrap">
                            <h4>{{ diary.title }}</h4>
                            <n-button
                              v-if="journey && journey.status === 'ongoing'"
                              size="tiny"
                              quaternary
                              @click.stop="handleEditDiary(diary.id)"
                            >
                              <template #icon>
                                <n-icon :component="CreateOutline" />
                              </template>
                              编辑
                            </n-button>
                            <n-button
                              v-if="diary.photos && diary.photos.length > 0"
                              size="tiny"
                              quaternary
                              @click.stop="handleGenerateCopywriting(diary)"
                            >
                              <template #icon>
                                <n-icon :component="SparklesOutline" />
                              </template>
                              文案
                            </n-button>
                          </div>
                          <n-tooltip v-if="getMoodOption(diary.mood)" trigger="hover">
                            <template #trigger>
                              <span
                                class="mood-badge"
                                :style="{
                                  backgroundColor: `${getMoodOption(diary.mood)?.color}1A`,
                                  color: getMoodOption(diary.mood)?.color,
                                }"
                              >
                                <n-icon
                                  :component="getMoodOption(diary.mood)?.icon"
                                  :size="14"
                                />
                                {{ getMoodLabel(diary.mood) }}
                              </span>
                            </template>
                            今日心情
                          </n-tooltip>
                        </div>

                        <p v-if="diary.content" class="diary-excerpt">
                          {{ stripHtml(diary.content, 160) }}
                        </p>

                        <div v-if="diary.locationName" class="diary-location">
                          <n-icon :component="LocationOutline" :size="14" color="#8FB996" />
                          {{ diary.locationName }}
                        </div>

                        <!-- 照片缩略图 -->
                        <div v-if="diary.photos && diary.photos.length > 0" class="diary-photos">
                          <n-image-group>
                            <n-image
                              v-for="photo in diary.photos"
                              :key="photo.id"
                              :src="photo.thumbnailUrl || photo.originalUrl"
                              width="96"
                              height="96"
                              object-fit="cover"
                              class="diary-photo"
                              lazy
                            />
                          </n-image-group>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <n-empty v-else class="timeline-empty" description="还没有日记">
                  <template #icon>
                    <n-icon :component="BookOutline" :size="48" color="#A8C5A8" />
                  </template>
                  <template #extra>
                    <n-button
                      v-if="journey && journey.status === 'ongoing'"
                      size="small"
                      @click="handleWriteDiary"
                    >写下第一篇日记</n-button>
                    <span v-else style="color: #8fb996">已封存的旅程不可添加日记</span>
                  </template>
                </n-empty>
              </n-tab-pane>

              <!-- 手帐视图：电子手帐翻页 -->
              <n-tab-pane name="album" tab="手帐">
                <JourneyJournal :journey="journey" />
              </n-tab-pane>

              <!-- 文案视图：本旅程产出的文案（生成闭环） -->
              <n-tab-pane name="copywriting" tab="文案">
                <div v-if="copywritings.length > 0" class="cw-list">
                  <article v-for="item in copywritings" :key="item.id" class="cw-card">
                    <p class="cw-text">{{ item.finalVersion }}</p>
                    <div class="cw-tags">
                      <span v-if="item.sceneTag" class="cw-tag">{{ getSceneLabel(item.sceneTag) }}</span>
                      <span v-if="item.mood" class="cw-tag mood">{{ getMoodLabel(item.mood) }}</span>
                      <n-tag v-if="item.isPublic" size="tiny" round :bordered="false" type="success">
                        已公开
                      </n-tag>
                      <span class="cw-date">{{ formatShortDate(item.createdAt) }}</span>
                    </div>
                  </article>
                </div>
                <n-empty v-else description="还没有为这段旅程写文案">
                  <template #extra>
                    <n-button size="small" @click="handleGenerateCopywriting()">
                      去生成第一条
                    </n-button>
                  </template>
                </n-empty>
              </n-tab-pane>
            </n-tabs>
          </div>
        </template>

        <!-- 加载失败空状态 -->
        <n-empty
          v-else-if="!loading"
          description="旅程不存在或已被删除"
          class="timeline-empty"
        >
          <template #extra>
            <n-button size="small" @click="router.push('/journeys')">返回旅程列表</n-button>
          </template>
        </n-empty>
      </n-spin>
    </main>

    <!-- 编辑旅程弹窗 -->
    <JourneyFormModal
      v-model:show="showEditModal"
      :journey="journey"
      @saved="fetchDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NEmpty,
  NIcon,
  NImage,
  NImageGroup,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  ArchiveOutline,
  ArrowBackOutline,
  BookOutline,
  CalendarOutline,
  CreateOutline,
  LocationOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import { archiveJourney, getJourney, type JourneyDetail } from '@/api/journey'
import type { Diary } from '@/api/diary'
import { getMoodLabel, getMoodOption } from '@/utils/mood'
import { getSceneLabel } from '@/utils/scene'
import { getMyCopywritings, type Copywriting } from '@/api/copywriting'
import {
  daysBetween,
  formatDate,
  formatShortDate,
  formatWeekday,
  getCoverGradient,
  stripHtml,
} from '@/utils/format'
import JourneyFormModal from '@/components/JourneyFormModal.vue'
import JourneyJournal from '@/components/JourneyJournal.vue'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const journey = ref<JourneyDetail | null>(null)
const loading = ref(false)
const showEditModal = ref(false)
const copywritings = ref<Copywriting[]>([])

/** 按日期降序分组的日记 */
interface DiaryGroup {
  date: string
  items: Diary[]
}

const diaries = computed<Diary[]>(() => {
  if (!journey.value?.diaries) return []
  return [...journey.value.diaries].sort((a, b) => (a.date < b.date ? 1 : -1))
})

const diaryGroups = computed<DiaryGroup[]>(() => {
  const groups: DiaryGroup[] = []
  for (const diary of diaries.value) {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.date === diary.date) {
      lastGroup.items.push(diary)
    } else {
      groups.push({ date: diary.date, items: [diary] })
    }
  }
  return groups
})

const dayCount = computed(() =>
  journey.value ? daysBetween(journey.value.startDate, journey.value.endDate) : 0,
)

const photoCount = computed(() => {
  if (!journey.value) return 0
  const fromCount = journey.value._count?.photos
  if (fromCount !== undefined) return fromCount
  return diaries.value.reduce((sum, diary) => sum + (diary.photos?.length ?? 0), 0)
})

const coverStyle = computed(() => {
  if (!journey.value) return {}
  if (journey.value.coverImage) {
    return {
      backgroundImage: `url(${journey.value.coverImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: getCoverGradient(journey.value.id) }
})

onMounted(() => {
  fetchDetail()
})

async function fetchDetail() {
  const id = Number(route.params.id)
  if (!id || Number.isNaN(id)) {
    router.replace('/journeys')
    return
  }

  loading.value = true
  try {
    const response = await getJourney(id)
    journey.value = response.data
    fetchCopywritings(id)
  } catch (error) {
    console.error('获取旅程详情失败:', error)
  } finally {
    loading.value = false
  }
}

/** 拉取本旅程的文案（生成保存后回到本页即可见，闭环） */
async function fetchCopywritings(journeyId: number) {
  try {
    const response = await getMyCopywritings({ journeyId })
    copywritings.value = response.data
  } catch (error) {
    console.error('获取旅程文案失败:', error)
  }
}

function openEditModal() {
  showEditModal.value = true
}

function handleWriteDiary() {
  if (journey.value?.status === 'archived') {
    message.warning('已封存的旅程不可添加日记')
    return
  }
  router.push(`/diaries/new?journeyId=${journey.value?.id}`)
}

function handleEditDiary(diaryId: number) {
  router.push(`/diaries/${diaryId}/edit`)
}

/**
 * 跳转文案生成页；传入日记时自动带入第一张照片与当日心情
 */
function handleGenerateCopywriting(diary?: Diary) {
  if (!journey.value) return
  const query = new URLSearchParams({ journeyId: String(journey.value.id) })
  if (diary?.photos && diary.photos.length > 0) {
    query.set('photoId', String(diary.photos[0]!.id))
  }
  if (diary?.mood) {
    query.set('mood', diary.mood)
  }
  router.push(`/copywritings/generate?${query.toString()}`)
}

function handleArchive() {
  if (!journey.value) return
  dialog.warning({
    title: '封存旅程',
    content: '封存后这段旅程将变为只读，无法再编辑日记和照片，确定要封存吗？',
    positiveText: '确定封存',
    negativeText: '再想想',
    onPositiveClick: async () => {
      try {
        await archiveJourney(journey.value!.id)
        message.success('旅程已封存，好好收藏这段回忆吧')
        fetchDetail()
      } catch (error) {
        console.error('封存旅程失败:', error)
      }
    },
  })
}
</script>

<style scoped>
.journey-detail-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.back-link {
  margin-bottom: 16px;
  color: #8fb996;
}

/* 主要内容区 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 60px;
}

/* 顶部封面 */
.detail-header {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  min-height: 260px;
  display: flex;
  align-items: flex-end;
  box-shadow: 0 4px 20px rgba(91, 140, 90, 0.08);
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.08) 60%, transparent);
}

.header-content {
  position: relative;
  padding: 32px;
  width: 100%;
}

.journey-title {
  color: white;
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.journey-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 18px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
}

.journey-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  color: white;
  font-size: 26px;
  font-weight: 600;
}

.stat-label {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.35);
}

.journey-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Tab 内容区 */
.detail-body {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(91, 140, 90, 0.08);
  margin-top: 24px;
  padding: 8px 32px 40px;
}

.timeline-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}

/* 时间线 */
.timeline-group {
  display: flex;
  gap: 20px;
}

.timeline-date {
  flex-shrink: 0;
  width: 84px;
  text-align: right;
  padding-top: 4px;
}

.date-text {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #5b8c5a;
}

.date-weekday {
  display: block;
  font-size: 12px;
  color: #8fb996;
  margin-top: 2px;
}

.timeline-line {
  position: relative;
  flex: 1;
  padding-left: 28px;
  padding-bottom: 28px;
  border-left: 2px solid #d4e2d4;
}

.timeline-dot {
  position: absolute;
  left: -6px;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #5b8c5a;
  box-shadow: 0 0 0 4px rgba(91, 140, 90, 0.15);
}

.diary-card {
  background-color: #faf9f5;
  border: 1px solid #eef2ec;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 16px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.diary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(91, 140, 90, 0.1);
}

.diary-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.diary-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.diary-card-header h4 {
  font-size: 16px;
  color: #3d3d3d;
  margin: 0;
  font-weight: 600;
}

.mood-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  flex-shrink: 0;
}

.diary-excerpt {
  color: #666;
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 10px 0;
}

.diary-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8fb996;
  font-size: 13px;
  margin-bottom: 10px;
}

.diary-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.diary-photo {
  border-radius: 8px;
  overflow: hidden;
}

.timeline-empty {
  padding: 80px 0;
}
/* ---- 本旅程文案（文案 Tab） ---- */
.cw-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cw-card {
  background: #faf9f6;
  border-radius: 12px;
  padding: 16px 18px;
}

.cw-text {
  font-size: 14px;
  line-height: 1.9;
  color: #3d3d3d;
  white-space: pre-wrap;
  margin: 0 0 10px 0;
}

.cw-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cw-tag {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background-color: #eef2ee;
  color: #6b7a6b;
}

.cw-tag.mood {
  background-color: rgba(91, 140, 90, 0.1);
  color: #5b8c5a;
}

.cw-date {
  font-size: 12px;
  color: #9aa89a;
}
@media (max-width: 768px) {
  .main-content {
    padding: 20px 16px 40px;
  }

  /* 日记卡头部（标题/心情 与 操作按钮）窄屏换行 */
  .diary-card-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
