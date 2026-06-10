<template>
  <div class="page-container dashboard">
    <!-- 顶部标题区 -->
    <div class="dashboard-header">
      <div class="app-icon">
        <van-icon name="flower-o" size="48" color="#07c160" />
      </div>
      <h1 class="app-title">农记</h1>
      <p class="app-desc">长期记录地块种植数据，方便多年对比分析</p>
    </div>

    <!-- 运行模式卡片 -->
    <div class="card mode-card">
      <div class="mode-row">
        <div class="mode-icon">
          <van-icon name="phone-o" size="20" />
        </div>
        <div class="mode-info">
          <div class="mode-label">当前模式</div>
          <div class="mode-value">手机本地单机版</div>
        </div>
      </div>
      <van-divider :style="{ margin: '10px 0' }" />
      <div class="mode-row">
        <div class="mode-icon">
          <van-icon name="notes-o" size="20" />
        </div>
        <div class="mode-info">
          <div class="mode-label">数据存储</div>
          <div class="mode-value">本地 IndexedDB</div>
        </div>
      </div>
      <van-divider :style="{ margin: '10px 0' }" />
      <div class="mode-row">
        <div class="mode-icon">
          <van-icon name="completed" size="20" />
        </div>
        <div class="mode-info">
          <div class="mode-label">数据安全</div>
          <div class="mode-value">数据仅保存在本机，可通过导出功能备份</div>
        </div>
      </div>
    </div>

    <!-- 快速统计 -->
    <div class="quick-stats">
      <van-grid :column-num="2" :border="false" gutter="12">
        <van-grid-item>
          <div class="stat-item card">
            <div class="stat-value">--</div>
            <div class="stat-label">使用中地块</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-item card">
            <div class="stat-value">--</div>
            <div class="stat-label">本年度种植记录</div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 功能导航 -->
    <div class="quick-nav">
      <van-divider>功能导航</van-divider>
      <van-cell-group inset>
        <van-cell title="地块管理" icon="map-marked" is-link to="/plots" />
        <van-cell title="历史查询" icon="search" is-link to="/history" />
        <van-cell title="数据导出" icon="down" is-link to="/export" />
      </van-cell-group>
    </div>

    <!-- PWA 安装提示 -->
    <div class="pwa-tip card">
      <div class="tip-row">
        <van-icon name="add-o" size="18" color="#2f8f46" />
        <span>可将 App 安装到手机主屏幕，支持离线使用</span>
      </div>
      <div class="tip-row">
        <van-icon name="warning-o" size="18" color="#ff976a" />
        <span>建议定期到「数据导出」页面备份数据</span>
      </div>
    </div>

    <!-- 底部说明 -->
    <div class="footer-note">
      <p>所有数据保存在您的手机本地</p>
      <p>定期导出数据以防丢失</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 首页 - 仪表盘
// 数据保存完全在本地 IndexedDB 中，不依赖后端服务
</script>

<style scoped>
.dashboard {
  padding-bottom: 24px;
}

.dashboard-header {
  text-align: center;
  padding: 36px 0 20px;
}

.app-icon {
  margin-bottom: 12px;
}

.app-title {
  font-size: 32px;
  font-weight: 700;
  color: #07c160;
  margin-bottom: 8px;
}

.app-desc {
  font-size: 14px;
  color: #999;
  line-height: 1.5;
}

/* 模式卡片 */
.mode-card {
  margin-bottom: 20px;
  padding: 14px 16px;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.mode-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f0faf4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #07c160;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;
}

.mode-label {
  font-size: 12px;
  color: #999;
}

.mode-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 统计 */
.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #07c160;
}

.stat-label {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

/* 功能导航 */
.quick-nav {
  margin-bottom: 20px;
}

/* PWA 安装提示 */
.pwa-tip {
  margin: 0 16px 12px;
  padding: 12px 16px;
  background: #fafbfc;
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #666;
}

/* 底部说明 */
.footer-note {
  text-align: center;
  padding: 12px 0;
}

.footer-note p {
  font-size: 12px;
  color: #bbb;
  line-height: 1.8;
}
</style>
