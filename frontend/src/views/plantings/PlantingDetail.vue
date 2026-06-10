<template>
  <div class="planting-detail-page">
    <van-nav-bar title="种植档案" left-text="返回" left-arrow @click-left="goBack">
      <template #right>
        <van-icon name="edit" size="20" @click="goEdit" />
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" class="loading-center" size="32" />
    <van-empty v-else-if="!record" description="种植档案不存在" />

    <template v-else>
      <!-- ========== 1. 头部 ========== -->
      <div class="detail-header">
        <div class="header-title">
          <span class="crop-name">{{ record.cropName }}</span>
          <van-tag :type="record.status === 1 ? 'warning' : 'success'" size="medium">
            {{ record.status === 1 ? '进行中' : '已完成' }}
          </van-tag>
        </div>
        <div class="header-sub">
          <van-icon name="map-marked" size="14" color="#999" />
          <span class="plot-name">{{ plotName }}</span>
          <span class="season-year">{{ record.year }} 年 · {{ record.season }}</span>
        </div>
      </div>

      <!-- ========== 2. 基本信息 ========== -->
      <div class="card">
        <van-cell-group inset title="基本信息">
          <van-cell title="种植面积"><template #value><span class="cell-highlight">{{ record.area }} 亩</span></template></van-cell>
          <van-cell title="品种" :value="record.variety || '未填写'" />
          <van-cell title="总产量" :value="record.totalYield ? record.totalYield + ' 斤' : '暂未填写'" />
          <van-cell title="备注" :value="record.notes || '无'" />
        </van-cell-group>
      </div>

      <div class="action-area">
        <van-button round block type="primary" icon="edit" @click="goEdit" size="large">编辑种植档案</van-button>
      </div>

      <!-- ========== 3. 作业记录区域 ========== -->
      <div class="section-block">
        <div class="section-header">
          <van-divider :hairline="false">作业记录</van-divider>
          <van-button type="primary" size="small" icon="plus" round @click="goNewOperation">新增</van-button>
        </div>

        <div class="total-input-bar" v-if="operations.length > 0">
          <span class="total-label">总投入</span><span class="total-value">{{ stats.totalInput }} 元</span>
        </div>

        <van-loading v-if="opsLoading" class="loading-small" size="20" />
        <van-empty v-else-if="operations.length === 0" image="default" description="暂无作业记录" />

        <div v-else class="item-cards">
          <van-swipe-cell v-for="op in operations" :key="op.id">
            <van-card class="item-card" :title="getOperationTypeLabel(op.operationType)" @click="goOperationEdit(op.id!)">
              <template #desc>
                <span class="desc-date">{{ op.operationDate }}</span>
                <span v-if="op.description" class="desc-text"> · {{ op.description }}</span>
              </template>
              <template #tags>
                <van-tag v-if="op.productName" type="primary" size="medium" style="margin-right:4px">{{ op.productName }}</van-tag>
              </template>
              <template #price><span class="item-cost">{{ op.totalCost }} 元</span></template>
            </van-card>
            <template #right>
              <van-button square text="编辑" type="primary" class="swipe-btn swipe-edit" @click="goOperationEdit(op.id!)" />
              <van-button square text="删除" type="danger" class="swipe-btn swipe-delete" @click="handleDeleteOperation(op)" />
            </template>
          </van-swipe-cell>
        </div>
      </div>

      <!-- ========== 4. 产量区域 ========== -->
      <div class="section-block">
        <van-divider :hairline="false">产量</van-divider>
        <div class="yield-card card">
          <van-row>
            <van-col span="12">
              <div class="yield-item">
                <div class="yield-val">{{ record.totalYield ? record.totalYield + ' 斤' : '--' }}</div>
                <div class="yield-label">总产量</div>
              </div>
            </van-col>
            <van-col span="12">
              <div class="yield-item">
                <div class="yield-val">{{ stats.yieldPerMu != null ? stats.yieldPerMu + ' 斤/亩' : '--' }}</div>
                <div class="yield-label">亩产</div>
              </div>
            </van-col>
          </van-row>
          <van-button
            block
            size="small"
            :type="record.totalYield ? 'default' : 'primary'"
            style="margin-top:10px"
            @click="openYieldEditor"
          >
            {{ record.totalYield ? '修改产量' : '填写产量' }}
          </van-button>
        </div>
      </div>

      <!-- ========== 5. 销售记录区域 ========== -->
      <div class="section-block">
        <div class="section-header">
          <van-divider :hairline="false">销售记录</van-divider>
          <van-button type="primary" size="small" icon="plus" round @click="goNewSale">新增</van-button>
        </div>

        <div class="sales-summary" v-if="sales.length > 0">
          <span class="summary-item">总收入 <b>{{ stats.totalRevenue }}</b> 元</span>
          <span class="summary-item">已售 <b>{{ stats.soldQuantity }}</b> 斤</span>
          <span class="summary-item" v-if="stats.unsoldQuantity != null">未售 <b>{{ stats.unsoldQuantity }}</b> 斤</span>
        </div>

        <van-loading v-if="salesLoading" class="loading-small" size="20" />
        <van-empty v-else-if="sales.length === 0" image="default" description="暂无销售记录" />

        <div v-else class="item-cards">
          <van-swipe-cell v-for="s in sales" :key="s.id">
            <van-card class="item-card" :title="s.buyer || '未知收购方'" @click="goSaleEdit(s.id!)">
              <template #desc>
                <span class="desc-date">{{ s.saleDate }}</span>
                <span class="desc-text"> · {{ s.quantity }} 斤 × {{ s.unitPrice }} 元/斤</span>
              </template>
              <template #price><span class="item-cost income">{{ s.totalAmount }} 元</span></template>
            </van-card>
            <template #right>
              <van-button square text="编辑" type="primary" class="swipe-btn swipe-edit" @click="goSaleEdit(s.id!)" />
              <van-button square text="删除" type="danger" class="swipe-btn swipe-delete" @click="handleDeleteSale(s)" />
            </template>
          </van-swipe-cell>
        </div>
      </div>

      <!-- ========== 6. 统计汇总 ========== -->
      <div class="section-block">
        <van-divider :hairline="false">统计汇总</van-divider>
        <div class="stats-grid card">
          <div class="stat-item"><div class="sv">{{ stats.totalInput }}</div><div class="sl">总投入(元)</div></div>
          <div class="stat-item"><div class="sv">{{ stats.inputPerMu }}</div><div class="sl">亩投入(元)</div></div>
          <div class="stat-item"><div class="sv">{{ stats.totalYield ?? '--' }}</div><div class="sl">总产量(斤)</div></div>
          <div class="stat-item"><div class="sv">{{ stats.yieldPerMu ?? '--' }}</div><div class="sl">亩产(斤)</div></div>
          <div class="stat-item"><div class="sv">{{ stats.totalRevenue }}</div><div class="sl">总收入(元)</div></div>
          <div class="stat-item"><div class="sv">{{ stats.revenuePerMu }}</div><div class="sl">亩收入(元)</div></div>
          <div class="stat-item highlight">
            <div class="sv" :class="{ negative: stats.netProfit < 0 }">{{ stats.netProfit }}</div>
            <div class="sl">净利润(元)</div>
          </div>
          <div class="stat-item highlight">
            <div class="sv" :class="{ negative: stats.profitPerMu < 0 }">{{ stats.profitPerMu }}</div>
            <div class="sl">亩利润(元)</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 产量编辑弹出层 -->
    <van-popup v-model:show="showYieldPopup" position="center" :style="{ width: '85%', borderRadius: '12px', padding: '20px' }" teleport="body">
      <h3 style="text-align:center;margin-bottom:16px;">{{ record?.totalYield ? '修改产量' : '填写产量' }}</h3>
      <van-field
        v-model.number="yieldInput"
        name="yield"
        label="总产量"
        placeholder="请输入总产量"
        type="number"
        :rules="yieldRules"
      >
        <template #extra>斤</template>
      </van-field>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <van-button round block @click="showYieldPopup = false">取消</van-button>
        <van-button round block type="primary" :loading="yieldSaving" @click="saveYield">保存</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getPlotById } from '@/db/services/plotService'
import { getPlantingRecordById, updatePlantingRecord } from '@/db/services/plantingRecordService'
import {
  getOperationRecordsByPlantingId,
  deleteOperationRecord,
} from '@/db/services/operationRecordService'
import {
  getSalesRecordsByPlantingId,
  deleteSalesRecord,
} from '@/db/services/salesRecordService'
import { calculatePlantingStats } from '@/db/services/statsService'
import { getOperationTypeLabel } from '@/utils/operationTypes'
import type { PlantingRecord, OperationRecord, SalesRecord, PlantingStats } from '@/db/types'

const route = useRoute()
const router = useRouter()

const record = ref<PlantingRecord | null>(null)
const plotName = ref('')
const loading = ref(true)

// 作业记录
const operations = ref<OperationRecord[]>([])
const opsLoading = ref(true)

// 销售记录
const sales = ref<SalesRecord[]>([])
const salesLoading = ref(true)

// 统计
const stats = reactive<PlantingStats>({
  totalInput: 0, inputPerMu: 0,
  totalYield: null, yieldPerMu: null,
  soldQuantity: 0, unsoldQuantity: null,
  totalRevenue: 0, revenuePerMu: 0,
  netProfit: 0, profitPerMu: 0,
})

// 产量编辑
const showYieldPopup = ref(false)
const yieldInput = ref<number | undefined>(undefined)
const yieldSaving = ref(false)
const yieldRules = [{ validator: (v: unknown) => v != null && Number(v) >= 0, message: '请输入大于等于0的数字' }]

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    const data = await getPlantingRecordById(id)
    if (data) {
      record.value = data
      const plot = await getPlotById(data.plotId)
      plotName.value = plot?.name || '未知地块'
    }
  } catch (e) {
    console.error('[农记] 加载种植档案失败:', e)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
  await refreshData()
})

async function refreshData() {
  const id = Number(route.params.id)
  await Promise.all([
    refreshOperations(),
    refreshSales(),
  ])
  await refreshStats()
  // 刷新种植档案数据（产量可能变化）
  const updated = await getPlantingRecordById(id)
  if (updated) record.value = updated
}

async function refreshOperations() {
  opsLoading.value = true
  try {
    operations.value = await getOperationRecordsByPlantingId(Number(route.params.id))
  } catch (e) { console.error(e) }
  finally { opsLoading.value = false }
}

async function refreshSales() {
  salesLoading.value = true
  try {
    sales.value = await getSalesRecordsByPlantingId(Number(route.params.id))
  } catch (e) { console.error(e) }
  finally { salesLoading.value = false }
}

async function refreshStats() {
  try {
    const s = await calculatePlantingStats(Number(route.params.id))
    Object.assign(stats, s)
  } catch (e) { console.error('[农记] 刷新统计失败:', e) }
}

// ---- 产量编辑 ----
function openYieldEditor() {
  yieldInput.value = record.value?.totalYield ?? undefined
  showYieldPopup.value = true
}

async function saveYield() {
  if (yieldInput.value == null || yieldInput.value < 0) {
    showToast('请输入大于等于0的数字')
    return
  }
  yieldSaving.value = true
  try {
    await updatePlantingRecord(Number(route.params.id), { totalYield: yieldInput.value })
    showYieldPopup.value = false
    showToast({ message: '产量已保存', icon: 'success' })
    await refreshData()
  } catch (e) {
    console.error(e)
    showToast('保存失败')
  } finally {
    yieldSaving.value = false
  }
}

// ---- 导航 ----
function goEdit() { if (record.value?.id) router.push({ name: 'PlantingEdit', params: { id: String(record.value.id) } }) }
function goBack() { router.back() }
function goNewOperation() { router.push({ name: 'OperationNew', params: { plantingId: route.params.id as string } }) }
function goOperationEdit(id: number) { router.push({ name: 'OperationEdit', params: { id: String(id) } }) }
function goNewSale() { router.push({ name: 'SalesNew', params: { plantingId: route.params.id as string } }) }
function goSaleEdit(id: number) { router.push({ name: 'SalesEdit', params: { id: String(id) } }) }

// ---- 删除 ----
async function handleDeleteOperation(op: OperationRecord) {
  try { await showConfirmDialog({ title: '确认删除', message: `确定要删除 ${op.operationDate} 的作业记录吗？`, confirmButtonText: '确认删除', confirmButtonColor: '#ee0a24' }) }
  catch { return }
  try {
    await deleteOperationRecord(op.id!)
    showToast({ message: '删除成功', icon: 'success' })
    await refreshData()
  } catch (e: any) { showToast(e?.message || '删除失败') }
}

async function handleDeleteSale(s: SalesRecord) {
  try { await showConfirmDialog({ title: '确认删除', message: `确定要删除 ${s.saleDate} 的销售记录吗？`, confirmButtonText: '确认删除', confirmButtonColor: '#ee0a24' }) }
  catch { return }
  try {
    await deleteSalesRecord(s.id!)
    showToast({ message: '删除成功', icon: 'success' })
    await refreshData()
  } catch (e: any) { showToast(e?.message || '删除失败') }
}
</script>

<style scoped>
.planting-detail-page { min-height: 100vh; background: #f7f8fa; padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
.loading-center { display: flex; justify-content: center; padding-top: 100px; }
.loading-small { display: flex; justify-content: center; padding: 20px 0; }

.detail-header { padding: 20px 16px; background: #fff; }
.header-title { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.crop-name { font-size: 22px; font-weight: 700; color: #333; }
.header-sub { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #999; }
.plot-name { color: #666; }
.season-year { margin-left: 8px; }

.card { margin-top: 12px; }
.cell-highlight { color: #07c160; font-weight: 600; font-size: 16px; }
.action-area { padding: 12px 16px 0; }

/* 分区 */
.section-block { margin-top: 16px; padding: 0 4px; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 0 12px; margin-bottom: 8px; }
.section-header :deep(.van-divider) { flex: 1; margin: 0; }
.section-header .van-button { flex-shrink: 0; margin-left: 12px; }

/* 总投入条 */
.total-input-bar { display: flex; justify-content: space-between; align-items: center; margin: 0 16px 12px; padding: 10px 16px; background: linear-gradient(135deg,#e8f8ee,#f0faf4); border-radius: 8px; border: 1px solid #d4f0dc; }
.total-label { font-size: 14px; color: #666; }
.total-value { font-size: 18px; font-weight: 700; color: #07c160; }

/* 销售摘要 */
.sales-summary { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 16px 10px; padding: 10px 14px; background: #f7f8fa; border-radius: 8px; }
.summary-item { font-size: 13px; color: #666; }
.summary-item b { color: #333; }

/* 卡片列表 */
.item-cards {}
.item-card { background: #fff; margin-bottom: 8px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.desc-date { color: #999; }
.desc-text { color: #666; font-size: 12px; }
.item-cost { font-size: 15px; font-weight: 600; color: #ee0a24; }
.item-cost.income { color: #1989fa; }
.swipe-btn { height: 100%; width: 64px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }
.swipe-edit { background: #1989fa; }
.swipe-delete { background: #ee0a24; }

/* 产量卡片 */
.yield-card { padding: 12px 16px; }
.yield-item { text-align: center; padding: 8px 0; }
.yield-val { font-size: 20px; font-weight: 700; color: #333; }
.yield-label { font-size: 12px; color: #999; margin-top: 4px; }

/* 统计网格 */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 0; background: #ebedf0; border-radius: 8px; overflow: hidden; }
.stat-item { background: #fff; padding: 12px 10px; text-align: center; }
.stat-item.highlight { background: #fafbfc; }
.sv { font-size: 17px; font-weight: 700; color: #333; }
.sv.negative { color: #ee0a24; }
.sl { font-size: 11px; color: #999; margin-top: 3px; }
</style>
