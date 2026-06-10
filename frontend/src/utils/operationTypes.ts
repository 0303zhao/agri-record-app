/**
 * 作业类型工具文件
 * 定义作业类型编码、中文名称、排序，供全局统一使用
 */

/** 作业类型定义 */
export interface OperationTypeItem {
  code: string
  label: string
  sortOrder: number
}

/** 所有预设作业类型 */
export const OPERATION_TYPES: OperationTypeItem[] = [
  { code: 'land_prep', label: '整地', sortOrder: 1 },
  { code: 'seeding', label: '播种', sortOrder: 2 },
  { code: 'base_fertilizer', label: '底肥', sortOrder: 3 },
  { code: 'pesticide', label: '打药', sortOrder: 4 },
  { code: 'irrigation', label: '浇水', sortOrder: 5 },
  { code: 'top_dressing', label: '追肥', sortOrder: 6 },
  { code: 'labor', label: '用工', sortOrder: 7 },
  { code: 'harvest', label: '收割费用', sortOrder: 8 },
  { code: 'other', label: '其他开支', sortOrder: 9 },
]

/** 编码 → 中文名映射 */
const LABEL_MAP: Record<string, string> = {}
OPERATION_TYPES.forEach((t) => {
  LABEL_MAP[t.code] = t.label
})

/**
 * 根据作业类型编码获取中文名
 * @param code 作业类型编码
 * @returns 中文名，未找到时返回原编码
 */
export function getOperationTypeLabel(code: string): string {
  return LABEL_MAP[code] || code
}

/**
 * 获取作业类型选项列表（供 ActionSheet 使用）
 */
export function getOperationTypeOptions(): Array<{ name: string; value: string }> {
  return OPERATION_TYPES.map((t) => ({
    name: t.label,
    value: t.code,
  }))
}
