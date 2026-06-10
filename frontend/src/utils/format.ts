/**
 * 格式化工具函数
 * 统一处理金钱、数字、日期等格式化需求
 */

/**
 * 格式化金额（保留2位小数）
 */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return value.toFixed(2)
}

/**
 * 格式化数字（保留2位小数）
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return value.toFixed(2)
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 格式化日期为 yyyy-MM-dd
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 获取今天的日期字符串 yyyy-MM-dd
 */
export function todayStr(): string {
  return formatDate(new Date())
}
