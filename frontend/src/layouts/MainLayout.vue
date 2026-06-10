<template>
  <!-- 主布局：底部 TabBar + 页面内容区 -->
  <div class="main-layout">
    <!-- 页面内容区 -->
    <div class="main-content">
      <router-view />
    </div>

    <!-- 底部导航栏 -->
    <van-tabbar
      v-model="activeTab"
      :fixed="true"
      :border="true"
      :safe-area-inset-bottom="true"
      active-color="#07c160"
      inactive-color="#999"
      @change="onTabChange"
    >
      <van-tabbar-item icon="home-o" to="/dashboard">首页</van-tabbar-item>
      <van-tabbar-item icon="map-marked" to="/plots">地块</van-tabbar-item>
      <van-tabbar-item icon="search" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="down" to="/export">导出</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref(0)

// 根据当前路由更新 TabBar 高亮
const tabMap: Record<string, number> = {
  '/dashboard': 0,
  '/plots': 1,
  '/history': 2,
  '/export': 3,
}

watch(
  () => route.path,
  (path) => {
    activeTab.value = tabMap[path] ?? 0
  },
  { immediate: true }
)

function onTabChange(index: number) {
  activeTab.value = index
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  padding-bottom: 50px; /* 为固定 TabBar 留空间 */
}

.main-content {
  /* 页面内容 */
}
</style>
