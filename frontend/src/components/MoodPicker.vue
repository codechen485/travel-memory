<template>
  <div class="mood-picker">
    <!-- 紧凑下拉：纯文字预设 + 自定义入口，页面只保留一个控件 -->
    <n-select
      :value="selectValue"
      :options="selectOptions"
      class="mood-select"
      placeholder="选择心情（可选）"
      clearable
      :disabled="disabled"
      @update:value="handleSelect"
    />

    <!-- 选择"自定义"后展开文本输入 -->
    <n-input
      v-if="showCustomInput"
      v-model:value="customText"
      class="mood-custom-input"
      placeholder="写下此刻的心情，如：有点想家又有点开心"
      :maxlength="20"
      :disabled="disabled"
      show-count
      clearable
      @update:value="handleCustomInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NSelect, NInput } from 'naive-ui'
import { MOOD_OPTIONS, isPresetMood } from '@/utils/mood'
import type { Mood } from '@/api/diary'

/** 下拉中"自定义心情"选项的哨兵值（不会作为真实心情提交） */
const CUSTOM_VALUE = '__custom__'

const props = defineProps<{
  modelValue: Mood | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Mood | null): void
}>()

const showCustomInput = ref(false)
const customText = ref('')

/** 下拉选项：8 个预设（纯文字）+ 自定义入口 */
const selectOptions = computed(() => [
  ...MOOD_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
  { label: '＋ 自定义心情…', value: CUSTOM_VALUE },
])

/** 下拉当前值：预设→原值；自定义文本→哨兵；空→null（自定义输入展开时也显示哨兵） */
const selectValue = computed<string | null>(() => {
  const v = props.modelValue
  if (v) return isPresetMood(v) ? v : CUSTOM_VALUE
  return showCustomInput.value ? CUSTOM_VALUE : null
})

// 编辑模式回填自定义心情时，同步展开输入框
watch(
  () => props.modelValue,
  (v) => {
    if (v && !isPresetMood(v)) {
      customText.value = v
      showCustomInput.value = true
    }
  },
  { immediate: true },
)

function handleSelect(val: string | null) {
  if (val === null) {
    // 清除选择
    showCustomInput.value = false
    customText.value = ''
    emit('update:modelValue', null)
    return
  }
  if (val === CUSTOM_VALUE) {
    // 展开自定义输入，等待用户填写
    showCustomInput.value = true
    return
  }
  // 选中预设
  showCustomInput.value = false
  customText.value = ''
  emit('update:modelValue', val)
}

function handleCustomInput(v: string) {
  const t = v.trim()
  emit('update:modelValue', t ? t : null)
}
</script>

<style scoped>
.mood-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* n-form-item 内容区是 flex 行，不显式给宽会导致内部 n-select 塌缩成一条线 */
  width: 100%;
}

.mood-select {
  width: 100%;
  max-width: 320px;
}

.mood-custom-input {
  width: 100%;
  max-width: 320px;
}
</style>
