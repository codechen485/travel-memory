import type { Component } from 'vue'
import {
  SunnyOutline,
  WaterOutline,
  LeafOutline,
  RestaurantOutline,
  BusinessOutline,
  PartlySunnyOutline,
  MoonOutline,
  SnowOutline,
  FlowerOutline,
  TriangleOutline,
  CameraOutline,
  WineOutline,
} from '@vicons/ionicons5'

/**
 * 场景标签选项（与后端场景识别结果对齐，MVP 阶段手动选择）
 */
export interface SceneOption {
  value: string
  label: string
  icon: Component
  color: string
}

export const SCENE_OPTIONS: SceneOption[] = [
  { value: 'seaside', label: '海边', icon: WaterOutline, color: '#6FB0B8' },
  { value: 'mountain', label: '山巅', icon: TriangleOutline, color: '#8FB996' },
  { value: 'old_town', label: '古镇', icon: RestaurantOutline, color: '#C9A87C' },
  { value: 'sunset', label: '日落', icon: PartlySunnyOutline, color: '#E8A87A' },
  { value: 'forest', label: '森林', icon: LeafOutline, color: '#5B8C5A' },
  { value: 'city', label: '城市', icon: BusinessOutline, color: '#7A9CC6' },
  { value: 'lake', label: '湖畔', icon: FlowerOutline, color: '#A8C5A8' },
  { value: 'snow', label: '雪景', icon: SnowOutline, color: '#9CB8D4' },
  { value: 'desert', label: '沙漠', icon: SunnyOutline, color: '#D4B483' },
  { value: 'night', label: '夜空', icon: MoonOutline, color: '#8186B8' },
  { value: 'street', label: '街巷', icon: CameraOutline, color: '#B8A87C' },
  { value: 'cafe', label: '小店', icon: WineOutline, color: '#C98C8C' },
]

/**
 * 根据 sceneTag 值获取选项信息，未匹配时返回 undefined
 */
export function getSceneOption(sceneTag: string | null | undefined): SceneOption | undefined {
  if (!sceneTag) return undefined
  return SCENE_OPTIONS.find((item) => item.value === sceneTag)
}

/**
 * 根据 sceneTag 值获取中文标签
 */
export function getSceneLabel(sceneTag: string | null | undefined): string {
  return getSceneOption(sceneTag)?.label ?? sceneTag ?? '未分类'
}
