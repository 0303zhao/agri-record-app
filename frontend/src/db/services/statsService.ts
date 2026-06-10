/**
 * 统计汇总服务
 * 计算种植档案的完整投入产出统计
 */

import { getPlantingRecordById } from './plantingRecordService'
import { calculateTotalInputByPlantingId } from './operationRecordService'
import {
  calculateTotalRevenueByPlantingId,
  calculateSoldQuantityByPlantingId,
} from './salesRecordService'
import type { PlantingStats } from '../types'

/**
 * 计算某个种植档案的完整统计数据
 * @param plantingRecordId 种植档案 ID
 * @returns 统计汇总对象
 */
export async function calculatePlantingStats(
  plantingRecordId: number
): Promise<PlantingStats> {
  // 并行获取基础数据
  const [record, totalInput, totalRevenue, soldQuantity] = await Promise.all([
    getPlantingRecordById(plantingRecordId),
    calculateTotalInputByPlantingId(plantingRecordId),
    calculateTotalRevenueByPlantingId(plantingRecordId),
    calculateSoldQuantityByPlantingId(plantingRecordId),
  ])

  if (!record) {
    throw new Error('种植档案不存在')
  }

  const area = record.area || 0
  const totalYield = record.totalYield ?? null

  // 亩投入
  const inputPerMu = area > 0 ? +(totalInput / area).toFixed(2) : 0

  // 亩产
  const yieldPerMu = totalYield != null && area > 0
    ? +(totalYield / area).toFixed(2)
    : null

  // 未售
  const unsoldQuantity = totalYield != null
    ? +(totalYield - soldQuantity).toFixed(2)
    : null

  // 亩收入
  const revenuePerMu = area > 0 ? +(totalRevenue / area).toFixed(2) : 0

  // 净利润
  const netProfit = +(totalRevenue - totalInput).toFixed(2)

  // 亩利润
  const profitPerMu = area > 0 ? +(netProfit / area).toFixed(2) : 0

  return {
    totalInput: +totalInput.toFixed(2),
    inputPerMu,
    totalYield,
    yieldPerMu,
    soldQuantity: +soldQuantity.toFixed(2),
    unsoldQuantity,
    totalRevenue: +totalRevenue.toFixed(2),
    revenuePerMu,
    netProfit,
    profitPerMu,
  }
}
