import { describe, it, expect } from 'vitest'
import {
  MOOD_OPTIONS,
  CUSTOM_MOOD_COLOR,
  isPresetMood,
  getMoodOption,
  getMoodLabel,
} from './mood'

describe('isPresetMood', () => {
  it('预设 key 返回 true', () => {
    expect(isPresetMood('peaceful')).toBe(true)
    expect(isPresetMood('healed')).toBe(true)
  })
  it('自定义 / 空返回 false', () => {
    expect(isPresetMood('我的小情绪')).toBe(false)
    expect(isPresetMood(null)).toBe(false)
    expect(isPresetMood(undefined)).toBe(false)
  })
})

describe('getMoodOption', () => {
  it('预设返回对应中文标签与配色', () => {
    const opt = getMoodOption('peaceful')
    expect(opt?.label).toBe('平静')
    expect(opt?.color).toBe('#5B8C5A')
  })
  it('自定义心情返回中性样式并以原文为标签', () => {
    const opt = getMoodOption('随心')
    expect(opt?.label).toBe('随心')
    expect(opt?.color).toBe(CUSTOM_MOOD_COLOR)
  })
  it('空值返回 undefined', () => {
    expect(getMoodOption(null)).toBeUndefined()
    expect(getMoodOption(undefined)).toBeUndefined()
  })
})

describe('getMoodLabel', () => {
  it('预设→中文；自定义→原文；空→未记录', () => {
    expect(getMoodLabel('miss')).toBe('思念')
    expect(getMoodLabel('哇塞')).toBe('哇塞')
    expect(getMoodLabel(null)).toBe('未记录')
  })
})

describe('MOOD_OPTIONS', () => {
  it('8 个预设且 value 唯一', () => {
    expect(MOOD_OPTIONS).toHaveLength(8)
    const values = new Set(MOOD_OPTIONS.map((m) => m.value))
    expect(values.size).toBe(8)
  })
})
