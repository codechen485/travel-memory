/**
 * 日期格式化：yyyy-MM-dd → yyyy年M月d日
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 短日期格式化：yyyy-MM-dd → M月d日
 */
export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 星期格式化：yyyy-MM-dd → 周X
 */
export function formatWeekday(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const weekday = weekdays[date.getDay()]
  return weekday ?? ''
}

/**
 * 计算两个日期之间的天数（含首尾）
 */
export function daysBetween(startDate: string | null | undefined, endDate: string | null | undefined): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff + 1 : 0
}

/**
 * 去除富文本 HTML 标签，返回纯文本摘要
 */
export function stripHtml(html: string | null | undefined, maxLength = 100): string {
  if (!html) return ''
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * 预设封面渐变色（无封面图时使用）
 */
export const COVER_GRADIENTS = [
  'linear-gradient(135deg, #5B8C5A 0%, #8FB996 100%)',
  'linear-gradient(135deg, #7A9CC6 0%, #A8C5A8 100%)',
  'linear-gradient(135deg, #E8C07A 0%, #D4E2D4 100%)',
  'linear-gradient(135deg, #6FB0B8 0%, #8FB996 100%)',
  'linear-gradient(135deg, #D47FA0 0%, #A8C5A8 100%)',
  'linear-gradient(135deg, #4A7A49 0%, #A8C5A8 100%)',
]

/**
 * 根据旅程 id 获取稳定的封面渐变色
 */
export function getCoverGradient(id: number): string {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length] ?? COVER_GRADIENTS[0]!
}
