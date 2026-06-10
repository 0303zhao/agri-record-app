<template>
  <div class="dashboard-page">
    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading-center" size="32" text="加载中..." />

    <!-- 加载失败 -->
    <van-empty v-else-if="loadError" image="network" description="数据加载失败">
      <van-button round type="primary" size="small" @click="loadAllData">重新加载</van-button>
    </van-empty>

    <!-- 主内容 -->
    <template v-else>
      <!-- ========== 顶部标题区 ========== -->
      <div class="dashboard-header">
        <div class="app-icon">
          <van-icon name="flower-o" size="44" color="#07c160" />
        </div>
        <h1 class="app-title">农记</h1>
        <p class="app-desc">长期记录地块种植数据，方便多年对比分析</p>
      </div>

      <!-- ========== 本年度统计 ========== -->
      <div class="section">
        <div class="section-title">
          <span>{{ currentYear }} 年数据概览</span>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ activePlotCount }}</div>
            <div class="stat-label">使用中地块</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ currentYearPlantingCount }}</div>
            <div class="stat-label">种植档案</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(currentYearTotalArea) }}</div>
            <div class="stat-label">总种植面积(亩)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatMoney(currentYearTotalInput) }}</div>
            <div class="stat-label">总投入(元)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatMoney(currentYearTotalRevenue) }}</div>
            <div class="stat-label">总收入(元)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" :class="{ negative: currentYearNetProfit < 0 }">
              {{ formatMoney(currentYearNetProfit) }}
            </div>
            <div class="stat-label">净利润(元)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value in-progress">{{ inProgressCount }}</div>
            <div class="stat-label">进行中档案</div>
          </div>
          <div class="stat-card">
            <div class="stat-value completed">{{ completedCount }}</div>
            <div class="stat-label">已完成档案</div>
          </div>
        </div>
      </div>

      <!-- ========== 快捷入口 ========== -->
      <div class="section">
        <div class="section-title">
          <span>快捷操作</span>
        </div>
        <div class="action-grid">
          <div class="action-card" @click="goNewPlot">
            <van-icon name="add-o" size="24" color="#07c160" />
            <span class="action-label">新增地块</span>
          </div>
          <div class="action-card" @click="goPlots">
            <van-icon name="map-marked" size="24" color="#1989fa" />
            <span class="action-label">查看地块</span>
          </div>
          <div class="action-card" @click="goHistory">
            <van-icon name="search" size="24" color="#ff976a" />
            <span class="action-label">历史查询</span>
          </div>
          <div class="action-card" @click="goExport">
            <van-icon name="down" size="24" color="#7232dd" />
            <span class="action-label">数据导出</span>
          </div>
        </div>
      </div>

      <!-- ========== 最近种植档案 ========== -->
      <div class="section">
        <div class="section-title">
          <span>最近种植档案</span>
          <span class="section-more" @click="goHistory">更多 →</span>
        </div>

        <van-empty
          v-if="recentPlantings.length === 0"
          image="default"
          description="暂无种植档案"
        >
          <p class="empty-hint">点击上方"新增地块"开始使用</p>
        </van-empty>

        <div v-else class="recent-list">
          <div
            v-for="item in recentPlantings"
            :key="item.planting.id"
            class="recent-card"
            @click="goPlantingDetail(item.planting.id ?? 0)"
          >
            <div class="recent-card-top">
              <div class="recent-title-row">
                <span class="recent-plot-name">{{ item.plotName }}</span>
                <van-tag
                  :type="item.planting.status === 1 ? 'warning' : 'success'"
                  size="medium"
                >
                  {{ item.planting.status === 1 ? '进行中' : '已完成' }}
                </van-tag>
              </div>
              <div class="recent-sub">
                {{ item.planting.year }} 年 · {{ item.planting.season }}
                <span class="recent-crop">{{ item.planting.cropName }}</span>
                <span v-if="item.planting.variety">（{{ item.planting.variety }}）</span>
              </div>
            </div>
            <div class="recent-card-bottom">
              <span class="recent-info">面积 <b>{{ item.planting.area }}</b> 亩</span>
              <span class="recent-profit" :class="{ negative: item.stats.netProfit < 0 }">
                净利润 {{ formatMoney(item.stats.netProfit) }} 元
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 数据安全提醒 ========== -->
      <div class="tips-section">
        <div class="tip-card">
          <van-icon name="info-o" size="16" color="#1989fa" />
          <span>数据仅保存在本机，请定期到「数据导出」页面备份</span>
        </div>
        <div class="tip-card">
          <van-icon name="add-o" size="16" color="#2f8f46" />
          <span>可通过浏览器菜单「添加到主屏幕」，像 App 一样使用</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getAllPlots } from '@/db/services/plotService'
import { getAllPlantingRecords } from '@/db/services/plantingRecordService'
import { calculatePlantingStats } from '@/db/services/statsService'
import { formatMoney, formatNumber } from '@/utils/format'
import type { PlantingRecord, PlantingStats } from '@/db/types'

const router = useRouter()
const currentYear = new Date().getFullYear()

// ---- 加载状态 ----
const loading = ref(true)
const loadError = ref(false)

// ---- 地块数据 ----
const activePlotCount = ref(0)
const plotNameMap = ref<Map<number, string>>(new Map())

// ---- 种植档案数据 ----
const allPlantings = ref<PlantingRecord[]>([])
const currentYearPlantingCount = ref(0)
const currentYearTotalArea = ref(0)
const currentYearTotalInput = ref(0)
const currentYearTotalRevenue = ref(0)
const currentYearNetProfit = ref(0)
const inProgressCount = ref(0)
const completedCount = ref(0)

// ---- 最近种植档案 ----
interface RecentItem {
  planting: PlantingRecord
  plotName: string
  stats: PlantingStats
}
const recentPlantings = ref<RecentItem[]>([])

// ---- 加载所有数据 ----
async function loadAllData() {
  loading.value = true
  loadError.value = false
  try {
    // 1. 并行加载基础数据
    const [plots, plantings] = await Promise.all([
      getAllPlots(),
      getAllPlantingRecords(),
    ])

    allPlantings.value = plantings

    // 2. 构建地块名称映射
    const map = new Map<number, string>()
    for (const p of plots) {
      if (p.id !== undefined) map.set(p.id, p.name)
    }
    plotNameMap.value = map

    // 3. 计算使用中地块数量
    activePlotCount.value = plots.filter((p) => p.status === 1).length

    // 4. 计算本年度统计
    const currentYearPlantings = plantings.filter((p) => p.year === currentYear)
    currentYearPlantingCount.value = currentYearPlantings.length
    currentYearTotalArea.value = currentYearPlantings.reduce((sum, p) => sum + (p.area || 0), 0)

    // 并行计算每个本年度种植档案的统计
    let totalInput = 0
    let totalRevenue = 0
    if (currentYearPlantings.length > 0) {
      const statsResults = await Promise.all(
        currentYearPlantings.map((p) =>
          calculatePlantingStats(p.id!).catch(() => null)
        )
      )
      for (const stats of statsResults) {
        if (stats) {
          totalInput += stats.totalInput
          totalRevenue += stats.totalRevenue
        }
      }
    }
    currentYearTotalInput.value = +totalInput.toFixed(2)
    currentYearTotalRevenue.value = +totalRevenue.toFixed(2)
    currentYearNetProfit.value = +(totalRevenue - totalInput).toFixed(2)

    // 5. 进行中 / 已完成数量（所有年份）
    inProgressCount.value = plantings.filter((p) => p.status === 1).length
    completedCount.value = plantings.filter((p) => p.status === 2).length

    // 6. 最近 3 条种植档案（按 updatedAt 倒序，内存排序）
    const sorted = [...plantings].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return tb - ta
    })
    const recent = sorted.slice(0, 3)

    // 并行计算最近档案的统计
    const recentItems: RecentItem[] = []
    for (const planting of recent) {
      const plotName = map.get(planting.plotId) || '未知地块'
      let stats: PlantingStats
      try {
        stats = await calculatePlantingStats(planting.id!)
      } catch {
        stats = {
          totalInput: 0, inputPerMu: 0,
          totalYield: null, yieldPerMu: null,
          soldQuantity: 0, unsoldQuantity: null,
          totalRevenue: 0, revenuePerMu: 0,
          netProfit: 0, profitPerMu: 0,
        }
      }
      recentItems.push({ planting, plotName, stats })
    }
    recentPlantings.value = recentItems
  } catch (e) {
    console.error('[农记] 加载首页数据失败:', e)
    loadError.value = true
    showToast('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// ---- 导航 ----
function goNewPlot() {
  router.push({ name: 'PlotNew' })
}
function goPlots() {
  router.push({ name: 'PlotList' })
}
function goHistory() {
  router.push({ name: 'History' })
}
function goExport() {
  router.push({ name: 'Export' })
}
function goPlantingDetail(id: number) {
  router.push({ name: 'PlantingDetail', params: { id: String(id) } })
}

onMounted(() => {
  loadAllData()
})
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
}

.loading-center {
  display: flex;
  justify-content: center;
  padding-top: 120px;
}

/* ========== Header ========== */
.dashboard-header {
  text-align: center;
  padding: 28px 0 16px;
}

.app-icon {
  margin-bottom: 8px;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: #07c160;
  margin-bottom: 4px;
}

.app-desc {
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

/* ========== Section ========== */
.section {
  margin-top: 12px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.section-more {
  font-size: 13px;
  font-weight: 400;
  color: #1989fa;
  cursor: pointer;
}

/* ========== Stats Grid (2 columns × 4 rows = 8 stats) ========== */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #07c160;
  line-height: 1.2;
}

.stat-value.negative {
  color: #ee0a24;
}

.stat-value.in-progress {
  color: #ff976a;
}

.stat-value.completed {
  color: #1989fa;
}

.stat-label {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

/* ========== Quick Actions ========== */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 0 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fff;
  border-radius: 10px;
  padding: 16px 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  min-height: 72px;
}

.action-card:active {
  background: #f5f5f5;
}

.action-label {
  font-size: 12px;
  color: #666;
  text-align: center;
  line-height: 1.3;
}

/* ========== Recent Planting List ========== */
.recent-list {
  padding: 0 12px;
}

.recent-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.recent-card:active {
  background: #f9f9f9;
}

.recent-card-top {
  margin-bottom: 8px;
}

.recent-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.recent-plot-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.recent-sub {
  font-size: 13px;
  color: #999;
}

.recent-crop {
  color: #1989fa;
  font-weight: 500;
  margin-left: 4px;
}

.recent-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
}

.recent-info b {
  color: #333;
  font-weight: 600;
}

.recent-profit {
  font-weight: 600;
  color: #07c160;
}

.recent-profit.negative {
  color: #ee0a24;
}

/* ========== Empty Hint ========== */
.empty-hint {
  font-size: 13px;
  color: #bbb;
  text-align: center;
  line-height: 1.8;
}

/* ========== Tips ========== */
.tips-section {
  padding: 8px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tip-card .van-icon {
  flex-shrink: 0;
}
</style>
