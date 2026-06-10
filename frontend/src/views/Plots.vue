<template>
  <div class="page-container plots-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">地块管理</h2>
        <span class="plot-count" v-if="plots.length">共 {{ plots.length }} 块地</span>
      </div>
      <van-button
        type="primary"
        icon="plus"
        size="small"
        round
        @click="goNew"
      >
        新增
      </van-button>
    </div>

    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading-center" size="24" text="加载中..." />

    <!-- 空状态 -->
    <van-empty
      v-else-if="plots.length === 0"
      image="search"
      description="暂无地块"
    >
      <p class="empty-hint">点击右上角"新增"按钮<br />添加您的第一块地</p>
    </van-empty>

    <!-- 地块列表 -->
    <div v-else class="plot-cards">
      <van-swipe-cell
        v-for="plot in plots"
        :key="plot.id"
      >
        <div class="plot-card" @click="goDetail(plot.id!)">
          <!-- 第一行：名称 + 状态 -->
          <div class="card-row card-row-top">
            <span class="plot-name">{{ plot.name }}</span>
            <span :class="['status-tag', plot.status === 1 ? 'active' : 'inactive']">
              {{ plot.status === 1 ? '使用中' : '已废弃' }}
            </span>
          </div>

          <!-- 第二行：面积（绿色标签） -->
          <div class="card-row">
            <span class="area-badge">{{ plot.area }} 亩</span>
          </div>

          <!-- 第三行：位置 -->
          <div class="card-row card-row-info">
            <van-icon name="location-o" size="14" color="#999" />
            <span class="info-text">{{ plot.location || '未设置位置' }}</span>
          </div>

          <!-- 第四行：土壤类型（如有） -->
          <div class="card-row card-row-info" v-if="plot.soilType">
            <van-icon name="bag-o" size="14" color="#999" />
            <span class="info-text">{{ plot.soilType }}</span>
          </div>
        </div>

        <!-- 滑动操作按钮 -->
        <template #right>
          <van-button
            square
            text="编辑"
            type="primary"
            class="swipe-btn swipe-edit"
            @click="goEdit(plot.id!)"
          />
          <van-button
            square
            text="删除"
            type="danger"
            class="swipe-btn swipe-delete"
            @click="handleDelete(plot)"
          />
        </template>
      </van-swipe-cell>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getAllPlots, deletePlot } from '@/db/services/plotService'
import type { Plot } from '@/db/types'

const router = useRouter()
const plots = ref<Plot[]>([])
const loading = ref(true)

/** 加载地块列表 */
async function loadPlots() {
  loading.value = true
  try {
    plots.value = await getAllPlots()
  } catch (error) {
    console.error('[农记] 加载地块列表失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

/** 添加地块 */
function goNew() {
  router.push({ name: 'PlotNew' })
}

/** 查看地块详情 */
function goDetail(id: number) {
  router.push({ name: 'PlotDetail', params: { id: String(id) } })
}

/** 编辑地块 */
function goEdit(id: number) {
  router.push({ name: 'PlotEdit', params: { id: String(id) } })
}

/** 删除地块 */
async function handleDelete(plot: Plot) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除地块"${plot.name}"吗？\n删除后数据不可恢复。`,
      confirmButtonText: '确认删除',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    // 用户取消
    return
  }

  try {
    await deletePlot(plot.id!)
    plots.value = plots.value.filter((p) => p.id !== plot.id)
    showToast({ message: '删除成功', icon: 'success' })
  } catch (error) {
    console.error('[农记] 删除地块失败:', error)
    showToast('删除失败，请重试')
  }
}

onMounted(() => {
  loadPlots()
})
</script>

<style scoped>
.plots-list {
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 0 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.plot-count {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

.loading-center {
  padding-top: 60px;
  display: flex;
  justify-content: center;
}

.empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #bbb;
  text-align: center;
  line-height: 1.8;
}

/* ========== 地块卡片 ========== */
.plot-cards {
  /* 卡片列表容器 */
}

.plot-card {
  background: #fff;
  margin-bottom: 10px;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.plot-card:active {
  background: #f9f9f9;
}

/* 卡片行 */
.card-row {
  display: flex;
  align-items: center;
}

.card-row-top {
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-row-info {
  gap: 6px;
  margin-top: 6px;
}

/* 地块名称 */
.plot-name {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

/* 状态标签 */
.status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.status-tag.active {
  color: #07c160;
  background: #e8f8ee;
}

.status-tag.inactive {
  color: #999;
  background: #f5f5f5;
}

/* 面积标签（绿色高亮） */
.area-badge {
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  color: #07c160;
  background: #f0faf4;
  padding: 3px 10px;
  border-radius: 6px;
  margin-bottom: 2px;
}

/* 信息行 */
.info-text {
  font-size: 13px;
  color: #888;
}

/* ========== 滑动操作按钮 ========== */
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
