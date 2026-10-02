<template>
  <div class="copywriting-generate-container">
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <main class="main-content">
      <n-button quaternary size="small" class="back-link" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        {{ journey ? '返回旅程' : '返回' }}
      </n-button>

      <!-- 步骤指示器 -->
      <n-steps :current="currentStep" size="small" class="gen-steps">
        <n-step title="选择照片" />
        <n-step title="此刻心情" />
        <n-step title="生成与保存" />
      </n-steps>

      <n-spin :show="loading">
        <!-- 无旅程上下文 -->
        <n-empty
          v-if="!loading && !journey"
          description="请从旅程详情页进入，选择一张照片开始创作"
          class="gen-empty"
        >
          <template #icon>
            <n-icon :component="ImagesOutline" :size="48" color="#A8C5A8" />
          </template>
          <template #extra>
            <n-button size="small" type="primary" @click="router.push('/journeys')">
              去我的旅程
            </n-button>
          </template>
        </n-empty>

        <template v-else-if="journey">
          <!-- ============ 步骤 1：选择照片 ============ -->
          <section v-show="currentStep === 1" class="step-panel">
            <h3 class="panel-title">选一张照片，作为此刻的注脚</h3>
            <p class="panel-subtitle">{{ panelSubtitle }}</p>

            <div v-if="photoOptions.length > 0" class="photo-grid">
              <div
                v-for="photo in photoOptions"
                :key="photo.id"
                class="photo-item"
                :class="{ selected: selectedPhoto?.id === photo.id }"
                @click="selectPhoto(photo)"
              >
                <img :src="photo.thumbnailUrl || photo.originalUrl" alt="照片" loading="lazy" />
                <div v-if="selectedPhoto?.id === photo.id" class="photo-check">
                  <n-icon :component="CheckmarkCircle" :size="28" color="#fff" />
                </div>
              </div>
            </div>
            <n-empty
              v-else
              description="这个旅程还没有照片，先上传一张吧"
              class="gen-empty"
            />

            <!-- 上传新照片 -->
            <div class="upload-area" @click="triggerUpload">
              <n-icon :component="AddOutline" :size="20" color="#8FB996" />
              <span>{{ uploading ? '上传中…' : '上传新照片' }}</span>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden-input"
                @change="handleFileChange"
              />
            </div>

            <div class="step-actions">
              <n-button
                type="primary"
                size="large"
                :disabled="!selectedPhoto"
                @click="currentStep = 2"
              >
                下一步：心情
                <template #icon>
                  <n-icon :component="ArrowForwardOutline" />
                </template>
              </n-button>
            </div>
          </section>

          <!-- ============ 步骤 2：此刻心情 ============ -->
          <section v-show="currentStep === 2" class="step-panel">
            <h3 class="panel-title">这张照片，是什么心情？</h3>
            <p class="panel-subtitle">场景交给 AI 看图识别，你只需选一个此刻的心情（也可以不选）</p>

            <!-- 已选照片预览 -->
            <div v-if="selectedPhoto" class="selected-preview">
              <img :src="selectedPhoto.thumbnailUrl || selectedPhoto.originalUrl" alt="已选照片" />
            </div>

            <!-- 心情 -->
            <div class="field-label">此刻心情</div>
            <MoodPicker v-model="selectedMood" />

            <div class="step-actions">
              <n-button size="large" quaternary @click="currentStep = 1">上一步</n-button>
              <n-button
                type="primary"
                size="large"
                :loading="generating"
                @click="handleGenerate"
              >
                <template #icon>
                  <n-icon :component="SparklesOutline" />
                </template>
                生成文案
              </n-button>
            </div>
          </section>

          <!-- ============ 步骤 3：生成中 / 结果 / 编辑保存 ============ -->
          <section v-show="currentStep === 3" class="step-panel">
            <!-- 生成中动画 -->
            <div v-if="generating" class="generating-box">
              <div class="generating-icon">
                <n-icon :component="SparklesOutline" :size="40" color="#5B8C5A" />
              </div>
              <p class="generating-text">AI 正在为你写下这一刻…</p>
              <p class="generating-hint">场景 · 心情 · 光影，都在被慢慢拾起</p>
            </div>

            <template v-else-if="generated">
              <!-- 三种风格切换 -->
              <h3 class="panel-title">三种语气，同一种心情</h3>
              <n-tabs v-model:value="activeStyle" type="segment" animated class="style-tabs">
                <n-tab-pane name="short" tab="短句版">
                  <div class="style-content">{{ generated.shortVersion }}</div>
                </n-tab-pane>
                <n-tab-pane name="narrative" tab="叙事版">
                  <div class="style-content">{{ generated.narrativeVersion }}</div>
                </n-tab-pane>
                <n-tab-pane name="poetic" tab="诗意版">
                  <div class="style-content poetic">{{ generated.poeticVersion }}</div>
                </n-tab-pane>
              </n-tabs>

              <!-- 编辑最终版本 -->
              <div class="field-label">编辑你的最终版本（保存后不可再改旅程归属）</div>
              <n-input
                v-model:value="finalText"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 10 }"
                placeholder="选中一种风格后可在此编辑，也可以完全自己写"
                :maxlength="500"
                show-count
              />

              <!-- 公开开关 -->
              <div class="public-switch">
                <n-switch v-model:value="isPublic" size="small" />
                <span class="switch-label">匿名公开到灵感漂流（可随时关闭）</span>
              </div>

              <div class="step-actions">
                <n-button size="large" quaternary :disabled="saving" @click="handleRegenerate">
                  <template #icon>
                    <n-icon :component="RefreshOutline" />
                  </template>
                  重新生成
                </n-button>
                <n-button size="large" quaternary :disabled="saving" @click="currentStep = 2">
                  换心情
                </n-button>
                <n-button
                  type="primary"
                  size="large"
                  :loading="saving"
                  :disabled="!finalText.trim()"
                  @click="handleSave"
                >
                  <template #icon>
                    <n-icon :component="SaveOutline" />
                  </template>
                  保存文案
                </n-button>
              </div>
            </template>

            <!-- 生成失败 -->
            <n-empty v-else description="还没有生成结果" class="gen-empty">
              <template #extra>
                <n-button size="small" @click="currentStep = 2">返回上一步</n-button>
              </template>
            </n-empty>
          </section>
        </template>
      </n-spin>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NSpin,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
  useMessage,
} from 'naive-ui'
import {
  AddOutline,
  ArrowBackOutline,
  ArrowForwardOutline,
  CheckmarkCircle,
  ImagesOutline,
  RefreshOutline,
  SaveOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import { getJourney, type JourneyDetail } from '@/api/journey'
import { uploadPhoto, type PhotoInfo } from '@/api/photo'
import type { Diary, Mood } from '@/api/diary'
import {
  generateCopywriting,
  saveCopywriting,
  type CopywritingStyle,
  type GeneratedCopywriting,
} from '@/api/copywriting'
import MoodPicker from '@/components/MoodPicker.vue'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const journey = ref<JourneyDetail | null>(null)
const loading = ref(false)
const currentStep = ref(1)

/** 旅程内全部可选照片（来自日记） */
interface PhotoOption extends PhotoInfo {
  diaryTitle?: string
}
const photoOptions = ref<PhotoOption[]>([])
const selectedPhoto = ref<PhotoOption | null>(null)

const selectedMood = ref<Mood | null>(null)

const generating = ref(false)
const generated = ref<GeneratedCopywriting | null>(null)
const activeStyle = ref<CopywritingStyle>('short')
const finalText = ref('')
const isPublic = ref(false)
const saving = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

/** 待自动选中的照片 ID（来自 query 预填，需等照片列表加载后处理） */
const pendingPhotoId = ref<number | null>(null)

onMounted(() => {
  const journeyId = Number(route.query.journeyId)
  if (!journeyId || Number.isNaN(journeyId)) {
    // 无旅程上下文，展示空状态提示
    return
  }
  fetchJourney(journeyId)

  // 预填：photoId（从日记/照片跳转带入）
  const photoId = Number(route.query.photoId)
  if (photoId) {
    pendingPhotoId.value = photoId
  }
  // 预填：心情（从日记跳转带入）
  const mood = route.query.mood
  if (typeof mood === 'string' && mood) {
    selectedMood.value = mood as Mood
  }
})

async function fetchJourney(journeyId: number) {
  loading.value = true
  try {
    const response = await getJourney(journeyId)
    journey.value = response.data
    // 收集日记照片作为可选项
    const diaries: Diary[] = journey.value?.diaries ?? []
    photoOptions.value = diaries.flatMap((diary) =>
      (diary.photos ?? []).map((photo) => ({
        ...photo,
        diaryTitle: diary.title,
      })),
    )
    // 自动选中 query 指定的照片
    if (pendingPhotoId.value) {
      const target = photoOptions.value.find((p) => p.id === pendingPhotoId.value)
      if (target) selectPhoto(target)
      pendingPhotoId.value = null
    }
  } catch (error) {
    console.error('获取旅程失败:', error)
  } finally {
    loading.value = false
  }
}

function selectPhoto(photo: PhotoOption) {
  selectedPhoto.value = photo
}

function triggerUpload() {
  if (!journey.value) {
    message.warning('请先从旅程进入')
    return
  }
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !journey.value) return

  if (!file.type.startsWith('image/')) {
    message.error('仅支持图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    message.error('图片大小不能超过 10MB')
    return
  }

  uploading.value = true
  try {
    const response = await uploadPhoto({
      journeyId: journey.value.id,
      file,
    })
    const photo = response.data
    const option: PhotoOption = {
      id: photo.id,
      originalUrl: photo.originalUrl,
      thumbnailUrl: photo.thumbnailUrl,
    }
    photoOptions.value.unshift(option)
    selectPhoto(option)
    message.success('照片上传成功')
  } catch (error) {
    console.error('照片上传失败:', error)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

/** 切换风格时把该风格文案填入编辑框（仅当编辑框未被手动改过或为空时覆盖） */
watch(activeStyle, () => {
  if (!generated.value) return
  finalText.value = styleText(activeStyle.value)
})

function styleText(style: CopywritingStyle): string {
  if (!generated.value) return ''
  if (style === 'short') return generated.value.shortVersion
  if (style === 'narrative') return generated.value.narrativeVersion
  return generated.value.poeticVersion
}

const panelSubtitle = computed(() =>
  journey.value ? `${journey.value.title} · 共 ${photoOptions.value.length} 张照片` : '',
)

async function handleGenerate() {
  if (!journey.value) return

  generating.value = true
  currentStep.value = 3
  generated.value = null

  try {
    const response = await generateCopywriting({
      photoId: selectedPhoto.value?.id,
      mood: selectedMood.value ?? undefined,
      journeyId: journey.value.id,
    })
    generated.value = response.data
    activeStyle.value = 'short'
    finalText.value = response.data.shortVersion
  } catch (error) {
    console.error('文案生成失败:', error)
    currentStep.value = 2
  } finally {
    generating.value = false
  }
}

function handleRegenerate() {
  currentStep.value = 2
  generated.value = null
  finalText.value = ''
}

async function handleSave() {
  if (!journey.value || !finalText.value.trim()) return
  if (!generated.value) return

  saving.value = true
  try {
    await saveCopywriting({
      photoId: selectedPhoto.value?.id ?? null,
      journeyId: journey.value.id,
      sceneTag: generated.value.scene,
      mood: selectedMood.value ?? undefined,
      shortVersion: generated.value.shortVersion,
      narrativeVersion: generated.value.narrativeVersion,
      poeticVersion: generated.value.poeticVersion,
      finalVersion: finalText.value.trim(),
      isPublic: isPublic.value,
    })
    message.success('文案已收进行囊')
    router.push(`/journeys/${journey.value.id}`)
  } catch (error) {
    console.error('保存文案失败:', error)
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (journey.value) {
    router.push(`/journeys/${journey.value.id}`)
  } else {
    router.push('/journeys')
  }
}
</script>

<style scoped>
.copywriting-generate-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.back-link {
  margin-bottom: 16px;
  color: #8fb996;
}

.main-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 40px 60px;
}

.gen-steps {
  margin-bottom: 32px;
}

.step-panel {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(91, 140, 90, 0.06);
}

.panel-title {
  font-size: 17px;
  font-weight: 600;
  color: #3d3d3d;
  margin-bottom: 6px;
}

.panel-subtitle {
  font-size: 13px;
  color: #8a8a8a;
  margin-bottom: 20px;
}

/* ---- 照片选择 ---- */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.photo-item.selected {
  border-color: #5b8c5a;
  box-shadow: 0 0 0 3px rgba(91, 140, 90, 0.2);
}

.photo-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  background: rgba(91, 140, 90, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: 1.5px dashed #c5d8c5;
  border-radius: 10px;
  color: #5b8c5a;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 24px;
}

.upload-area:hover {
  background: #f0f5f0;
  border-color: #8fb996;
}

.hidden-input {
  display: none;
}

/* ---- 场景与心情 ---- */
.selected-preview {
  margin-bottom: 20px;
}

.selected-preview img {
  max-width: 100%;
  max-height: 260px;
  border-radius: 12px;
  display: block;
  margin: 0 auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #5b8c5a;
  margin: 18px 0 10px;
}

/* ---- 生成中 ---- */
.generating-box {
  text-align: center;
  padding: 60px 20px;
}

.generating-icon {
  animation: breathe 1.6s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

.generating-text {
  margin-top: 18px;
  font-size: 15px;
  color: #3d3d3d;
  font-weight: 500;
}

.generating-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #8a8a8a;
}

/* ---- 结果展示 ---- */
.style-tabs {
  margin-bottom: 8px;
}

.style-content {
  padding: 20px 16px;
  font-size: 15px;
  line-height: 1.9;
  color: #3d3d3d;
  background: #faf9f6;
  border-radius: 10px;
  min-height: 96px;
  white-space: pre-wrap;
}

.style-content.poetic {
  text-align: center;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 1px;
}

.public-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.switch-label {
  font-size: 13px;
  color: #5f6f5f;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
}

.gen-empty {
  padding: 48px 0;
}
@media (max-width: 768px) {
  .main-content {
    padding: 20px 16px 40px;
  }

  /* 照片选择网格在窄屏收紧，保证一行放得下多个缩略图 */
  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  }
}
</style>
