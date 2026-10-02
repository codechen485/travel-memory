<template>
  <div class="journal-container">
    <!-- 书本 -->
    <div class="book-viewport">
      <Transition :name="flipDirection === 'next' ? 'flip-next' : 'flip-prev'" mode="out-in">
        <div v-if="spreads.length > 0" :key="currentSpread" class="spread">
          <!-- 封面跨页：左纸质封面 + 右扉页拍立得（与后续跨页同构，区别于顶部 hero 横幅） -->
          <template v-if="current.type === 'cover'">
            <div class="page cover-page">
              <span class="tape"></span>
              <div class="cover-inner">
                <span class="cover-badge">TRAVEL JOURNAL</span>
                <h2 class="cover-title">{{ journey.title }}</h2>
                <p class="cover-meta">{{ journey.destinations.join(' · ') }}</p>
                <p class="cover-meta">{{ formatDate(journey.startDate) }} — {{ formatDate(journey.endDate) }}</p>
                <div class="cover-stamp">
                  <span class="stamp-value">{{ dayCount }}</span>
                  <span class="stamp-label">天旅程</span>
                </div>
              </div>
            </div>
            <div class="page cover-photo-page">
              <div v-if="journey.coverImage" class="cover-polaroid">
                <img :src="journey.coverImage" alt="封面" />
                <span class="polaroid-caption">{{ journey.destinations[0] ?? journey.title }}</span>
              </div>
              <div v-else class="cover-polaroid cover-polaroid-empty" :style="{ background: getCoverGradient(journey.id) }">
                <span class="polaroid-caption">{{ journey.title }}</span>
              </div>
              <p class="cover-intro">共 {{ dayCount }} 天 · {{ diaries.length }} 篇日记 · {{ photoCount }} 张照片</p>
            </div>
          </template>

          <!-- 日记跨页：左照片 右文字 -->
          <template v-else-if="current.type === 'diary' && current.diary">
            <div class="page photo-page">
              <div v-if="diaryPhotos(current.diary).length > 0" class="photo-wall">
                <div
                  v-for="(photo, index) in diaryPhotos(current.diary)"
                  :key="photo.id"
                  class="polaroid"
                  :style="{ transform: `rotate(${index % 2 === 0 ? -2.5 : 2}deg)` }"
                >
                  <img :src="photo.thumbnailUrl || photo.originalUrl" alt="照片" loading="lazy" />
                </div>
              </div>
              <div v-else class="no-photo">
                <n-empty description="这一天没有照片">
                  <template #icon>
                    <n-icon :component="ImageOutline" :size="36" color="#D4E2D4" />
                  </template>
                </n-empty>
              </div>
            </div>

            <div class="page text-page">
              <div class="page-date">
                {{ formatShortDate(current.diary.date) }} {{ formatWeekday(current.diary.date) }}
              </div>
              <h3 class="page-title">{{ current.diary.title }}</h3>
              <div v-if="current.diary.mood" class="page-mood">
                <n-icon :component="getMoodOption(current.diary.mood)?.icon" :size="14" />
                {{ getMoodLabel(current.diary.mood) }}
              </div>
              <p class="page-content">{{ stripHtml(current.diary.content, 400) }}</p>
              <div v-if="current.diary.locationName" class="page-location">
                <n-icon :component="LocationOutline" :size="12" />
                {{ current.diary.locationName }}
              </div>
              <div v-if="current.copywriting" class="page-copywriting">
                <span class="copywriting-quote">“</span>
                <p>{{ current.copywriting.finalVersion }}</p>
              </div>
            </div>
          </template>

          <!-- 封底 -->
          <template v-else>
            <div class="page text-page end-page">
              <div class="end-stats">
                <div class="end-stat">
                  <span class="end-value">{{ dayCount }}</span>
                  <span class="end-label">天</span>
                </div>
                <div class="end-stat">
                  <span class="end-value">{{ diaries.length }}</span>
                  <span class="end-label">篇日记</span>
                </div>
                <div class="end-stat">
                  <span class="end-value">{{ photoCount }}</span>
                  <span class="end-label">张照片</span>
                </div>
                <div class="end-stat">
                  <span class="end-value">{{ copywritings.length }}</span>
                  <span class="end-label">段文案</span>
                </div>
              </div>
              <p class="end-quote">这段旅程，已被好好安放。</p>
            </div>
            <div class="page blank-page"></div>
          </template>
        </div>
      </Transition>
    </div>

    <!-- 翻页控制 -->
    <div class="journal-controls">
      <n-button quaternary :disabled="currentSpread === 0" @click="flipTo(currentSpread - 1)">
        <template #icon>
          <n-icon :component="ChevronBackOutline" />
        </template>
        上一页
      </n-button>
      <span class="journal-page-num">{{ currentSpread + 1 }} / {{ spreads.length }}</span>
      <n-button
        quaternary
        :disabled="currentSpread >= spreads.length - 1"
        @click="flipTo(currentSpread + 1)"
      >
        下一页
        <template #icon>
          <n-icon :component="ChevronForwardOutline" />
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NEmpty, NIcon } from 'naive-ui'
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  ImageOutline,
  LocationOutline,
} from '@vicons/ionicons5'
import type { JourneyDetail } from '@/api/journey'
import type { Diary } from '@/api/diary'
import type { Copywriting } from '@/api/copywriting'
import { getMyCopywritings } from '@/api/copywriting'
import { getMoodLabel, getMoodOption } from '@/utils/mood'
import {
  daysBetween,
  formatDate,
  formatShortDate,
  formatWeekday,
  getCoverGradient,
  stripHtml,
} from '@/utils/format'

const props = defineProps<{
  journey: JourneyDetail
}>()

const copywritings = ref<Copywriting[]>([])
const currentSpread = ref(0)
const flipDirection = ref<'next' | 'prev'>('next')

/** 日记（按日期升序，手帐翻阅顺序） */
const diaries = computed<Diary[]>(() => {
  if (!props.journey?.diaries) return []
  return [...props.journey.diaries].sort((a, b) => (a.date > b.date ? 1 : -1))
})

const dayCount = computed(() =>
  props.journey ? daysBetween(props.journey.startDate, props.journey.endDate) : 0,
)

const photoCount = computed(() =>
  diaries.value.reduce((sum, diary) => sum + (diary.photos?.length ?? 0), 0),
)

interface JournalSpread {
  type: 'cover' | 'diary' | 'end'
  diary?: Diary
  copywriting?: Copywriting
}

/** 手帐页：封面 → 每篇日记一跨页 → 封底 */
const spreads = computed<JournalSpread[]>(() => {
  const result: JournalSpread[] = [{ type: 'cover' }]
  for (const diary of diaries.value) {
    result.push({ type: 'diary', diary, copywriting: findCopywriting(diary) })
  }
  result.push({ type: 'end' })
  return result
})

const current = computed<JournalSpread>(
  () => spreads.value[currentSpread.value] ?? { type: 'cover' },
)

/** 日记的照片 */
function diaryPhotos(diary: Diary) {
  return diary.photos ?? []
}

/** 匹配日记关联文案（照片属于该日记的优先，其次同旅程同心情） */
function findCopywriting(diary: Diary): Copywriting | undefined {
  const photoIds = new Set(diaryPhotos(diary).map((photo) => photo.id))
  return (
    copywritings.value.find((item) => item.photoId !== null && photoIds.has(item.photoId)) ??
    copywritings.value.find((item) => item.mood !== null && item.mood === diary.mood)
  )
}

function flipTo(index: number) {
  flipDirection.value = index > currentSpread.value ? 'next' : 'prev'
  currentSpread.value = index
}

onMounted(async () => {
  try {
    const response = await getMyCopywritings({ journeyId: props.journey.id })
    copywritings.value = response.data
  } catch (error) {
    console.error('获取旅程文案失败:', error)
  }
})
</script>

<style scoped>
.journal-container {
  padding: 16px 0 8px;
}

/* 书本视口（3D 透视） */
.book-viewport {
  perspective: 2200px;
  min-height: 460px;
}

.spread {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 10px 32px rgba(61, 61, 61, 0.14);
  transform-style: preserve-3d;
  background-color: #fffdf7;
}

/* 页面通用（固定书高，保证各跨页高度一致不跳动） */
.page {
  height: 460px;
  overflow: hidden;
  padding: 32px 36px;
  background-color: #fffdf7;
  position: relative;
}

/* 右页装订线阴影 */
.page:last-child {
  box-shadow: inset 12px 0 16px -12px rgba(61, 61, 61, 0.18);
}

/* 封面：左纸质封面 */
.cover-page {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-image: linear-gradient(rgba(143, 185, 150, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 185, 150, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* 和纸胶带 */
.tape {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 96px;
  height: 26px;
  transform: translateX(-50%) rotate(-3deg);
  background: rgba(143, 185, 150, 0.35);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.cover-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cover-badge {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 4px;
  color: #5b8c5a;
  border: 1px solid #8fb996;
  border-radius: 999px;
  padding: 4px 14px;
  margin-bottom: 16px;
}

.cover-title {
  color: #3d3d3d;
  font-size: 34px;
  font-weight: 600;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  margin: 0 0 12px 0;
}

.cover-meta {
  color: #8fb996;
  font-size: 14px;
  margin: 0 0 6px 0;
}

/* 虚线邮戳圈 */
.cover-stamp {
  margin-top: 22px;
  width: 84px;
  height: 84px;
  border: 2px dashed #8fb996;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #5b8c5a;
  transform: rotate(-8deg);
}

.stamp-value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
}

.stamp-label {
  font-size: 11px;
  color: #8fb996;
  margin-top: 4px;
}

/* 封面：右扉页拍立得 */
.cover-photo-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background-image: radial-gradient(#e8e4d8 1px, transparent 1px),
    radial-gradient(#e8e4d8 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
}

.cover-polaroid {
  background-color: white;
  padding: 10px 10px 34px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
  transform: rotate(2deg);
  position: relative;
}

.cover-polaroid img {
  width: 260px;
  height: 200px;
  object-fit: cover;
  display: block;
}

.cover-polaroid-empty {
  width: 280px;
  height: 234px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.polaroid-caption {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: #8fb996;
}

.cover-intro {
  margin: 0;
  color: #7a6a45;
  font-size: 13px;
  font-style: italic;
  letter-spacing: 1px;
}

/* 照片页：拍立得照片墙 */
.photo-page {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image:
    radial-gradient(#e8e4d8 1px, transparent 1px),
    radial-gradient(#e8e4d8 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
}

.photo-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: center;
  align-content: center;
  max-width: 100%;
  padding: 10px;
}

.polaroid {
  background-color: white;
  padding: 8px 8px 22px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

.polaroid img {
  width: 150px;
  height: 150px;
  object-fit: cover;
  display: block;
}

.no-photo {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 120px 0;
}

/* 文字页 */
.text-page {
  display: flex;
  flex-direction: column;
}

.page-date {
  color: #8fb996;
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.page-title {
  font-size: 22px;
  color: #3d3d3d;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.page-mood {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  font-size: 12px;
  color: #5b8c5a;
  background-color: rgba(91, 140, 90, 0.1);
  border-radius: 999px;
  padding: 3px 12px;
  margin-bottom: 16px;
}

.page-content {
  flex: 1;
  color: #555;
  font-size: 14px;
  line-height: 2;
  margin: 0;
  white-space: pre-wrap;
  overflow: hidden;
}

.page-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8fb996;
  font-size: 12px;
  margin-top: 12px;
}

/* 关联文案引用 */
.page-copywriting {
  margin-top: 16px;
  background-color: rgba(232, 192, 122, 0.12);
  border-left: 3px solid #e8c07a;
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
  position: relative;
}

.copywriting-quote {
  position: absolute;
  top: -4px;
  left: 8px;
  font-size: 24px;
  color: #e8c07a;
  font-family: Georgia, serif;
}

.page-copywriting p {
  margin: 0;
  color: #7a6a45;
  font-size: 13px;
  line-height: 1.8;
  font-style: italic;
}

/* 封底 */
.end-page {
  align-items: center;
  justify-content: center;
}

.end-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 40px;
  margin: auto 0;
}

.end-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  justify-content: center;
}

.end-value {
  font-size: 34px;
  color: #5b8c5a;
  font-weight: 600;
}

.end-label {
  font-size: 13px;
  color: #8fb996;
}

.end-quote {
  color: #a8c5a8;
  font-size: 15px;
  letter-spacing: 2px;
  margin: 32px 0 0;
}

.blank-page {
  background-image: linear-gradient(rgba(143, 185, 150, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 185, 150, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* 翻页控制 */
.journal-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px 0 8px;
}

.journal-page-num {
  color: #8fb996;
  font-size: 13px;
  min-width: 64px;
  text-align: center;
}

/* 翻页动画（3D 翻书，out-in 保证新旧页不共存于文档流） */
.flip-next-enter-active,
.flip-next-leave-active,
.flip-prev-enter-active,
.flip-prev-leave-active {
  transition:
    transform 0.45s ease,
    opacity 0.45s ease;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.flip-next-enter-from {
  transform: rotateY(45deg);
  opacity: 0;
}

.flip-next-leave-to {
  transform: rotateY(-24deg);
  opacity: 0;
}

.flip-prev-enter-from {
  transform: rotateY(-45deg);
  opacity: 0;
}

.flip-prev-leave-to {
  transform: rotateY(24deg);
  opacity: 0;
}

/* 手机端单页 */
@media (max-width: 768px) {
  .spread {
    grid-template-columns: 1fr;
  }

  .photo-page {
    height: 320px;
  }

  .polaroid img {
    width: 120px;
    height: 120px;
  }
}
</style>
