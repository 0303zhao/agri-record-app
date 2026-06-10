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
        <!-- 向左滑动露出删除按钮 -->
        <van-card
          class="plot-card"
          :title="plot.name"
          :thumb="getThumbBySoil(plot.soilType)"
          @click="goDetail(plot.id!)"
        >
          <template #desc>
            <div class="card-desc">
              <span class="desc-item">
                <van-icon name="location-o" size="12" />
                {{ plot.location || '未设置位置' }}
              </span>
            </div>
          </template>

          <template #tags>
            <van-tag
              v-for="tag in getTags(plot)"
              :key="tag.text"
              :type="tag.type"
              size="medium"
              style="margin-right: 6px"
            >
              {{ tag.text }}
            </van-tag>
          </template>

          <template #bottom>
            <div class="card-bottom">
              <span
                :class="['status-dot', plot.status === 1 ? 'active' : 'inactive']"
              ></span>
              <span class="status-text">{{ plot.status === 1 ? '使用中' : '已废弃' }}</span>
            </div>
          </template>
        </van-card>

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

/** 根据土壤类型返回缩略图 */
function getThumbBySoil(soilType?: string): string {
  const map: Record<string, string> = {
    '沙土': 'https://img.yzcdn.cn/vant/ipad.jpeg',
    '壤土': 'https://img.yzcdn.cn/vant/cat.jpeg',
    '黏土': 'https://img.yzcdn.cn/vant/cat.jpeg',
    '盐碱地': 'https://img.yzcdn.cn/vant/ipad.jpeg',
    '其他': 'https://img.yzcdn.cn/vant/ipad.jpeg',
  }
  return map[soilType || ''] || 'https://img.yzcdn.cn/vant/ipad.jpeg'
}

/** 生成标签列表 */
function getTags(plot: Plot) {
  const tags: { text: string; type: 'primary' | 'success' | 'warning' | 'danger' }[] = []

  tags.push({ text: `${plot.area} 亩`, type: 'primary' })

  if (plot.soilType) {
    tags.push({ text: plot.soilType, type: 'success' })
  }

  return tags
}

onMounted(() => {
  loadPlots()
})
</script>

<style scoped>
.plots-list {
  padding-bottom: 24px;
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

.plot-cards {
  /* 卡片列表容器 */
}

.plot-card {
  background: #fff;
  margin-bottom: 8px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.card-desc {
  margin-top: 2px;
}

.desc-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot.active {
  background: #07c160;
}

.status-dot.inactive {
  background: #c8c9cc;
}

.status-text {
  font-size: 12px;
  color: #999;
}

/* 滑动操作按钮 */
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
