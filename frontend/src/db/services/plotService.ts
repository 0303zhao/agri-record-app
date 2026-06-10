/**
 * 地块数据库操作服务
 * 封装地块表（plots）的所有 CRUD 操作
 * 所有数据存储在本地 IndexedDB 中
 */

import { db } from '../index'
import type { Plot } from '../types'

/**
 * 新增地块
 * @returns 新地块的 id
 */
export async function addPlot(
  data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const now = new Date()
  const id = await db.plots.add({
    ...data,
    createdAt: now,
    updatedAt: now,
  } as Plot)
  return id
}

/**
 * 更新地块
 * 自动更新 updatedAt 字段
 */
export async function updatePlot(
  id: number,
  data: Partial<Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.plots.update(id, {
    ...data,
    updatedAt: new Date(),
  })
}

/**
 * 删除地块
 * 注意：后续需要在此处检查该地块是否关联了种植档案（plantingRecords），
 * 如果存在关联则禁止删除并提示用户。
 * 当前版本（仅有地块管理）不做此检查。
 */
export async function deletePlot(id: number): Promise<void> {
  // 检查该地块是否关联了种植档案，存在则禁止删除
  const hasPlanting = await db.plantingRecords.where('plotId').equals(id).count()
  if (hasPlanting > 0) {
    throw new Error('该地块下已有种植档案，请先删除相关种植档案后再删除地块')
  }
  await db.plots.delete(id)
}

/**
 * 根据 ID 获取单个地块
 */
export async function getPlotById(id: number): Promise<Plot | undefined> {
  return await db.plots.get(id)
}

/**
 * 获取所有地块，按更新时间倒序排列
 * 注意：updatedAt 未建立索引，改用内存排序
 */
export async function getAllPlots(): Promise<Plot[]> {
  const plots = await db.plots.toArray()
  return plots.sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return tb - ta
  })
}

/**
 * 获取所有使用中的地块（status = 1）
 * 注意：updatedAt 未建立索引，改用内存排序
 */
export async function getActivePlots(): Promise<Plot[]> {
  const plots = await db.plots
    .where('status')
    .equals(1)
    .toArray()
  return plots.sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return tb - ta
  })
}
