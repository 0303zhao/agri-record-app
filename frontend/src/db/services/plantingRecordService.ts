/**
 * 种植档案数据库操作服务
 * 封装种植档案表（plantingRecords）的所有 CRUD 操作
 * 所有数据存储在本地 IndexedDB 中
 */

import { db } from '../index'
import type { PlantingRecord } from '../types'

/**
 * 新增种植档案
 * 自动写入 createdAt、updatedAt
 * 自动检查同一地块+年份+季节的唯一性
 * @returns 新记录的 id
 */
export async function addPlantingRecord(
  data: Omit<PlantingRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  // 必填校验
  if (!data.plotId) throw new Error('地块ID不能为空')
  if (!data.year) throw new Error('年份不能为空')
  if (!data.season) throw new Error('季节不能为空')
  if (!data.cropName) throw new Error('作物名称不能为空')
  if (!data.area || data.area <= 0) throw new Error('种植面积必须大于0')

  // 唯一性检查：同一地块同年同季不能重复
  const existing = await db.plantingRecords
    .where({ plotId: data.plotId, year: data.year, season: data.season })
    .first()
  if (existing) {
    throw new Error(`该地块在 ${data.year} 年 ${data.season} 已存在种植档案，不能重复创建`)
  }

  const now = new Date()
  const id = await db.plantingRecords.add({
    ...data,
    createdAt: now,
    updatedAt: now,
  } as PlantingRecord)
  return id
}

/**
 * 更新种植档案
 * 自动更新 updatedAt
 * 自动检查唯一性（排除自身）
 */
export async function updatePlantingRecord(
  id: number,
  data: Partial<Omit<PlantingRecord, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // 面积校验
  if (data.area !== undefined && data.area <= 0) {
    throw new Error('种植面积必须大于0')
  }

  // 如果修改了 plotId / year / season，需要检查唯一性
  if (data.plotId !== undefined || data.year !== undefined || data.season !== undefined) {
    const current = await db.plantingRecords.get(id)
    if (!current) throw new Error('种植档案不存在')

    const plotId = data.plotId ?? current.plotId
    const year = data.year ?? current.year
    const season = data.season ?? current.season

    const existing = await db.plantingRecords
      .where({ plotId, year, season })
      .first()
    if (existing && existing.id !== id) {
      throw new Error(`该地块在 ${year} 年 ${season} 已存在种植档案，不能重复创建`)
    }
  }

  await db.plantingRecords.update(id, {
    ...data,
    updatedAt: new Date(),
  })
}

/**
 * 删除种植档案
 * 注意：后续需要检查是否有关联的作业记录（operationRecords）
 *       和销售记录（salesRecords），存在关联时禁止删除。
 * 当前版本暂不做此检查。
 */
export async function deletePlantingRecord(id: number): Promise<void> {
  // 检查是否有关联的作业记录
  const hasOperations = await db.operationRecords.where('plantingRecordId').equals(id).count()
  if (hasOperations > 0) {
    throw new Error('该种植档案下已有作业记录，请先删除相关作业记录后再删除种植档案')
  }
  // 检查是否有关联的销售记录
  const hasSales = await db.salesRecords.where('plantingRecordId').equals(id).count()
  if (hasSales > 0) {
    throw new Error('该种植档案下已有销售记录，请先删除相关销售记录后再删除种植档案')
  }
  await db.plantingRecords.delete(id)
}

/**
 * 根据 ID 获取单个种植档案
 */
export async function getPlantingRecordById(id: number): Promise<PlantingRecord | undefined> {
  return await db.plantingRecords.get(id)
}

/**
 * 根据地块 ID 获取该地块下所有种植档案
 * 按 year 倒序、season 排序
 */
export async function getPlantingRecordsByPlotId(plotId: number): Promise<PlantingRecord[]> {
  return await db.plantingRecords
    .where('plotId')
    .equals(plotId)
    .reverse()
    .sortBy('year')
}

/**
 * 获取所有种植档案
 */
export async function getAllPlantingRecords(): Promise<PlantingRecord[]> {
  return await db.plantingRecords.orderBy('year').reverse().toArray()
}

/**
 * 多条件搜索种植档案
 * 支持按 plotId、year、cropName、status 筛选
 * 后续历史查询功能使用
 * 注意：使用 toArray() 后在内存中筛选，避免未索引字段的 Dexie 报错
 */
export async function searchPlantingRecords(params: {
  plotId?: number
  year?: number
  cropName?: string
  status?: number
}): Promise<PlantingRecord[]> {
  const results = await db.plantingRecords.toArray()

  return results.filter((r) => {
    if (params.plotId !== undefined && r.plotId !== params.plotId) return false
    if (params.year !== undefined && r.year !== params.year) return false
    if (params.cropName && !r.cropName.includes(params.cropName)) return false
    if (params.status !== undefined && r.status !== params.status) return false
    return true
  })
}

/**
 * 获取所有已出现的年份（从种植档案中提取，降序）
 */
export async function getAllYears(): Promise<number[]> {
  const records = await db.plantingRecords.toArray()
  const years = [...new Set(records.map((r) => r.year))]
  return years.sort((a, b) => b - a)
}

/**
 * 获取所有已出现的作物名称（从种植档案中提取，去重排序）
 */
export async function getAllCropNames(): Promise<string[]> {
  const records = await db.plantingRecords.toArray()
  const names = [...new Set(records.map((r) => r.cropName))]
  return names.sort()
}
