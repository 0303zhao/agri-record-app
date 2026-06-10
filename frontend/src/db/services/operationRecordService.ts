/**
 * 作业记录数据库操作服务
 * 封装作业记录表（operationRecords）的所有 CRUD 操作
 * 所有数据存储在本地 IndexedDB 中
 */

import { db } from '../index'
import type { OperationRecord } from '../types'

/**
 * 新增作业记录
 * 自动写入 createdAt、updatedAt
 * 自动计算 totalCost（如果分项费用有值）
 * @returns 新记录的 id
 */
export async function addOperationRecord(
  data: Omit<OperationRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  // 必填校验
  if (!data.plantingRecordId) throw new Error('所属种植档案不能为空')
  if (!data.operationType) throw new Error('作业类型不能为空')
  if (!data.operationDate) throw new Error('作业日期不能为空')

  // 费用不能为负
  if ((data.materialCost ?? 0) < 0) throw new Error('材料费用不能小于0')
  if ((data.laborCost ?? 0) < 0) throw new Error('人工费用不能小于0')
  if ((data.machineryCost ?? 0) < 0) throw new Error('机械费用不能小于0')
  if ((data.otherCost ?? 0) < 0) throw new Error('其他费用不能小于0')

  // 计算总费用
  const materialCost = data.materialCost ?? 0
  const laborCost = data.laborCost ?? 0
  const machineryCost = data.machineryCost ?? 0
  const otherCost = data.otherCost ?? 0
  const autoTotal = materialCost + laborCost + machineryCost + otherCost

  // 如果分项费用有值，则使用自动合计；否则使用用户手动填写的 totalCost
  const hasDetail = materialCost > 0 || laborCost > 0 || machineryCost > 0 || otherCost > 0
  const totalCost = hasDetail ? autoTotal : (data.totalCost ?? 0)

  if (totalCost < 0) throw new Error('总费用不能小于0')

  const now = new Date()
  const id = await db.operationRecords.add({
    ...data,
    materialCost,
    laborCost,
    machineryCost,
    otherCost,
    totalCost,
    createdAt: now,
    updatedAt: now,
  } as OperationRecord)
  return id
}

/**
 * 更新作业记录
 * 自动更新 updatedAt
 * 自动重算 totalCost
 */
export async function updateOperationRecord(
  id: number,
  data: Partial<Omit<OperationRecord, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // 费用校验
  if (data.materialCost !== undefined && data.materialCost < 0) throw new Error('材料费用不能小于0')
  if (data.laborCost !== undefined && data.laborCost < 0) throw new Error('人工费用不能小于0')
  if (data.machineryCost !== undefined && data.machineryCost < 0) throw new Error('机械费用不能小于0')
  if (data.otherCost !== undefined && data.otherCost < 0) throw new Error('其他费用不能小于0')

  // 重新计算 totalCost：先取当前值，再用传入值覆盖
  const current = await db.operationRecords.get(id)
  if (!current) throw new Error('作业记录不存在')

  const materialCost = data.materialCost ?? current.materialCost
  const laborCost = data.laborCost ?? current.laborCost
  const machineryCost = data.machineryCost ?? current.machineryCost
  const otherCost = data.otherCost ?? current.otherCost
  const autoTotal = materialCost + laborCost + machineryCost + otherCost

  // 如果分项费用有值，则用自动合计
  const hasDetail = materialCost > 0 || laborCost > 0 || machineryCost > 0 || otherCost > 0
  const totalCost = hasDetail ? autoTotal : (data.totalCost ?? current.totalCost)

  await db.operationRecords.update(id, {
    ...data,
    materialCost,
    laborCost,
    machineryCost,
    otherCost,
    totalCost,
    updatedAt: new Date(),
  })
}

/**
 * 删除作业记录
 */
export async function deleteOperationRecord(id: number): Promise<void> {
  await db.operationRecords.delete(id)
}

/**
 * 根据 ID 获取单条作业记录
 */
export async function getOperationRecordById(id: number): Promise<OperationRecord | undefined> {
  return await db.operationRecords.get(id)
}

/**
 * 根据种植档案 ID 获取其下所有作业记录
 * 按 operationDate 倒序
 */
export async function getOperationRecordsByPlantingId(
  plantingRecordId: number
): Promise<OperationRecord[]> {
  return await db.operationRecords
    .where('plantingRecordId')
    .equals(plantingRecordId)
    .reverse()
    .sortBy('operationDate')
}

/**
 * 获取所有作业记录
 */
export async function getAllOperationRecords(): Promise<OperationRecord[]> {
  return await db.operationRecords.toArray()
}

/**
 * 计算某个种植档案下所有作业记录的总投入
 * @returns 总费用合计（元）
 */
export async function calculateTotalInputByPlantingId(
  plantingRecordId: number
): Promise<number> {
  const records = await db.operationRecords
    .where('plantingRecordId')
    .equals(plantingRecordId)
    .toArray()
  return records.reduce((sum, r) => sum + (r.totalCost || 0), 0)
}
