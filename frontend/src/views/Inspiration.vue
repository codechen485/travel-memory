<template>
  <div class="inspiration-container">
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <main class="main-content">
      <!-- 页头 -->
      <div class="page-header">
        <h2>灵感漂流</h2>
        <p>来自陌生人的旅途碎片</p>
      </div>

      <n-spin :show="loading">
        <!-- 瀑布流卡片 -->
        <div v-if="copywritings.length > 0" class="waterfall">
          <div v-for="item in copywritings" :key="item.id" class="flow-card">
            <!-- 照片 -->
            <div
              v-if="item.photo"
              class="card-photo"
              @click="openDetail(item)"
            >
              <img :src="item.photo.thumbnailUrl || item.photo.originalUrl" alt="照片" loading="lazy" />
            </div>

            <div class="card-body" @click="openDetail(item)">
              <p class="card-text">{{ item.finalVersion }}</p>
              <div class="card-tags">
                <span v-if="item.sceneTag" class="mini-tag scene-tag">
                  {{ getSceneLabel(item.sceneTag) }}
                </span>
                <span
                  v-if="item.mood && getMoodOption(item.mood)"
                  class="mini-tag"
                  :style="{
                    backgroundColor: `${getMoodOption(item.mood)?.color}1A`,
                    color: getMoodOption(item.mood)?.color,
                  }"
                >
                  {{ getMoodLabel(item.mood) }}
                </span>
              </div>
              <span v-if="item.journey" class="card-journey">{{ item.journey.title }}</span>
            </div>

            <!-- 操作 -->
            <div class="card-actions">
              <n-button
                text
                size="small"
                :type="likedIds.has(item.id) ? 'primary' : 'default'"
                @click.stop="handleLike(item)"
              >
                <template #icon>
                  <n-icon :component="HeartOutline" />
                </template>
                {{ item.likesCount }}
              </n-button>
              <n-button
                text
                size="small"
                :type="collectedIds.has(item.id) ? 'primary' : 'default'"
                @click.stop="handleCollect(item)"
              >
                <template #icon>
                  <n-icon :component="collectedIds.has(item.id) ? Bookmark : BookmarkOutline" />
                </template>
                {{ collectedIds.has(item.id) ? '已收藏' : '收藏' }}
              </n-button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <n-empty v-else-if="!loading" description="这片水域还很安静，等待第一只漂流瓶">
          <template #icon>
            <n-icon :component="WaterOutline" :size="48" color="#A8C5A8" />
          </template>
          <template #extra>
            <n-button size="small" @click="router.push('/copywritings/generate')">
              去生成我的文案
            </n-button>
          </template>
        </n-empty>
      </n-spin>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="load-more">
        <n-button :loading="loadingMore" @click="loadMore">加载更多</n-button>
      </div>
    </main>

    <!-- 详情弹窗：自绘卡片（居中定宽 + 限高 + 内部滚动），避免被撑成整页 -->
    <n-modal v-model:show="showDetail" :mask-closable="true">
      <div class="detail-card">
        <div class="detail-card-header">
          <h3>
            {{
              detailItem
                ? `${getSceneLabel(detailItem.sceneTag)} · ${formatShortDate(detailItem.createdAt)}`
                : ''
            }}
          </h3>
          <n-button text size="small" class="detail-close" @click="showDetail = false">
            <template #icon>
              <n-icon :component="CloseOutline" />
            </template>
          </n-button>
        </div>
        <div class="detail-card-body">
          <div v-if="detailItem" class="detail-content">
            <img
              v-if="detailItem.photo"
              :src="detailItem.photo.originalUrl"
              alt="照片"
              class="detail-photo"
            />
            <div class="detail-section">
              <div class="section-label">短句版</div>
              <p class="section-text">{{ detailItem.shortVersion }}</p>
            </div>
            <div class="detail-section">
              <div class="section-label">叙事版</div>
              <p class="section-text">{{ detailItem.narrativeVersion }}</p>
            </div>
            <div class="detail-section">
              <div class="section-label">诗意版</div>
              <p class="section-text poetic">{{ detailItem.poeticVersion }}</p>
            </div>
            <div class="detail-section final">
              <div class="section-label">最终版</div>
              <p class="section-text">{{ detailItem.finalVersion }}</p>
            </div>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NEmpty,
  NIcon,
  NModal,
  NSpin,
  useMessage,
} from 'naive-ui'
import {
  Bookmark,
  BookmarkOutline,
  CloseOutline,
  HeartOutline,
  WaterOutline,
} from '@vicons/ionicons5'
import {
  getPublicCopywritings,
  likeCopywriting,
  collectCopywriting,
  type Copywriting,
} from '@/api/copywriting'
import { getMoodLabel, getMoodOption } from '@/utils/mood'
import { getSceneLabel } from '@/utils/scene'
import { formatShortDate } from '@/utils/format'
import AppNavbar from '@/components/AppNavbar.vue'

const router = useRouter()
const message = useMessage()

const PAGE_SIZE = 20

const copywritings = ref<Copywriting[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loadingMore = ref(false)

const likedIds = ref<Set<number>>(new Set())
const collectedIds = ref<Set<number>>(new Set())

const showDetail = ref(false)
const detailItem = ref<Copywriting | null>(null)

const hasMore = computed(() => copywritings.value.length < total.value)

async function fetchList(reset = true) {
  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }

  try {
    const response = await getPublicCopywritings({
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    const data = response.data
    const list = Array.isArray(data) ? data : (data?.list ?? [])
    const totalCount = Array.isArray(data) ? data.length : (data?.total ?? 0)

    if (reset) {
      copywritings.value = list
    } else {
      copywritings.value = [...copywritings.value, ...list]
    }
    total.value = totalCount
  } catch (error) {
    console.error('获取公开文案失败:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  page.value += 1
  fetchList(false)
}

function openDetail(item: Copywriting) {
  detailItem.value = item
  showDetail.value = true
}

async function handleLike(item: Copywriting) {
  if (likedIds.value.has(item.id)) {
    message.info('已经点过赞啦')
    return
  }
  try {
    const response = await likeCopywriting(item.id)
    item.likesCount = response.data?.likesCount ?? item.likesCount + 1
    likedIds.value = new Set([...likedIds.value, item.id])
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

async function handleCollect(item: Copywriting) {
  if (collectedIds.value.has(item.id)) {
    message.info('已经在收藏里了')
    return
  }
  try {
    await collectCopywriting(item.id)
    collectedIds.value = new Set([...collectedIds.value, item.id])
    message.success('已收藏这段灵感')
  } catch (error) {
    console.error('收藏失败:', error)
  }
}

onMounted(() => {
  fetchList(true)
})
</script>

<style scoped>
.inspiration-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.page-header {
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

/* 瀑布流（CSS 多列） */
.waterfall {
  column-count: 4;
  column-gap: 20px;
}

@media (max-width: 1100px) {
  .waterfall {
    column-count: 3;
  }
}

@media (max-width: 768px) {
  .waterfall {
    column-count: 2;
  }
}

/* 手机端单列：375px 下 2 列卡片过窄（仅 ~138px），改单列保证可读 */
@media (max-width: 480px) {
  .waterfall {
    column-count: 1;
  }
}

.flow-card {
  break-inside: avoid;
  margin-bottom: 20px;
  background-color: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(91, 140, 90, 0.07);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  cursor: pointer;
}

.flow-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(91, 140, 90, 0.13);
}

.card-photo img {
  width: 100%;
  display: block;
}

.card-body {
  padding: 16px 18px 12px;
}

.card-text {
  color: #3d3d3d;
  font-size: 14px;
  line-height: 1.9;
  margin: 0 0 12px 0;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.mini-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.scene-tag {
  background-color: #eef2ee;
  color: #6b7a6b;
}

.card-journey {
  color: #8fb996;
  font-size: 12px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-top: 1px solid #f2f0e9;
  padding: 8px 0;
}

/* 详情弹窗（自绘卡片：居中定宽 + 限高 + 内部滚动） */
.detail-card {
  width: 640px;
  max-width: 92vw;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
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

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
