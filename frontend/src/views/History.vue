<template>
  <div class="history-page">
    <div class="page-header">
      <h2 class="page-title">历史查询</h2>
    </div>

    <!-- ========== 筛选区域 ========== -->
    <van-dropdown-menu active-color="#1989fa">
      <van-dropdown-item
        v-model="filterYear"
        :options="yearOptions"
        title="年份"
        @change="onFilterChange"
      />
      <van-dropdown-item
        v-model="filterCrop"
        :options="cropOptions"
        title="作物"
        @change="onFilterChange"
      />
      <van-dropdown-item
        v-model="filterPlot"
        :options="plotOptions"
        title="地块"
        @change="onFilterChange"
      />
      <van-dropdown-item
        v-model="filterStatus"
        :options="statusOptions"
        title="状态"
        @change="onFilterChange"
      />
    </van-dropdown-menu>

    <div class="filter-actions">
      <van-button size="small" plain type="primary" icon="replay" @click="resetFilters">
        重置筛选
      </van-button>
      <span class="filter-count" v-if="results.length > 0">共 {{ results.length }} 条</span>
    </div>

    <!-- ========== 查询汇总 ========== -->
    <div class="summary-bar" v-if="results.length > 0 && !loading">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="sv">{{ results.length }}</div>
          <div class="sl">档案数量</div>
        </div>
        <div class="summary-item">
          <div class="sv">{{ formatNumber(totalArea) }}</div>
          <div class="sl">总面积(亩)</div>
        </div>
        <div class="summary-item">
          <div class="sv">{{ formatMoney(totalInput) }}</div>
          <div class="sl">总投入(元)</div>
        </div>
        <div class="summary-item">
          <div class="sv">{{ formatMoney(totalRevenue) }}</div>
          <div class="sl">总收入(元)</div>
        </div>
        <div class="summary-item">
          <div class="sv" :class="{ negative: totalNetProfit < 0 }">{{ formatMoney(totalNetProfit) }}</div>
          <div class="sl">总净利润(元)</div>
        </div>
        <div class="summary-item">
          <div class="sv">{{ formatMoney(avgProfitPerMu) }}</div>
          <div class="sl">平均亩利润(元)</div>
        </div>
      </div>
    </div>

    <!-- ========== 结果列表 ========== -->
    <van-loading v-if="loading" class="loading-center" size="28" />

    <van-empty
      v-else-if="results.length === 0"
      image="search"
      description="暂无符合条件的种植档案"
    />

    <div v-else class="result-list">
      <div
        v-for="item in results"
        :key="item.planting.id"
        class="history-card"
        @click="goDetail(item.planting.id ?? 0)"
      >
        <!-- 卡片头部：地块 + 年份 + 季节 + 状态 -->
        <div class="card-header">
          <div class="card-title-row">
            <span class="card-title">{{ item.plotName }}</span>
            <van-tag
              :type="item.planting.status === 1 ? 'warning' : 'success'"
              size="medium"
            >
              {{ item.planting.status === 1 ? '进行中' : '已完成' }}
            </van-tag>
          </div>
          <div class="card-sub">
            {{ item.planting.year }} 年 · {{ item.planting.season }}
            <span class="card-crop">{{ item.planting.cropName }}</span>
            <span v-if="item.planting.variety" class="card-variety">（{{ item.planting.variety }}）</span>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="card-info">
          <span class="info-item">面积 <b>{{ item.planting.area }}</b> 亩</span>
          <span class="info-item" v-if="item.stats.totalYield !== null">
            产量 <b>{{ item.stats.totalYield }}</b> 斤
          </span>
        </div>

        <!-- 财务数据 -->
        <div class="card-finance">
          <div class="finance-item">
            <span class="fl">投入</span>
            <span class="fv">{{ formatMoney(item.stats.totalInput) }}</span>
          </div>
          <div class="finance-item">
            <span class="fl">收入</span>
            <span class="fv income">{{ formatMoney(item.stats.totalRevenue) }}</span>
          </div>
          <div class="finance-item">
            <span class="fl">净利润</span>
            <span class="fv" :class="{ negative: item.stats.netProfit < 0 }">
              {{ formatMoney(item.stats.netProfit) }}
            </span>
          </div>
          <div class="finance-item">
            <span class="fl">亩利润</span>
            <span class="fv" :class="{ negative: item.stats.profitPerMu < 0 }">
              {{ formatMoney(item.stats.profitPerMu) }}
            </span>
          </div>
        </div>

        <van-icon name="arrow" class="card-arrow" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getAllPlots } from '@/db/services/plotService'
import {
  searchPlantingRecords,
  getAllYears,
  getAllCropNames,
} from '@/db/services/plantingRecordService'
import { calculatePlantingStats } from '@/db/services/statsService'
import { formatMoney, formatNumber } from '@/utils/format'
import type { PlantingRecord, PlantingStats } from '@/db/types'

const router = useRouter()

// ---- 筛选状态 ----
const filterYear = ref(0)      // 0 = 全部
const filterCrop = ref('')     // '' = 全部
const filterPlot = ref(0)      // 0 = 全部
const filterStatus = ref(-1)   // -1 = 全部

// ---- 筛选选项 ----
const yearOptions = ref<{ text: string; value: number }[]>([{ text: '全部年份', value: 0 }])
const cropOptions = ref<{ text: string; value: string }[]>([{ text: '全部作物', value: '' }])
const plotOptions = ref<{ text: string; value: number }[]>([{ text: '全部地块', value: 0 }])
const statusOptions = [
  { text: '全部状态', value: -1 },
  { text: '进行中', value: 1 },
  { text: '已完成', value: 2 },
]

// ---- 结果 ----
interface HistoryItem {
  planting: PlantingRecord
  plotName: string
  stats: PlantingStats
}

const results = ref<HistoryItem[]>([])
const loading = ref(false)
const plotNameMap = ref<Map<number, string>>(new Map())

// ---- 汇总计算 ----
const totalArea = computed(() => {
  return results.value.reduce((sum, r) => sum + (r.planting.area || 0), 0)
})

const totalInput = computed(() => {
  return results.value.reduce((sum, r) => sum + r.stats.totalInput, 0)
})

const totalRevenue = computed(() => {
  return results.value.reduce((sum, r) => sum + r.stats.totalRevenue, 0)
})

const totalNetProfit = computed(() => {
  return results.value.reduce((sum, r) => sum + r.stats.netProfit, 0)
})

const avgProfitPerMu = computed(() => {
  const area = totalArea.value
  if (area <= 0) return 0
  return +(totalNetProfit.value / area).toFixed(2)
})

// ---- 初始化加载筛选选项 ----
onMounted(async () => {
  try {
    const [plots, years, crops] = await Promise.all([
      getAllPlots(),
      getAllYears(),
      getAllCropNames(),
    ])

    // 构建地块名称映射
    const map = new Map<number, string>()
    for (const p of plots) {
      if (p.id !== undefined) map.set(p.id, p.name)
    }
    plotNameMap.value = map

    // 构建下拉选项
    yearOptions.value = [
      { text: '全部年份', value: 0 },
      ...years.map((y) => ({ text: `${y} 年`, value: y })),
    ]
    cropOptions.value = [
      { text: '全部作物', value: '' },
      ...crops.map((c) => ({ text: c, value: c })),
    ]
    plotOptions.value = [
      { text: '全部地块', value: 0 },
      ...plots.map((p) => ({ text: p.name, value: p.id! })),
    ]
  } catch (e) {
    console.error('[农记] 加载筛选选项失败:', e)
    showToast('加载筛选选项失败')
  }

  // 初次加载全部数据
  await loadResults()
})

// ---- 筛选变化 ----
function onFilterChange() {
  loadResults()
}

async function loadResults() {
  loading.value = true
  try {
    // 构建查询参数
    const params: {
      plotId?: number
      year?: number
      cropName?: string
      status?: number
    } = {}
    if (filterYear.value !== 0) params.year = filterYear.value
    if (filterCrop.value !== '') params.cropName = filterCrop.value
    if (filterPlot.value !== 0) params.plotId = filterPlot.value
    if (filterStatus.value !== -1) params.status = filterStatus.value

    const records = await searchPlantingRecords(params)

    // 并行加载每个档案的地块名称和统计数据
    const items: HistoryItem[] = []
    for (const planting of records) {
      const plotName = plotNameMap.value.get(planting.plotId) || '未知地块'
      let stats: PlantingStats
      try {
        stats = await calculatePlantingStats(planting.id!)
      } catch {
        // 如果计算失败（如种植档案不存在），跳过该项
        continue
      }
      items.push({ planting, plotName, stats })
    }

    // 内存排序：1. 年份倒序  2. 同一年内地块名称  3. 同地块同一年内季节
    const seasonOrder: Record<string, number> = { '上季': 1, '下季': 2 }
    items.sort((a, b) => {
      // 年份倒序
      if (a.planting.year !== b.planting.year) {
        return b.planting.year - a.planting.year
      }
      // 地块名称升序
      if (a.plotName !== b.plotName) {
        return a.plotName.localeCompare(b.plotName)
      }
      // 季节排序（上季在前）
      const sa = seasonOrder[a.planting.season] ?? 99
      const sb = seasonOrder[b.planting.season] ?? 99
      return sa - sb
    })

    results.value = items
  } catch (e) {
    console.error('[农记] 查询历史记录失败:', e)
    showToast('查询失败')
  } finally {
    loading.value = false
  }
}

// ---- 重置筛选 ----
function resetFilters() {
  filterYear.value = 0
  filterCrop.value = ''
  filterPlot.value = 0
  filterStatus.value = -1
  loadResults()
}

// ---- 导航 ----
function goDetail(id: number) {
  router.push({ name: 'PlantingDetail', params: { id: String(id) } })
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 24px;
}

.page-header {
  padding: 16px 0 8px;
  text-align: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* ---- 筛选操作栏 ---- */
.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}

.filter-count {
  font-size: 13px;
  color: #999;
}

/* ---- 查询汇总 ---- */
.summary-bar {
  margin: 0 12px 8px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.summary-item {
  text-align: center;
  padding: 4px 0;
}

.sv {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.sv.negative {
  color: #ee0a24;
}

.sl {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

/* ---- 加载/空状态 ---- */
.loading-center {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

/* ---- 结果列表 ---- */
.result-list {
  padding: 0 12px;
}

.history-card {
  position: relative;
  background: #fff;
  border-radius: 10px;
  margin-bottom: 10px;
  padding: 14px 16px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  overflow: hidden;
}

.history-card:active {
  background: #f9f9f9;
}

.card-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #c8c9cc;
  font-size: 16px;
}

.card-header {
  margin-bottom: 10px;
  padding-right: 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.card-sub {
  font-size: 13px;
  color: #999;
}

.card-crop {
  color: #1989fa;
  font-weight: 500;
  margin-left: 4px;
}

.card-variety {
  color: #999;
  font-size: 12px;
}

/* ---- 基本信息 ---- */
.card-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.info-item b {
  color: #333;
  font-weight: 600;
}

/* ---- 财务数据 ---- */
.card-finance {
  display: flex;
  gap: 4px;
}

.finance-item {
  flex: 1;
  text-align: center;
  padding: 6px 2px;
  background: #f7f8fa;
  border-radius: 6px;
}

.fl {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}

.fv {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.fv.income {
  color: #07c160;
}

.fv.negative {
  color: #ee0a24;
}
</style>
