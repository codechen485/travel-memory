import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatShortDate,
  formatWeekday,
  daysBetween,
  stripHtml,
  getCoverGradient,
  COVER_GRADIENTS,
} from './format'

describe('formatDate', () => {
  it('把 yyyy-MM-dd 解析为中文年月日（去前导零）', () => {
    expect(formatDate('2026-09-09')).toBe('2026年9月9日')
    expect(formatDate('2026-01-15')).toBe('2026年1月15日')
  })
  it('纯日期不受运行时时区影响，永远显示输入的那一天', () => {
    // 修复前 new Date('2026-12-31') 按 UTC 解析，负时区会整体漂到 12-30
    expect(formatDate('2026-12-31')).toBe('2026年12月31日')
  })
  it('空值返回空串、非法字符串原样返回', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('不是日期')).toBe('不是日期')
  })
})

describe('formatShortDate', () => {
  it('输出 M月d日', () => {
    expect(formatShortDate('2026-09-09')).toBe('9月9日')
    expect(formatShortDate('2026-10-01')).toBe('10月1日')
  })
  it('空值返回空串', () => {
    expect(formatShortDate(null)).toBe('')
    expect(formatShortDate(undefined)).toBe('')
  })
})

describe('formatWeekday', () => {
  it('输出中文星期', () => {
    expect(formatWeekday('2026-09-09')).toBe('周三') // 2026-09-09 是周三
    expect(formatWeekday('2026-09-13')).toBe('周日')
  })
  it('空值 / 非法返回空串', () => {
    expect(formatWeekday('')).toBe('')
    expect(formatWeekday('bad')).toBe('')
  })
})

describe('daysBetween', () => {
  it('含首尾计算天数', () => {
    expect(daysBetween('2026-09-01', '2026-09-03')).toBe(3)
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(1)
  })
  it('结束早于开始返回 0', () => {
    expect(daysBetween('2026-09-03', '2026-09-01')).toBe(0)
  })
  it('缺参数返回 0', () => {
    expect(daysBetween(null, '2026-09-01')).toBe(0)
    expect(daysBetween('2026-09-01', undefined)).toBe(0)
  })
})

describe('stripHtml', () => {
  it('去标签并解码常见实体', () => {
    expect(stripHtml('<p>你好&nbsp;世界</p>')).toBe('你好 世界')
    expect(stripHtml('<div>a &amp; b &lt;c&gt;</div>')).toBe('a & b <c>')
  })
  it('超过 maxLength 截断并加省略号', () => {
    const long = '<p>' + 'x'.repeat(120) + '</p>'
    const out = stripHtml(long, 100)
    expect(out.length).toBe(103) // 100 字符 + "..."
    expect(out.endsWith('...')).toBe(true)
  })
  it('空值返回空串', () => {
    expect(stripHtml('')).toBe('')
    expect(stripHtml(null)).toBe('')
  })
})

describe('getCoverGradient', () => {
  it('按 id 取模返回稳定渐变色', () => {
    expect(getCoverGradient(0)).toBe(COVER_GRADIENTS[0])
    expect(getCoverGradient(1)).toBe(COVER_GRADIENTS[1])
    // 索引回绕：等于长度时回到第 0 个
    expect(getCoverGradient(COVER_GRADIENTS.length)).toBe(COVER_GRADIENTS[0])
  })
})
