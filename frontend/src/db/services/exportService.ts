/**
 * 数据导出与备份服务
 * 封装完整 JSON 备份导出、JSON 备份恢复、Excel 导出功能
 * 所有数据来自本地 IndexedDB，不请求任何后端接口
 */

import * as XLSX from 'xlsx'
import { db } from '../index'
import type { Plot, PlantingRecord, OperationRecord, SalesRecord } from '../types'
import { calculatePlantingStats } from './statsService'
import { getOperationTypeLabel } from '@/utils/operationTypes'
import { formatDateTime, formatMoney, formatNumber } from '@/utils/format'

// =============================================
// 数据采集
// =============================================

/** 获取所有表的数据 */
export async function getAllData() {
  const [plots, plantingRecords, operationRecords, salesRecords] = await Promise.all([
    db.plots.toArray(),
    db.plantingRecords.toArray(),
    db.operationRecords.toArray(),
    db.salesRecords.toArray(),
  ])
  return { plots, plantingRecords, operationRecords, salesRecords }
}

/** 获取各表记录数量 */
export async function getDataStats() {
  const [plotCount, plantingCount, operationCount, salesCount] = await Promise.all([
    db.plots.count(),
    db.plantingRecords.count(),
    db.operationRecords.count(),
    db.salesRecords.count(),
  ])
  return { plotCount, plantingCount, operationCount, salesCount }
}

// =============================================
// JSON 备份导出
// =============================================

export interface BackupMeta {
  appName: string
  backupVersion: number
  dbName: string
  exportedAt: string
  description: string
}

export interface BackupData {
  meta: BackupMeta
  data: {
    plots: Plot[]
    plantingRecords: PlantingRecord[]
    operationRecords: OperationRecord[]
    salesRecords: SalesRecord[]
  }
}

/** 生成当前时间的格式化字符串 */
function timestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/** 导出完整 JSON 备份并触发下载 */
export async function exportFullBackup(): Promise<void> {
  const data = await getAllData()

  const backup: BackupData = {
    meta: {
      appName: '农记',
      backupVersion: 1,
      dbName: 'AgriRecordDB',
      exportedAt: formatDateTime(new Date()),
      description: '农记本地数据完整备份',
    },
    data: {
      plots: data.plots,
      plantingRecords: data.plantingRecords,
      operationRecords: data.operationRecords,
      salesRecords: data.salesRecords,
    },
  }

  const json = JSON.stringify(backup, null, 2)
  const filename = `农记完整备份_${timestamp()}.json`
  downloadBlob(json, filename, 'application/json')
}

// =============================================
// JSON 备份恢复
// =============================================

/** 校验 JSON 是否为合法的农记备份格式 */
export function validateBackupJSON(json: unknown): json is BackupData {
  if (!json || typeof json !== 'object') return false
  const obj = json as Record<string, unknown>

  // 必须有 meta（顶层）
  if (!obj.meta || typeof obj.meta !== 'object') return false
  const meta = obj.meta as Record<string, unknown>
  // meta 必须包含 appName 和 backupVersion
  // （注意：data 在顶层，不在 meta 内）
  if (!meta.appName || meta.backupVersion === undefined) return false

  // 必须有 data（顶层）
  const data = obj.data as Record<string, unknown>
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.plots)) return false
  if (!Array.isArray(data.plantingRecords)) return false
  if (!Array.isArray(data.operationRecords)) return false
  if (!Array.isArray(data.salesRecords)) return false

  return true
}

/** 恢复结果 */
export interface RestoreResult {
  plots: number
  plantingRecords: number
  operationRecords: number
  salesRecords: number
}

/**
 * 将 JSON 中的日期字符串还原为 Date 对象
 * 兼容：字符串日期 → Date、已有 Date 对象保持不变、null/undefined 跳过
 * 不会因日期转换失败而中断恢复
 */
function reviveDates<T>(record: T): T {
  if (!record || typeof record !== 'object') return record
  const r = record as Record<string, unknown>

  const dateFields = ['createdAt', 'updatedAt']
  for (const field of dateFields) {
    const val = r[field]
    // 跳过 null / undefined
    if (val == null) continue
    // 已经是 Date 对象，保持不变
    if (val instanceof Date) continue
    // 字符串 → Date
    if (typeof val === 'string') {
      const d = new Date(val)
      if (isNaN(d.getTime())) {
        console.warn(`[农记] 日期字段 ${field} 值无效: "${val}"，使用当前时间`)
        r[field] = new Date()
      } else {
        r[field] = d
      }
    }
    // 其他类型（数字等）也尝试转换
    if (typeof val === 'number') {
      r[field] = new Date(val)
    }
  }
  return record
}

/** 从备份数据恢复到数据库（清空现有数据后导入，在事务中执行保证原子性） */
export async function restoreFromBackup(backup: BackupData): Promise<RestoreResult> {
  const { plots, plantingRecords, operationRecords, salesRecords } = backup.data

  console.log('[农记] 开始恢复数据...')
  console.log(`[农记] 备份文件内容: ${plots.length} 地块, ${plantingRecords.length} 种植档案, ${operationRecords.length} 作业记录, ${salesRecords.length} 销售记录`)

  // 还原日期字段（字符串 → Date）
  const revivedPlots = plots.map(reviveDates)
  const revivedPlantings = plantingRecords.map(reviveDates)
  const revivedOperations = operationRecords.map(reviveDates)
  const revivedSales = salesRecords.map(reviveDates)

  // 在事务中执行：先清空再批量导入，保证原子性
  // 如果任何一步失败，整个事务自动回滚，不会破坏当前数据
  await db.transaction(
    'rw',
    [db.plots, db.plantingRecords, db.operationRecords, db.salesRecords],
    async () => {
      // 先清空（顺序：先删子表再删父表，避免外键约束问题）
      await db.salesRecords.clear()
      await db.operationRecords.clear()
      await db.plantingRecords.clear()
      await db.plots.clear()

      // 导入（顺序：先父表后子表，保留原始 id，使用 bulkPut 更安全）
      if (revivedPlots.length > 0) await db.plots.bulkPut(revivedPlots)
      if (revivedPlantings.length > 0) await db.plantingRecords.bulkPut(revivedPlantings)
      if (revivedOperations.length > 0) await db.operationRecords.bulkPut(revivedOperations)
      if (revivedSales.length > 0) await db.salesRecords.bulkPut(revivedSales)
    }
  )

  // ========== 验证恢复结果 ==========
  const [actualPlots, actualPlantings, actualOperations, actualSales] = await Promise.all([
    db.plots.count(),
    db.plantingRecords.count(),
    db.operationRecords.count(),
    db.salesRecords.count(),
  ])

  console.log(`[农记] 恢复后数据库实际数量: ${actualPlots} 地块, ${actualPlantings} 种植档案, ${actualOperations} 作业记录, ${actualSales} 销售记录`)

  // 验证数量一致性
  const expected = {
    plots: revivedPlots.length,
    plantingRecords: revivedPlantings.length,
    operationRecords: revivedOperations.length,
    salesRecords: revivedSales.length,
  }
  const actual = {
    plots: actualPlots,
    plantingRecords: actualPlantings,
    operationRecords: actualOperations,
    salesRecords: actualSales,
  }

  if (
    actual.plots !== expected.plots ||
    actual.plantingRecords !== expected.plantingRecords ||
    actual.operationRecords !== expected.operationRecords ||
    actual.salesRecords !== expected.salesRecords
  ) {
    console.error('[农记] 恢复数量不一致:', { expected, actual })
    throw new Error(
      `恢复数据数量不一致：期望 ${expected.plots}/${expected.plantingRecords}/${expected.operationRecords}/${expected.salesRecords}，` +
      `实际 ${actual.plots}/${actual.plantingRecords}/${actual.operationRecords}/${actual.salesRecords}`
    )
  }

  console.log('[农记] 数据恢复成功，数量验证通过')

  return {
    plots: actualPlots,
    plantingRecords: actualPlantings,
    operationRecords: actualOperations,
    salesRecords: actualSales,
  }
}

// =============================================
// Excel 导出
// =============================================

/** 状态映射 */
function plotStatusLabel(s: number): string {
  return s === 1 ? '使用中' : '已废弃'
}

function plantingStatusLabel(s: number): string {
  return s === 1 ? '进行中' : '已完成'
}

/** 按年份筛选（可选） */
interface ExportFilter {
  year?: number
  plotId?: number
}

/**
 * 导出 Excel 表格（全部数据）
 * 包含 5 个 Sheet：地块信息、种植档案、作业记录、销售记录、统计汇总
 */
export async function exportExcel(filter?: ExportFilter): Promise<void> {
  const { plots, plantingRecords, operationRecords, salesRecords } = await getAllData()

  // 构建查找映射
  const plotMap = new Map<number, Plot>()
  plots.forEach((p) => { if (p.id !== undefined) plotMap.set(p.id, p) })

  const plantingMap = new Map<number, PlantingRecord>()
  plantingRecords.forEach((r) => { if (r.id !== undefined) plantingMap.set(r.id, r) })

  // 辅助函数：根据种植档案获取关联的地块信息
  const getPlotInfo = (plantingId: number) => {
    const planting = plantingMap.get(plantingId)
    if (!planting) return { plotName: '', year: '', season: '', crop: '' }
    const plot = plotMap.get(planting.plotId)
    return {
      plotName: plot?.name || '',
      year: planting.year,
      season: planting.season,
      crop: planting.cropName,
    }
  }

  // 筛选（如果指定）
  let filteredPlantings = plantingRecords
  if (filter?.year !== undefined) {
    filteredPlantings = filteredPlantings.filter((r) => r.year === filter.year)
  }
  if (filter?.plotId !== undefined) {
    filteredPlantings = filteredPlantings.filter((r) => r.plotId === filter.plotId)
  }
  const filteredPlantingIds = new Set(filteredPlantings.map((r) => r.id!))
  const filteredOperations = operationRecords.filter((r) => filteredPlantingIds.has(r.plantingRecordId))
  const filteredSales = salesRecords.filter((r) => filteredPlantingIds.has(r.plantingRecordId))
  const filteredPlots = filter?.plotId !== undefined
    ? plots.filter((p) => p.id === filter!.plotId)
    : plots

  // ---- Sheet 1: 地块信息 ----
  const plotRows = filteredPlots.map((p) => ({
    '地块ID': p.id,
    '地块名称': p.name,
    '面积(亩)': p.area,
    '位置': p.location || '',
    '土壤类型': p.soilType || '',
    '状态': plotStatusLabel(p.status),
    '备注': p.notes || '',
    '创建时间': formatDateTime(p.createdAt),
    '更新时间': formatDateTime(p.updatedAt),
  }))

  // ---- Sheet 2: 种植档案 ----
  const plantingRows = filteredPlantings.map((r) => ({
    '档案ID': r.id,
    '地块名称': plotMap.get(r.plotId)?.name || '',
    '年份': r.year,
    '季节': r.season,
    '作物': r.cropName,
    '品种': r.variety || '',
    '种植面积(亩)': r.area,
    '总产量(斤)': r.totalYield ?? '',
    '状态': plantingStatusLabel(r.status),
    '备注': r.notes || '',
    '创建时间': formatDateTime(r.createdAt),
    '更新时间': formatDateTime(r.updatedAt),
  }))

  // ---- Sheet 3: 作业记录 ----
  const operationRows = filteredOperations.map((r) => {
    const info = getPlotInfo(r.plantingRecordId)
    return {
      '记录ID': r.id,
      '地块名称': info.plotName,
      '年份': info.year,
      '季节': info.season,
      '作物': info.crop,
      '作业日期': r.operationDate,
      '作业类型': getOperationTypeLabel(r.operationType),
      '作业说明': r.description || '',
      '使用产品': r.productName || '',
      '品牌': r.brand || '',
      '总用量': r.quantity ?? '',
      '单位': r.unit || '',
      '单价': r.unitPrice ?? '',
      '材料费用': r.materialCost,
      '人工费用': r.laborCost,
      '机械费用': r.machineryCost,
      '其他费用': r.otherCost,
      '总费用': r.totalCost,
      '备注': r.notes || '',
    }
  })

  // ---- Sheet 4: 销售记录 ----
  const saleRows = filteredSales.map((r) => {
    const info = getPlotInfo(r.plantingRecordId)
    return {
      '记录ID': r.id,
      '地块名称': info.plotName,
      '年份': info.year,
      '季节': info.season,
      '作物': info.crop,
      '销售日期': r.saleDate,
      '收购方': r.buyer || '',
      '销售数量(斤)': r.quantity,
      '销售单价(元/斤)': r.unitPrice,
      '销售金额(元)': r.totalAmount,
      '备注': r.notes || '',
    }
  })

  // ---- Sheet 5: 统计汇总 ----
  const statsRows: Array<Record<string, unknown>> = []
  for (const r of filteredPlantings) {
    try {
      const stats = await calculatePlantingStats(r.id!)
      statsRows.push({
        '地块名称': plotMap.get(r.plotId)?.name || '',
        '年份': r.year,
        '季节': r.season,
        '作物': r.cropName,
        '种植面积(亩)': r.area,
        '总投入(元)': formatMoney(stats.totalInput),
        '亩投入(元)': formatMoney(stats.inputPerMu),
        '总产量(斤)': stats.totalYield ?? '',
        '亩产(斤)': stats.yieldPerMu ?? '',
        '已销售(斤)': formatNumber(stats.soldQuantity),
        '未售(斤)': stats.unsoldQuantity ?? '',
        '总收入(元)': formatMoney(stats.totalRevenue),
        '亩收入(元)': formatMoney(stats.revenuePerMu),
        '净利润(元)': formatMoney(stats.netProfit),
        '亩利润(元)': formatMoney(stats.profitPerMu),
      })
    } catch {
      // 统计计算失败时跳过
    }
  }

  // ---- 生成 Excel ----
  const wb = XLSX.utils.book_new()

  addSheet(wb, '地块信息', plotRows)
  addSheet(wb, '种植档案', plantingRows)
  addSheet(wb, '作业记录', operationRows)
  addSheet(wb, '销售记录', saleRows)
  addSheet(wb, '统计汇总', statsRows)

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `农记数据导出_${timestamp()}.xlsx`
  downloadBlob(blob, filename)
}

/** 将数据行数组添加为 Sheet */
function addSheet(wb: XLSX.WorkBook, name: string, rows: Array<Record<string, unknown>>) {
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

// =============================================
// 通用：下载文件
// =============================================

function downloadBlob(content: string | Blob, filename: string, mimeType?: string) {
  let blob: Blob
  if (content instanceof Blob) {
    blob = content
  } else {
    blob = new Blob([content], { type: mimeType || 'application/octet-stream' })
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
