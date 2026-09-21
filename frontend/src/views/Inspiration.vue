<template>
  <div class="inspiration-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="nav-left">
          <n-button quaternary size="small" @click="router.push('/')">
            <template #icon>
              <n-icon :component="ArrowBackOutline" />
            </template>
            返回首页
          </n-button>
        </div>
        <div class="page-title">灵感漂流 · 来自陌生人的旅途碎片</div>
        <div class="nav-right"></div>
      </div>
    </nav>

    <main class="main-content">
      <!-- 场景分类 Tab -->
      <n-tabs
        type="segment"
        animated
        :value="activeScene"
        @update:value="handleSceneChange"
        class="scene-tabs"
      >
        <n-tab name="all">全部</n-tab>
        <n-tab v-for="scene in SCENE_OPTIONS" :key="scene.value" :name="scene.value">
          {{ scene.label }}
        </n-tab>
      </n-tabs>

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
                <span
                  v-if="getSceneOption(item.sceneTag)"
                  class="mini-tag"
                  :style="{
                    backgroundColor: `${getSceneOption(item.sceneTag)?.color}1A`,
                    color: getSceneOption(item.sceneTag)?.color,
                  }"
                >
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

    <!-- 详情弹窗 -->
    <n-modal
      v-model:show="showDetail"
      preset="card"
      class="detail-modal"
      :title="detailItem ? `${getSceneLabel(detailItem.sceneTag)} · ${formatShortDate(detailItem.createdAt)}` : ''"
    >
      <template v-if="detailItem">
        <img
          v-if="detailItem.photo"
          :src="detailItem.photo.originalUrl"
          alt="照片"
          class="detail-photo"
        />
        <div class="detail-section">
          <div class="section-label">短句版</div>
          <p>{{ detailItem.shortVersion }}</p>
        </div>
        <div class="detail-section">
          <div class="section-label">叙事版</div>
          <p>{{ detailItem.narrativeVersion }}</p>
        </div>
        <div class="detail-section">
          <div class="section-label">诗意版</div>
          <p class="poetic-text">{{ detailItem.poeticVersion }}</p>
        </div>
        <div class="detail-section final">
          <div class="section-label">最终版</div>
          <p>{{ detailItem.finalVersion }}</p>
        </div>
      </template>
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
  NTab,
  NTabs,
  useMessage,
} from 'naive-ui'
import {
  ArrowBackOutline,
  Bookmark,
  BookmarkOutline,
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
import { SCENE_OPTIONS, getSceneLabel, getSceneOption } from '@/utils/scene'
import { formatShortDate } from '@/utils/format'

const router = useRouter()
const message = useMessage()

const PAGE_SIZE = 20

const activeScene = ref('all')
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
      sceneTag: activeScene.value === 'all' ? undefined : activeScene.value,
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

function handleSceneChange(scene: string | number) {
  activeScene.value = String(scene)
  fetchList(true)
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

.page-title {
  color: #3d3d3d;
  font-size: 15px;
  font-weight: 500;
}

.nav-right {
  width: 100px;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 40px 60px;
}

.scene-tabs {
  margin-bottom: 28px;
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

/* 详情弹窗 */
.detail-modal {
  width: 640px;
  max-width: 92vw;
}

.detail-photo {
  width: 100%;
  border-radius: 10px;
  margin-bottom: 20px;
  display: block;
}

.detail-section {
  margin-bottom: 18px;
}

.section-label {
  font-size: 12px;
  color: #8fb996;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.detail-section p {
  color: #3d3d3d;
  font-size: 14px;
  line-height: 1.9;
  margin: 0;
  white-space: pre-wrap;
}

.poetic-text {
  font-style: italic;
}

.detail-section.final {
  background-color: rgba(91, 140, 90, 0.07);
  border-radius: 10px;
  padding: 14px 16px;
}

.detail-section.final .section-label {
  color: #5b8c5a;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
