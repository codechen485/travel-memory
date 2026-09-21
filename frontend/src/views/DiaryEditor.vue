<template>
  <div class="diary-editor-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="nav-left">
          <n-button quaternary size="small" @click="goBack">
            <template #icon>
              <n-icon :component="ArrowBackOutline" />
            </template>
            返回旅程
          </n-button>
        </div>
        <div class="page-title">
          <span v-if="journey">{{ journey.title }} · {{ isEdit ? '编辑日记' : '写日记' }}</span>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <n-spin :show="loading">
        <n-form
          v-if="!loading"
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="top"
          size="medium"
        >
          <!-- 第一行：日期 + 标题 -->
          <div class="form-row">
            <n-form-item label="日期" path="date" class="date-field">
              <n-date-picker
                v-model:value="formData.date"
                type="date"
                clearable
                style="width: 100%"
              />
            </n-form-item>

            <n-form-item label="标题" path="title" class="title-field">
              <n-input
                v-model:value="formData.title"
                placeholder="给这篇日记起个标题"
                :maxlength="50"
                show-count
              />
            </n-form-item>
          </div>

          <!-- 心情选择器 -->
          <n-form-item label="今日心情">
            <MoodPicker v-model="formData.mood" />
          </n-form-item>

          <!-- 位置 -->
          <n-form-item label="位置（可选）">
            <n-input
              v-model:value="formData.locationName"
              placeholder="你在哪里？如：大理洱海边"
              :maxlength="100"
            >
              <template #prefix>
                <n-icon :component="LocationOutline" color="#8FB996" />
              </template>
              <template #suffix>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button text size="tiny" :loading="locating" @click="handleLocate">
                      <template #icon>
                        <n-icon :component="LocateOutline" color="#5B8C5A" />
                      </template>
                    </n-button>
                  </template>
                  获取当前定位（用于地图轨迹展示）
                </n-tooltip>
              </template>
            </n-input>
            <div v-if="hasCoordinates" class="location-coords">已记录坐标：{{ formData.latitude!.toFixed(4) }}, {{ formData.longitude!.toFixed(4) }}</div>
          </n-form-item>

          <!-- 富文本编辑器 -->
          <n-form-item label="正文" path="content">
            <RichTextEditor
              v-model="formData.content"
              :journey-id="journeyId"
              :disabled="journeyArchived"
              class="full-width"
            />
          </n-form-item>

          <!-- 照片上传 -->
          <n-form-item label="照片（可选）">
            <PhotoUploader
              v-model="photos"
              :journey-id="journeyId"
              :diary-id="isEdit ? diaryId : undefined"
            />
          </n-form-item>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <n-button size="large" @click="goBack">取消</n-button>
            <n-button type="primary" size="large" :loading="saving" @click="handleSubmit">
              {{ isEdit ? '保存修改' : '保存日记' }}
            </n-button>
          </div>
        </n-form>
      </n-spin>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDatePicker,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NSpin,
  NTooltip,
  useMessage,
  type FormInst,
  type FormRules,
  type FormItemRule,
} from 'naive-ui'
import { ArrowBackOutline, LocationOutline, LocateOutline } from '@vicons/ionicons5'
import { getJourney } from '@/api/journey'
import { createDiary, getDiary, updateDiary, type Diary } from '@/api/diary'
import type { PhotoInfo } from '@/api/photo'
import MoodPicker from '@/components/MoodPicker.vue'
import PhotoUploader from '@/components/PhotoUploader.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import type { Mood } from '@/api/diary'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const saving = ref(false)

const isEdit = computed(() => route.name === 'DiaryEdit')
const diaryId = computed(() => Number(route.params.id))
const journeyId = computed(() => {
  if (isEdit.value) return journey.value?.id ?? 0
  return Number(route.query.journeyId)
})

const journey = ref<Awaited<ReturnType<typeof getJourney>>['data'] | null>(null)
const photos = ref<PhotoInfo[]>([])

const journeyArchived = computed(() => journey.value?.status === 'archived')

interface DiaryFormData {
  date: number | null
  title: string
  mood: Mood | null
  locationName: string
  latitude: number | null
  longitude: number | null
  content: string
}

const formData = ref<DiaryFormData>({
  date: Date.now(),
  title: '',
  mood: null,
  locationName: '',
  latitude: null,
  longitude: null,
  content: '',
})

const locating = ref(false)

const hasCoordinates = computed(
  () => formData.value.latitude !== null && formData.value.longitude !== null,
)

/** 浏览器地理定位，获取当前坐标（用于地图轨迹展示） */
function handleLocate() {
  if (!navigator.geolocation) {
    message.warning('当前浏览器不支持定位')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      formData.value.latitude = Number(position.coords.latitude.toFixed(7))
      formData.value.longitude = Number(position.coords.longitude.toFixed(7))
      locating.value = false
      message.success('已获取当前坐标，将在地图轨迹中展示')
    },
    (error) => {
      locating.value = false
      if (error.code === error.PERMISSION_DENIED) {
        message.warning('定位权限被拒绝，可手动输入位置名称')
      } else {
        message.warning('定位失败，请稍后重试')
      }
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

const rules: FormRules = {
  date: [
    {
      required: true,
      validator(rule: FormItemRule, value: number | null) {
        if (!value) return new Error('请选择日期')
        return true
      },
      trigger: ['blur', 'change'],
    },
  ],
  title: [
    {
      required: true,
      validator(rule: FormItemRule, value: string) {
        if (!value || !value.trim()) return new Error('请输入日记标题')
        if (value.trim().length > 50) return new Error('标题不能超过50个字符')
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

function toDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

onMounted(async () => {
  loading.value = true
  try {
    if (isEdit.value) {
      // 编辑模式：加载日记详情
      const diaryRes = await getDiary(diaryId.value)
      const diary = diaryRes.data
      journey.value = (await getJourney(diary.journeyId)).data

      if (journeyArchived.value) {
        message.warning('该旅程已封存，日记不可编辑')
      }

      formData.value = {
        date: new Date(diary.date).getTime(),
        title: diary.title,
        mood: diary.mood,
        locationName: diary.locationName ?? '',
        latitude: diary.latitude != null ? Number(diary.latitude) : null,
        longitude: diary.longitude != null ? Number(diary.longitude) : null,
        content: diary.content,
      }
      photos.value = diary.photos ?? []
    } else {
      // 新建模式：加载旅程信息（用于标题展示与封面图片上传关联）
      const id = Number(route.query.journeyId)
      if (!id || Number.isNaN(id)) {
        message.error('缺少旅程参数')
        router.replace('/journeys')
        return
      }
      journey.value = (await getJourney(id)).data
    }
  } catch (error) {
    console.error('加载日记数据失败:', error)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push(`/journeys/${journeyId.value}`)
}

async function handleSubmit() {
  if (journeyArchived.value) {
    message.warning('该旅程已封存，无法保存日记')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    message.warning('请完善必填项')
    return
  }

  const { date, title, mood, locationName, content } = formData.value
  const payload = {
    journeyId: journeyId.value,
    date: toDateString(date as number),
    title: title.trim(),
    content,
    mood: mood ?? undefined,
    locationName: locationName.trim() || undefined,
    latitude: formData.value.latitude ?? undefined,
    longitude: formData.value.longitude ?? undefined,
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await updateDiary(diaryId.value, payload)
      message.success('日记已更新')
    } else {
      await createDiary(payload)
      message.success('日记已保存，继续记录美好时光吧')
    }
    router.push(`/journeys/${journeyId.value}`)
  } catch (error) {
    console.error('保存日记失败:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.diary-editor-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.navbar {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0 40px;
}

.navbar-content {
  max-width: 900px;
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

.main-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 40px 60px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.date-field {
  width: 220px;
  flex-shrink: 0;
}

.title-field {
  flex: 1;
}

.full-width {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 24px;
}

.location-coords {
  margin-top: 6px;
  font-size: 12px;
  color: #8fb996;
}
</style>
