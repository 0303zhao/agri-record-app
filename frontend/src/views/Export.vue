<template>
  <div class="export-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">数据导出与备份</h2>
      <p class="page-subtitle">保护您的数据安全，支持导出备份与恢复</p>
    </div>

    <!-- ========== 模块一：本地数据概况 ========== -->
    <div class="section">
      <van-cell-group inset title="本地数据概况">
        <van-cell title="地块数量" :value="String(stats.plotCount)" icon="map-marked" />
        <van-cell title="种植档案数量" :value="String(stats.plantingCount)" icon="notes-o" />
        <van-cell title="作业记录数量" :value="String(stats.operationCount)" icon="orders-o" />
        <van-cell title="销售记录数量" :value="String(stats.salesCount)" icon="balance-o" />
        <van-cell title="数据库名称" value="AgriRecordDB" />
        <van-cell title="存储方式" value="手机本地 IndexedDB" />
      </van-cell-group>
    </div>

    <!-- ========== 模块二：JSON 备份 ========== -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">JSON 完整备份</h3>
        <p class="section-desc">适合换手机、恢复数据，建议定期保存到电脑或云盘</p>
      </div>
      <div class="btn-group">
        <van-button
          round
          block
          type="primary"
          icon="down"
          :loading="exporting"
          loading-text="导出中..."
          @click="handleExportJSON"
          size="large"
        >
          导出完整备份 JSON
        </van-button>
        <van-button
          round
          block
          type="warning"
          icon="up"
          @click="triggerFileInput"
          size="large"
        >
          从 JSON 备份恢复
        </van-button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileSelected"
      />
    </div>

    <!-- ========== 模块三：Excel 导出 ========== -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Excel 表格导出</h3>
        <p class="section-desc">适合查看、打印、长期归档，包含 5 个工作表</p>
      </div>
      <div class="btn-group">
        <van-button
          round
          block
          icon="description"
          :loading="exportingExcel"
          loading-text="导出中..."
          @click="handleExportExcel"
          size="large"
        >
          导出 Excel 表格
        </van-button>
      </div>
    </div>

    <!-- ========== 模块四：重要提醒 ========== -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">重要提醒</h3>
      </div>
      <div class="notice-card">
        <van-icon name="warning-o" size="18" color="#ee0a24" />
        <div class="notice-text">
          <p>本 App 数据保存在当前手机本地。请定期导出 JSON 备份，避免因清理浏览器数据、卸载 App、换手机导致数据丢失。</p>
          <p class="notice-tip">建议：每次录入新数据后导出一份 JSON 备份，并保存到电脑或云端。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import {
  getDataStats,
  exportFullBackup,
  exportExcel,
  validateBackupJSON,
  restoreFromBackup,
} from '@/db/services/exportService'

// ---- 数据概况 ----
const stats = reactive({
  plotCount: 0,
  plantingCount: 0,
  operationCount: 0,
  salesCount: 0,
})

// ---- 加载状态 ----
const exporting = ref(false)
const exportingExcel = ref(false)
const fileInputRef = ref<HTMLInputElement>()

onMounted(async () => {
  await refreshStats()
})

async function refreshStats() {
  try {
    const s = await getDataStats()
    Object.assign(stats, s)
  } catch (e) {
    console.error('[农记] 加载数据概况失败:', e)
  }
}

// ---- JSON 导出 ----
async function handleExportJSON() {
  exporting.value = true
  try {
    await exportFullBackup()
    showToast({ message: '备份导出成功！文件已保存到下载目录', icon: 'success', duration: 2500 })
  } catch (e) {
    console.error('[农记] 导出 JSON 失败:', e)
    showToast('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

// ---- JSON 恢复 ----
function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 重置 input，以便同一文件可以再次选择
  input.value = ''

  try {
    // 读取文件
    const text = await readFileAsText(file)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      showToast('备份文件格式不正确，无法解析 JSON')
      return
    }

    // 校验格式
    if (!validateBackupJSON(json)) {
      showToast('备份文件格式不正确，请选择有效的农记备份文件')
      return
    }

    // 二次确认
    try {
      await showConfirmDialog({
        title: '确认恢复备份',
        message:
          '恢复备份会覆盖当前手机本地数据，请确认已提前导出当前数据。\n\n' +
          `备份信息：\n` +
          `- 地块：${json.data.plots.length} 条\n` +
          `- 种植档案：${json.data.plantingRecords.length} 条\n` +
          `- 作业记录：${json.data.operationRecords.length} 条\n` +
          `- 销售记录：${json.data.salesRecords.length} 条\n\n` +
          '是否继续？',
        confirmButtonText: '确认恢复',
        confirmButtonColor: '#ee0a24',
      })
    } catch {
      // 用户取消
      return
    }

    // 执行恢复
    await restoreFromBackup(json)
    await refreshStats()
    showToast({ message: '数据恢复成功！', icon: 'success', duration: 2500 })
  } catch (e) {
    console.error('[农记] 恢复备份失败:', e)
    showToast('恢复失败，请重试')
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// ---- Excel 导出 ----
async function handleExportExcel() {
  exportingExcel.value = true
  try {
    await exportExcel()
    showToast({ message: 'Excel 导出成功！文件已保存到下载目录', icon: 'success', duration: 2500 })
  } catch (e) {
    console.error('[农记] 导出 Excel 失败:', e)
    showToast('导出失败，请重试')
  } finally {
    exportingExcel.value = false
  }
}
</script>

<style scoped>
.export-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 32px;
}

.page-header {
  padding: 20px 0 12px;
  text-align: center;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

/* ---- 分区 ---- */
.section {
  margin-top: 16px;
}

.section-desc {
  font-size: 12px;
  color: #999;
  padding: 0 16px 8px;
  line-height: 1.5;
}

/* ---- 按钮组 ---- */
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 16px;
}

/* ---- 重要提醒 ---- */
.notice-card {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
}

.notice-text {
  flex: 1;
}

.notice-text p {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin: 0;
}

.notice-tip {
  margin-top: 8px !important;
  color: #999 !important;
  font-size: 12px !important;
}
</style>
