import { describe, it, expect } from 'vitest'
import { getSceneLabel, SCENE_FALLBACK } from './scene'

describe('getSceneLabel', () => {
  it('原样返回 AI 概括的一句话场景', () => {
    expect(getSceneLabel('草原上马群与远山')).toBe('草原上马群与远山')
  })
  it('会 trim 前后空白', () => {
    expect(getSceneLabel('  海边日落  ')).toBe('海边日落')
  })
  it('空串 / 仅空白 / null / undefined 返回占位', () => {
    expect(getSceneLabel('')).toBe(SCENE_FALLBACK)
    expect(getSceneLabel('   ')).toBe(SCENE_FALLBACK)
    expect(getSceneLabel(null)).toBe(SCENE_FALLBACK)
    expect(getSceneLabel(undefined)).toBe(SCENE_FALLBACK)
  })
})
