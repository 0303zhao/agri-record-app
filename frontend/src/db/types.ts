/**
 * 数据库核心类型定义
 * 定义所有业务实体的 TypeScript 类型
 * 后续开发业务功能时在此文件中扩展
 */

// =============================================
// 地块
// =============================================
export interface Plot {
  id?: number                    // 主键，自增
  name: string                   // 地块名称，如"村东头大块地"
  area: number                   // 面积（亩）
  location?: string              // 位置描述
  soilType?: string              // 土壤类型
  status: number                 // 1=使用中, 0=已废弃
  notes?: string                 // 备注
  createdAt: Date               // 创建时间
  updatedAt: Date               // 更新时间
}

// =============================================
// 种植档案
// =============================================
export interface PlantingRecord {
  id?: number
  plotId: number                // 关联地块ID
  year: number                  // 种植年份
  season: string                // 季节，如 "上季" / "下季"
  cropName: string              // 作物名称
  variety?: string              // 品种
  area: number                  // 实际种植面积（亩）
  totalYield?: number           // 总产量（斤）
  status: number                // 1=进行中, 2=已完成
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =============================================
// 作业记录
// =============================================
export interface OperationRecord {
  id?: number
  plantingRecordId: number      // 关联种植档案ID
  operationType: string         // 作业类型编码
  operationDate: string         // 作业日期
  description?: string          // 作业说明，如"第一次除草"
  productName?: string          // 使用产品名称，如"复合肥"
  brand?: string                // 品牌
  quantity?: number             // 总用量
  unit?: string                 // 单位：斤/公斤/袋/瓶/亩/小时/次/其他
  unitPrice?: number            // 单价
  materialCost: number          // 材料费用，默认 0
  laborCount?: number           // 用工人数
  laborCost: number             // 人工费用，默认 0
  machineryCost: number         // 机械费用，默认 0
  otherCost: number             // 其他费用，默认 0
  totalCost: number             // 总费用 = materialCost + laborCost + machineryCost + otherCost
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =============================================
// 销售记录
// =============================================
export interface SalesRecord {
  id?: number
  plantingRecordId: number      // 关联种植档案ID
  saleDate: string              // 销售日期
  buyer?: string                // 收购方
  quantity: number              // 销售数量（斤）
  unitPrice: number             // 单价（元/斤）
  totalAmount: number           // 总金额 = quantity × unitPrice
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =============================================
// 作业类型预设
// =============================================
export interface OperationType {
  code: string                  // 编码，如 "land_prep"
  name: string                  // 中文名，如 "整地"
  sortOrder: number             // 排序
}

// =============================================
// 统计汇总（计算字段，不存数据库）
// =============================================
export interface PlantingStats {
  totalInput: number            // 总投入（元）
  inputPerMu: number            // 亩投入（元/亩）
  totalYield: number | null     // 总产量（斤），null 表示未填写
  yieldPerMu: number | null     // 亩产（斤/亩），null 表示未填写
  soldQuantity: number          // 已销售数量（斤）
  unsoldQuantity: number | null // 未售数量（斤），产量未填写时显示 null
  totalRevenue: number          // 总收入（元）
  revenuePerMu: number          // 亩收入（元/亩）
  netProfit: number             // 净利润（元）
  profitPerMu: number           // 亩利润（元/亩）
}
