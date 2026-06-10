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
        accept=".json,application/json"
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
        <h3 class="section-title">⚠️ 数据安全提醒</h3>
      </div>
      <div class="notice-card">
        <div class="notice-icon">
          <van-icon name="shield-o" size="24" color="#ff976a" />
        </div>
        <div class="notice-text">
          <p class="notice-main">数据仅保存在<strong>当前手机本地</strong>，不会自动上传到云端。</p>
          <p class="notice-detail">换手机、清理浏览器数据、卸载应用都会导致数据永久丢失。</p>
          <p class="notice-action">✅ 请定期点击上方「导出完整备份 JSON」，将备份文件保存到电脑或云盘（如微信文件传输、百度网盘、iCloud）。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { showToast, showConfirmDialog, showLoadingToast } from 'vant'
import type { RestoreResult } from '@/db/services/exportService'
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

/** 点击"从 JSON 备份恢复"按钮 → 触发隐藏的 file input */
function triggerFileInput() {
  fileInputRef.value?.click()
}

/** 文件选择后的处理流程 */
async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 重置 input，以便选择同一个文件时也能再次触发 change 事件
  input.value = ''

  console.log('[农记] 选择文件:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`)

  // 显示 Loading Toast（持续到读取完成或出错）
  let loadingToast: ReturnType<typeof showLoadingToast> | null = null

  try {
    // ========== 步骤 1：读取文件 ==========
    loadingToast = showLoadingToast({ message: '正在读取备份文件...', forbidClick: true, duration: 0 })

    const text = await readFileAsText(file)
    console.log('[农记] 文件读取成功，大小:', text.length, '字符')

    // ========== 步骤 2：解析 JSON ==========
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      loadingToast?.close()
      showToast('备份文件格式不正确，无法解析 JSON')
      return
    }
    console.log('[农记] JSON 解析成功')

    // ========== 步骤 3：校验备份文件结构 ==========
    if (!validateBackupJSON(json)) {
      loadingToast?.close()
      console.error('[农记] 备份文件校验失败：结构不符合要求')
      showToast('备份文件格式不正确，请选择有效的农记备份文件')
      return
    }

    // 类型守卫后安全访问 data
    const backupData = json.data
    const plotCount = backupData.plots.length
    const plantingCount = backupData.plantingRecords.length
    const operationCount = backupData.operationRecords.length
    const salesCount = backupData.salesRecords.length

    console.log(`[农记] 校验通过：${plotCount} 地块, ${plantingCount} 种植档案, ${operationCount} 作业记录, ${salesCount} 销售记录`)

    // ========== 步骤 4：检查地块数量 ==========
    if (plotCount === 0) {
      loadingToast?.close()
      showToast('备份文件中没有地块数据，请确认是否选择了正确的备份文件')
      return
    }

    // 关闭读取 loading
    loadingToast?.close()
    loadingToast = null

    // ========== 步骤 5：二次确认 ==========
    try {
      await showConfirmDialog({
        title: '确认恢复备份',
        message:
          '恢复备份会覆盖当前手机本地数据，请确认已提前导出当前数据。\n\n' +
          `备份信息：\n` +
          `- 地块：${plotCount} 条\n` +
          `- 种植档案：${plantingCount} 条\n` +
          `- 作业记录：${operationCount} 条\n` +
          `- 销售记录：${salesCount} 条\n\n` +
          '是否继续？',
        confirmButtonText: '确认恢复',
        confirmButtonColor: '#ee0a24',
      })
    } catch {
      // 用户取消
      console.log('[农记] 用户取消恢复')
      return
    }

    console.log('[农记] 用户确认恢复，开始执行恢复...')

    // ========== 步骤 6：执行恢复 ==========
    loadingToast = showLoadingToast({ message: '正在恢复数据...', forbidClick: true, duration: 0 })

    const result: RestoreResult = await restoreFromBackup(json)
    console.log('[农记] 恢复结果:', result)

    loadingToast?.close()
    loadingToast = null

    // ========== 步骤 7：刷新页面数据并提示成功 ==========
    await refreshStats()
    showToast({
      message: `恢复成功：已恢复 ${result.plots} 个地块、${result.plantingRecords} 个种植档案、${result.operationRecords} 条作业记录、${result.salesRecords} 条销售记录`,
      icon: 'success',
      duration: 3000,
    })
  } catch (e) {
    console.error('[农记] 恢复备份失败:', e)
    showToast('恢复失败，请检查备份文件是否正确')
  } finally {
    // 确保 loading toast 在任何情况下都被关闭
    loadingToast?.close()
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
  padding-bottom: calc(32px + env(safe-area-inset-bottom, 0px));
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

/* ---- Section Header ---- */
.section-header {
  padding: 0 16px 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding: 0;
  margin: 0;
}

.section-desc {
  font-size: 12px;
  color: #999;
  padding: 0 16px 8px;
  line-height: 1.5;
}

/* ---- 重要提醒 ---- */
.notice-card {
  display: flex;
  gap: 12px;
  margin: 0 12px;
  padding: 16px;
  background: #fffbf0;
  border: 1px solid #ffe8b0;
  border-radius: 10px;
}

.notice-icon {
  flex-shrink: 0;
  padding-top: 2px;
}

.notice-text {
  flex: 1;
}

.notice-text p {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.notice-main {
  font-size: 14px !important;
  color: #333 !important;
  margin-bottom: 4px !important;
}

.notice-main strong {
  color: #ee0a24;
}

.notice-detail {
  color: #999 !important;
  font-size: 12px !important;
  margin-bottom: 8px !important;
}

.notice-action {
  color: #07c160 !important;
  font-size: 12px !important;
}
</style>
