<template>
  <div class="copywriting-list-container">
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <main class="main-content">
      <!-- 页头 -->
      <div class="page-header">
        <div>
          <h2>我的文案集</h2>
          <p>把每一次心动，写成可以带走的句子</p>
        </div>
      </div>

      <n-spin :show="loading">
        <!-- 文案卡片列表 -->
        <div v-if="copywritings.length > 0" class="card-list">
          <div v-for="item in visibleCopywritings" :key="item.id" class="copy-card">
            <!-- 左侧照片 -->
            <div v-if="item.photo" class="card-photo" @click="openDetail(item)">
              <img :src="item.photo.thumbnailUrl || item.photo.originalUrl" alt="照片" loading="lazy" />
            </div>

            <!-- 右侧内容 -->
            <div class="card-body">
              <div class="card-tags">
                <span v-if="item.sceneTag" class="mini-tag scene-tag">
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
        </n-empty>

        <!-- 加载更多：前端切片分批渲染，避免一次性铺开全部卡片把页面拉得过长 -->
        <div v-if="copywritings.length > visibleCount" class="load-more">
          <n-button @click="loadMore">
            加载更多（还有 {{ copywritings.length - visibleCount }} 条）
          </n-button>
        </div>
      </n-spin>
    </main>

    <!-- 文案详情弹窗：自绘卡片（居中定宽 + 限高 + 内部滚动） -->
    <n-modal v-model:show="showDetail" :mask-closable="true">
      <div class="detail-card">
        <div class="detail-card-header">
          <h3>{{ detailTitle }}</h3>
          <n-button text size="small" class="detail-close" @click="showDetail = false">
            <template #icon>
              <n-icon :component="CloseOutline" />
            </template>
          </n-button>
        </div>
        <div class="detail-card-body">
          <div v-if="activeDetail" class="detail-content">
            <img
              v-if="activeDetail.photo"
              :src="activeDetail.photo.originalUrl"
              alt="照片"
              class="detail-photo"
            />

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
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton,
  NEmpty,
  NIcon,
  NModal,
  NPopconfirm,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import {
  BookmarksOutline,
  CloseOutline,
} from '@vicons/ionicons5'
import {
  deleteCopywriting,
  getMyCopywritings,
  type Copywriting,
} from '@/api/copywriting'
import type { Mood } from '@/api/diary'
import { getMoodLabel, getMoodOption } from '@/utils/mood'
import { getSceneLabel } from '@/utils/scene'
import { formatShortDate } from '@/utils/format'
import AppNavbar from '@/components/AppNavbar.vue'

const message = useMessage()

const loading = ref(false)
const copywritings = ref<Copywriting[]>([])

/** 每批渲染的文案数（前端切片，配合“加载更多”避免长列表一次性铺开） */
const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)
const visibleCopywritings = computed(() => copywritings.value.slice(0, visibleCount.value))

function loadMore() {
  visibleCount.value += PAGE_SIZE
}

const showDetail = ref(false)
const activeDetail = ref<Copywriting | null>(null)

const detailTitle = computed(() =>
  activeDetail.value
    ? `${getSceneLabel(activeDetail.value.sceneTag)} · ${getMoodLabel(activeDetail.value.mood)}`
    : '文案详情',
)

onMounted(() => {
  fetchList()
})

async function fetchList() {
  loading.value = true
  try {
    const response = await getMyCopywritings()
    copywritings.value = response.data
    visibleCount.value = PAGE_SIZE
  } catch (error) {
    console.error('获取文案列表失败:', error)
  } finally {
    loading.value = false
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

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 60px;
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

.scene-tag {
  background-color: #eef2ee;
  color: #6b7a6b;
}

.card-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.8;
  color: #3d3d3d;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
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

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* ---- 详情弹窗 ---- */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- 详情弹窗（自绘卡片：居中定宽 + 限高 + 内部滚动） ---- */
.detail-card {
  width: 640px;
  max-width: 92vw;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.detail-card-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f2f0e9;
}

.detail-card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #3d3d3d;
}

.detail-close {
  color: #8fb996;
}

.detail-card-body {
  overflow-y: auto;
  padding: 20px 24px;
}

.detail-photo {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 12px;
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
@media (max-width: 768px) {
  .main-content {
    padding: 20px 16px 40px;
  }

  /* 页头标题与“生成文案”按钮竖排 */
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  /* 移动端标题字号下调，与「我的旅程」页保持一致 */
  .page-header h2 {
    font-size: 26px;
  }
}
</style>
