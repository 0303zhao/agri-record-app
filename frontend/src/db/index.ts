/**
 * IndexedDB 数据库初始化
 * 使用 Dexie.js 封装 IndexedDB 操作
 */

import Dexie, { type Table } from 'dexie'
import type {
  Plot,
  PlantingRecord,
  OperationRecord,
  SalesRecord,
} from './types'

/**
 * 农记数据库类
 * 继承 Dexie，定义所有数据表
 */
class AgriDatabase extends Dexie {
  plots!: Table<Plot, number>
  plantingRecords!: Table<PlantingRecord, number>
  operationRecords!: Table<OperationRecord, number>
  salesRecords!: Table<SalesRecord, number>

  constructor() {
    super('AgriRecordDB')

    // 版本 1：初始版本（plots + plantingRecords + 基础 operationRecords）
    this.version(1).stores({
      plots: '++id, name, status',
      plantingRecords: '++id, plotId, year, season, cropName, status, [plotId+year+season]',
      operationRecords: '++id, plantingRecordId, operationType, operationDate',
      salesRecords: '++id, plantingRecordId, saleDate',
    })

    // 版本 2：升级作业记录表（新增分项费用、产品信息字段）
    // 注意：此升级仅在无 operationRecords 数据时安全执行
    this.version(2).stores({
      plots: '++id, name, status',
      plantingRecords: '++id, plotId, year, season, cropName, status, [plotId+year+season]',
      operationRecords: '++id, plantingRecordId, operationType, operationDate',
      salesRecords: '++id, plantingRecordId, saleDate',
    })
  }
}

/** 单例数据库实例 */
export const db = new AgriDatabase()

/**
 * 检查 IndexedDB 是否可用
 */
export async function checkDatabaseAvailable(): Promise<boolean> {
  try {
    await db.open()
    console.log('[农记] IndexedDB 初始化成功，数据库已就绪')
    return true
  } catch (error) {
    console.error('[农记] IndexedDB 不可用:', error)
    return false
  }
}
