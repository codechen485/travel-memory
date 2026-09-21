<template>
  <div class="mood-picker">
    <button
      v-for="option in MOOD_OPTIONS"
      :key="option.value"
      type="button"
      class="mood-item"
      :class="{ active: modelValue === option.value }"
      :style="activeStyle(option.value, option.color)"
      @click="handleSelect(option.value)"
    >
      <n-icon :component="option.icon" :size="22" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { MOOD_OPTIONS } from '@/utils/mood'
import type { Mood } from '@/api/diary'

const props = defineProps<{
  modelValue: Mood | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Mood | null): void
}>()

function handleSelect(value: Mood) {
  // 再次点击取消选择
  emit('update:modelValue', props.modelValue === value ? null : value)
}

function activeStyle(value: Mood, color: string) {
  if (props.modelValue !== value) return {}
  return {
    backgroundColor: `${color}1A`,
    borderColor: color,
    color,
  }
}
</script>

<style scoped>
.mood-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mood-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e0e6dc;
  border-radius: 999px;
  background-color: #fff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.mood-item:hover {
  border-color: #8fb996;
  color: #5b8c5a;
}
</style>
