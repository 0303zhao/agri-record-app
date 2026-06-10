/**
 * 销售记录数据库操作服务
 * 封装销售记录表（salesRecords）的所有 CRUD 操作
 */

import { db } from '../index'
import type { SalesRecord } from '../types'

/**
 * 新增销售记录
 * 自动写入 createdAt、updatedAt
 * 自动计算 totalAmount = quantity × unitPrice
 */
export async function addSalesRecord(
  data: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount'>
): Promise<number> {
  if (!data.plantingRecordId) throw new Error('所属种植档案不能为空')
  if (!data.saleDate) throw new Error('销售日期不能为空')
  if (!data.quantity || data.quantity <= 0) throw new Error('销售数量必须大于0')
  if (data.unitPrice === undefined || data.unitPrice === null) throw new Error('销售单价不能为空')
  if (data.unitPrice < 0) throw new Error('销售单价不能小于0')

  const now = new Date()
  const totalAmount = +(data.quantity * data.unitPrice).toFixed(2)
  const id = await db.salesRecords.add({
    ...data,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  } as SalesRecord)
  return id
}

/**
 * 更新销售记录
 * 自动重算 totalAmount
 */
export async function updateSalesRecord(
  id: number,
  data: Partial<Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount'>>
): Promise<void> {
  if (data.quantity !== undefined && data.quantity <= 0) throw new Error('销售数量必须大于0')
  if (data.unitPrice !== undefined && data.unitPrice < 0) throw new Error('销售单价不能小于0')

  // 重新计算金额
  const current = await db.salesRecords.get(id)
  if (!current) throw new Error('销售记录不存在')

  const quantity = data.quantity ?? current.quantity
  const unitPrice = data.unitPrice ?? current.unitPrice
  const totalAmount = +(quantity * unitPrice).toFixed(2)

  await db.salesRecords.update(id, {
    ...data,
    totalAmount,
    updatedAt: new Date(),
  })
}

/**
 * 删除销售记录
 */
export async function deleteSalesRecord(id: number): Promise<void> {
  await db.salesRecords.delete(id)
}

/**
 * 根据 ID 获取单条销售记录
 */
export async function getSalesRecordById(id: number): Promise<SalesRecord | undefined> {
  return await db.salesRecords.get(id)
}

/**
 * 根据种植档案 ID 获取其下所有销售记录
 * 按 saleDate 倒序
 */
export async function getSalesRecordsByPlantingId(
  plantingRecordId: number
): Promise<SalesRecord[]> {
  return await db.salesRecords
    .where('plantingRecordId')
    .equals(plantingRecordId)
    .reverse()
    .sortBy('saleDate')
}

/**
 * 获取所有销售记录
 */
export async function getAllSalesRecords(): Promise<SalesRecord[]> {
  return await db.salesRecords.toArray()
}

/**
 * 计算种植档案下所有销售记录的总收入
 */
export async function calculateTotalRevenueByPlantingId(
  plantingRecordId: number
): Promise<number> {
  const records = await db.salesRecords
    .where('plantingRecordId')
    .equals(plantingRecordId)
    .toArray()
  return records.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
}

/**
 * 计算种植档案下所有销售记录的已销售总数量（斤）
 */
export async function calculateSoldQuantityByPlantingId(
  plantingRecordId: number
): Promise<number> {
  const records = await db.salesRecords
    .where('plantingRecordId')
    .equals(plantingRecordId)
    .toArray()
  return records.reduce((sum, r) => sum + (r.quantity || 0), 0)
}
