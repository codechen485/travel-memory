import type { Component } from 'vue'
import {
  LeafOutline,
  FlashOutline,
  HeartOutline,
  UmbrellaOutline,
  SunnyOutline,
  CloudOutline,
  PaperPlaneOutline,
  FlowerOutline,
} from '@vicons/ionicons5'
import type { Mood } from '@/api/diary'

/**
 * 心情选项（与后端枚举一致）
 */
export interface MoodOption {
  value: Mood
  label: string
  icon: Component
  color: string
}

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'peaceful', label: '平静', icon: LeafOutline, color: '#5B8C5A' },
  { value: 'amazed', label: '震撼', icon: FlashOutline, color: '#E8A87A' },
  { value: 'miss', label: '思念', icon: HeartOutline, color: '#D47FA0' },
  { value: 'relieved', label: '释怀', icon: UmbrellaOutline, color: '#7A9CC6' },
  { value: 'expect', label: '期待', icon: SunnyOutline, color: '#E8C07A' },
  { value: 'reluctant', label: '不舍', icon: CloudOutline, color: '#8FB996' },
  { value: 'free', label: '自由', icon: PaperPlaneOutline, color: '#6FB0B8' },
  { value: 'healed', label: '治愈', icon: FlowerOutline, color: '#A8C5A8' },
]

/**
 * 根据 mood 值获取选项信息，未匹配时返回 undefined
 */
export function getMoodOption(mood: Mood | null | undefined): MoodOption | undefined {
  if (!mood) return undefined
  return MOOD_OPTIONS.find((item) => item.value === mood)
}

/**
 * 根据 mood 值获取中文标签
 */
export function getMoodLabel(mood: Mood | null | undefined): string {
  return getMoodOption(mood)?.label ?? '未记录'
}
