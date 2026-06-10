<template>
  <div class="plot-detail-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="地块详情"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="edit" size="20" @click="goEdit" />
      </template>
    </van-nav-bar>

    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading-center" size="32" />

    <!-- 地块不存在 -->
    <van-empty v-else-if="!plot" description="地块不存在" />

    <!-- 地块详情 -->
    <template v-else>
      <!-- 名称和状态 -->
      <div class="detail-header">
        <div class="header-name">
          <van-icon name="map-marked" size="24" color="#07c160" style="margin-right: 8px" />
          <span class="plot-name">{{ plot.name }}</span>
        </div>
        <van-tag :type="plot.status === 1 ? 'success' : 'default'" size="medium">
          {{ plot.status === 1 ? '使用中' : '已废弃' }}
        </van-tag>
      </div>

      <!-- 基本信息卡片 -->
      <div class="card detail-card">
        <van-cell-group inset>
          <van-cell title="面积">
            <template #value>
              <span class="cell-highlight">{{ plot.area }} 亩</span>
            </template>
          </van-cell>
          <van-cell title="位置" :value="plot.location || '未填写'" />
          <van-cell title="土壤类型" :value="plot.soilType || '未填写'" />
          <van-cell title="备注" :value="plot.notes || '无'" />
        </van-cell-group>
      </div>

      <!-- 时间信息 -->
      <div class="card">
        <van-cell-group inset title="记录信息">
          <van-cell title="创建时间" :value="formatDate(plot.createdAt)" />
          <van-cell title="更新时间" :value="formatDate(plot.updatedAt)" />
        </van-cell-group>
      </div>

      <!-- 编辑按钮 -->
      <div class="action-area">
        <van-button
          round
          block
          type="primary"
          icon="edit"
          @click="goEdit"
          size="large"
        >
          编辑地块
        </van-button>
      </div>

      <!-- ============================================ -->
      <!-- 种植档案区域 -->
      <!-- ============================================ -->
      <div class="plantings-section">
        <div class="section-header">
          <van-divider :hairline="false">种植档案</van-divider>
          <van-button
            type="primary"
            size="small"
            icon="plus"
            round
            @click="goNewPlanting"
          >
            新增
          </van-button>
        </div>

        <!-- 种植档案加载中 -->
        <van-loading v-if="plantingsLoading" class="loading-small" size="20" />

        <!-- 空状态 -->
        <van-empty
          v-else-if="plantings.length === 0"
          image="default"
          description="暂无种植档案"
        >
          <p class="empty-hint">
            点击上方"新增"按钮<br />为该地块添加第一份种植档案
          </p>
        </van-empty>

        <!-- 种植档案列表 -->
        <div v-else class="planting-cards">
          <van-swipe-cell
            v-for="pr in plantings"
            :key="pr.id"
          >
            <div class="planting-card" @click="goPlantingDetail(pr.id!)">
              <!-- 第一行：作物名称 + 状态 -->
              <div class="pr-card-row pr-card-top">
                <span class="pr-crop-name">{{ pr.cropName }}</span>
                <span :class="['pr-status-tag', pr.status === 1 ? 'progress' : 'done']">
                  {{ pr.status === 1 ? '进行中' : '已完成' }}
                </span>
              </div>

              <!-- 第二行：年份 · 季节 -->
              <div class="pr-card-row">
                <span class="pr-year-season">{{ pr.year }} 年 · {{ pr.season }}</span>
              </div>

              <!-- 第三行：标签（面积 + 品种） -->
              <div class="pr-card-row pr-card-tags">
                <span class="pr-area-badge">{{ pr.area }} 亩</span>
                <span class="pr-variety-text" v-if="pr.variety">{{ pr.variety }}</span>
                <span class="pr-variety-text pr-no-variety" v-else>未填写品种</span>
              </div>
            </div>

            <!-- 滑动操作 -->
            <template #right>
              <van-button
                square
                text="编辑"
                type="primary"
                class="swipe-btn swipe-edit"
                @click="goPlantingEdit(pr.id!)"
              />
              <van-button
                square
                text="删除"
                type="danger"
                class="swipe-btn swipe-delete"
                @click="handleDeletePlanting(pr)"
              />
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getPlotById } from '@/db/services/plotService'
import {
  getPlantingRecordsByPlotId,
  deletePlantingRecord,
} from '@/db/services/plantingRecordService'
import type { Plot, PlantingRecord } from '@/db/types'

const route = useRoute()
const router = useRouter()

const plot = ref<Plot | null>(null)
const loading = ref(true)

// ---- 种植档案 ----
const plantings = ref<PlantingRecord[]>([])
const plantingsLoading = ref(true)

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    plot.value = (await getPlotById(id)) ?? null
  } catch (error) {
    console.error('[农记] 加载地块详情失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }

  // 加载种植档案列表
  await loadPlantings()
})

/** 加载种植档案列表 */
async function loadPlantings() {
  plantingsLoading.value = true
  try {
    const id = Number(route.params.id)
    plantings.value = await getPlantingRecordsByPlotId(id)
  } catch (error) {
    console.error('[农记] 加载种植档案失败:', error)
  } finally {
    plantingsLoading.value = false
  }
}

// ---- 地块操作 ----

function goEdit() {
  if (plot.value?.id) {
    router.push({ name: 'PlotEdit', params: { id: String(plot.value.id) } })
  }
}

function goBack() {
  router.back()
}

// ---- 种植档案操作 ----

function goNewPlanting() {
  if (plot.value?.id) {
    router.push({ name: 'PlantingNew', params: { plotId: String(plot.value.id) } })
  }
}

function goPlantingDetail(id: number) {
  router.push({ name: 'PlantingDetail', params: { id: String(id) } })
}

function goPlantingEdit(id: number) {
  router.push({ name: 'PlantingEdit', params: { id: String(id) } })
}

async function handleDeletePlanting(pr: PlantingRecord) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除 ${pr.year}年${pr.season} 的"${pr.cropName}"种植档案吗？\n删除后数据不可恢复。`,
      confirmButtonText: '确认删除',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return
  }

  try {
    await deletePlantingRecord(pr.id!)
    plantings.value = plantings.value.filter((p) => p.id !== pr.id)
    showToast({ message: '删除成功', icon: 'success' })
  } catch (error) {
    console.error('[农记] 删除种植档案失败:', error)
    showToast('删除失败，请重试')
  }
}

// ---- 工具 ----

function formatDate(date: Date): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.plot-detail-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

.loading-center {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.loading-small {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background: #fff;
}

.header-name {
  display: flex;
  align-items: center;
}

.plot-name {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.detail-card {
  margin-top: 12px;
}

.cell-highlight {
  color: #07c160;
  font-weight: 600;
  font-size: 16px;
}

.action-area {
  padding: 20px 16px 0;
}

/* ---- 种植档案区域 ---- */
.plantings-section {
  margin-top: 20px;
  padding: 0 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  margin-bottom: 8px;
}

.section-header :deep(.van-divider) {
  flex: 1;
  margin: 0;
}

.section-header .van-button {
  flex-shrink: 0;
  margin-left: 12px;
}

.empty-hint {
  font-size: 13px;
  color: #bbb;
  text-align: center;
  line-height: 1.8;
}

.planting-cards {
  /* 卡片列表 */
}

.planting-card {
  background: #fff;
  margin-bottom: 10px;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.planting-card:active {
  background: #f9f9f9;
}

/* 档案卡片行 */
.pr-card-row {
  display: flex;
  align-items: center;
}

.pr-card-top {
  justify-content: space-between;
  margin-bottom: 6px;
}

.pr-card-tags {
  gap: 8px;
  margin-top: 8px;
}

/* 作物名称 */
.pr-crop-name {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

/* 年份季节 */
.pr-year-season {
  font-size: 13px;
  color: #999;
}

/* 状态标签 */
.pr-status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.pr-status-tag.progress {
  color: #ff976a;
  background: #fff7f0;
}

.pr-status-tag.done {
  color: #07c160;
  background: #e8f8ee;
}

/* 面积标签（绿色高亮） */
.pr-area-badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #1989fa;
  background: #f0f7ff;
  padding: 2px 10px;
  border-radius: 6px;
}

/* 品种文字 */
.pr-variety-text {
  font-size: 12px;
  color: #888;
}

.pr-no-variety {
  color: #ccc;
}

/* 滑动操作 */
.swipe-btn {
  height: 100%;
  width: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.swipe-edit {
  background: #1989fa;
}

.swipe-delete {
  background: #ee0a24;
}
</style>
