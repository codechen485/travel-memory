<template>
  <n-modal
    :show="show"
    preset="card"
    :title="isEdit ? '编辑旅程' : '创建旅程'"
    class="journey-modal"
    :style="{ width: '560px' }"
    :mask-closable="false"
    @update:show="handleShowChange"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="top"
      size="medium"
    >
      <n-form-item label="旅程标题" path="title">
        <n-input
          v-model:value="formData.title"
          placeholder="给这段旅程起个名字，如：云南慢行记"
          :maxlength="50"
          show-count
        />
      </n-form-item>

      <n-form-item label="目的地" path="destinations">
        <n-dynamic-tags
          v-model:value="formData.destinations"
          :max="10"
          @add="handleAddDestination"
        >
          <template #input="{ deactivate }">
            <div class="destination-input">
              <n-input
                v-model:value="destinationInput"
                size="small"
                placeholder="输入目的地后回车，如：大理"
                @keyup.enter="handleDestinationEnter(deactivate)"
                @blur="handleDestinationEnter(deactivate)"
              />
              <n-button size="tiny" type="primary" quaternary @click="handleDestinationEnter(deactivate)">
                添加
              </n-button>
            </div>
          </template>
        </n-dynamic-tags>
      </n-form-item>

      <n-form-item label="日期范围" path="dateRange">
        <n-date-picker
          v-model:value="formData.dateRange"
          type="daterange"
          clearable
          style="width: 100%"
        />
      </n-form-item>

      <n-form-item label="标签（可选）" path="tags">
        <n-dynamic-tags v-model:value="formData.tags" :max="5" />
      </n-form-item>

      <n-form-item label="封面图" path="coverImage">
        <div class="cover-field">
          <div class="cover-preview" :style="coverStyle">
            <span v-if="!hasCustomCover">默认封面（图片上传功能开发中）</span>
          </div>
          <n-input
            v-model:value="formData.coverImage"
            placeholder="粘贴封面图 URL（可选，留空使用默认封面）"
            clearable
            @update:value="hasCustomCover = !!$event"
          />
        </div>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="close">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建旅程' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NDatePicker,
  NDynamicTags,
  useMessage,
  type FormInst,
  type FormRules,
  type FormItemRule,
} from 'naive-ui'
import {
  createJourney,
  updateJourney,
  type Journey,
} from '@/api/journey'
import { getCoverGradient } from '@/utils/format'

const props = defineProps<{
  show: boolean
  /** 传入则为编辑模式 */
  journey?: Journey | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'saved'): void
}>()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const destinationInput = ref('')
const hasCustomCover = ref(false)

const isEdit = computed(() => !!props.journey)

interface JourneyFormData {
  title: string
  destinations: string[]
  dateRange: [number, number] | null
  tags: string[]
  coverImage: string
}

const emptyForm = (): JourneyFormData => ({
  title: '',
  destinations: [],
  dateRange: null,
  tags: [],
  coverImage: '',
})

const formData = ref<JourneyFormData>(emptyForm())

// 打开弹窗时初始化表单数据
watch(
  () => props.show,
  (show) => {
    if (show) {
      destinationInput.value = ''
      hasCustomCover.value = !!props.journey?.coverImage
      if (props.journey) {
        formData.value = {
          title: props.journey.title,
          destinations: [...props.journey.destinations],
          dateRange: [
            new Date(props.journey.startDate).getTime(),
            new Date(props.journey.endDate).getTime(),
          ],
          tags: [...props.journey.tags],
          coverImage: props.journey.coverImage ?? '',
        }
      } else {
        formData.value = emptyForm()
      }
      nextTick(() => formRef.value?.restoreValidation())
    }
  },
)

const rules: FormRules = {
  title: [
    {
      required: true,
      validator(rule: FormItemRule, value: string) {
        if (!value || !value.trim()) return new Error('请输入旅程标题')
        if (value.trim().length < 2) return new Error('标题至少 2 个字符')
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  destinations: [
    {
      required: true,
      validator(rule: FormItemRule, value: string[]) {
        if (!value || value.length === 0) return new Error('请至少添加一个目的地')
        return true
      },
      trigger: ['blur', 'change'],
    },
  ],
  dateRange: [
    {
      required: true,
      validator(rule: FormItemRule, value: [number, number] | null) {
        if (!value || value.length !== 2) return new Error('请选择旅程日期范围')
        return true
      },
      trigger: ['blur', 'change'],
    },
  ],
}

const coverStyle = computed(() =>
  hasCustomCover.value
    ? { backgroundImage: `url(${formData.value.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: getCoverGradient(props.journey?.id ?? 0) },
)

/**
 * 添加目的地（去除空值和重复）
 */
function handleDestinationEnter(deactivate: () => void) {
  const value = destinationInput.value.trim()
  if (value) {
    if (!formData.value.destinations.includes(value)) {
      formData.value.destinations.push(value)
    } else {
      message.warning('该目的地已添加')
    }
  }
  destinationInput.value = ''
  deactivate()
}

/**
 * n-dynamic-tags 非输入状态下添加（点击 + 号直接进入输入框场景，空值忽略）
 */
function handleAddDestination() {
  // 添加事件由输入框回车处理，这里无需额外逻辑
}

function close() {
  emit('update:show', false)
}

function handleShowChange(value: boolean) {
  emit('update:show', value)
}

/**
 * 时间戳 → yyyy-MM-dd
 */
function toDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const { title, destinations, dateRange, tags, coverImage } = formData.value
  const [start, end] = dateRange as [number, number]

  saving.value = true
  try {
    if (props.journey) {
      await updateJourney(props.journey.id, {
        title: title.trim(),
        destinations,
        startDate: toDateString(start),
        endDate: toDateString(end),
        tags,
        coverImage: coverImage.trim() || null,
      })
      message.success('旅程已更新')
    } else {
      await createJourney({
        title: title.trim(),
        destinations,
        startDate: toDateString(start),
        endDate: toDateString(end),
        tags,
        coverImage: coverImage.trim() || null,
      })
      message.success('旅程创建成功，出发吧！')
    }
    emit('saved')
    close()
  } catch (error) {
    console.error('保存旅程失败:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.destination-input {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.cover-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.cover-preview {
  height: 120px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
