<template>
  <!-- 移动端 H5 根组件，使用 Vant 的 ConfigProvider 做全局主题 -->
  <van-config-provider theme="light">
    <router-view />
  </van-config-provider>
</template>

<script setup lang="ts">
// App 根组件，仅作为路由容器
</script>
