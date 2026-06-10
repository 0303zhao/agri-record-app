import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由配置
 * ┌─ MainLayout（含底部 TabBar）── /dashboard（首页）
 * │                               ├── /plots（地块列表）
 * │                               ├── /history（历史查询）
 * │                               └── /export（数据导出）
 * │
 * └─ 独立页面（无 TabBar）──────── /plots/new（新增地块）
 *                                  ├── /plots/:id（地块详情）
 *                                  ├── /plots/:id/edit（编辑地块）
 *                                  ├── /plots/:plotId/plantings/new（新增种植档案）
 *                                  ├── /plantings/:id（种植档案详情）
 *                                  ├── /plantings/:id/edit（编辑种植档案）
 *                                  ├── /plantings/:plantingId/operations/new（新增作业记录）
 *                                  ├── /operations/:id/edit（编辑作业记录）
 *                                  ├── /plantings/:plantingId/sales/new（新增销售记录）
 *                                  └── /sales/:id/edit（编辑销售记录）
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', tabIndex: 0 },
      },
      {
        path: 'plots',
        name: 'PlotList',
        component: () => import('@/views/Plots.vue'),
        meta: { title: '地块', tabIndex: 1 },
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('@/views/History.vue'),
        meta: { title: '历史', tabIndex: 2 },
      },
      {
        path: 'export',
        name: 'Export',
        component: () => import('@/views/Export.vue'),
        meta: { title: '导出', tabIndex: 3 },
      },
    ],
  },
  // ---- 地块相关独立页面（无底部 TabBar） ----
  {
    path: '/plots/new',
    name: 'PlotNew',
    component: () => import('@/views/plots/PlotForm.vue'),
    meta: { title: '新增地块' },
  },
  {
    path: '/plots/:id',
    name: 'PlotDetail',
    component: () => import('@/views/plots/PlotDetail.vue'),
    meta: { title: '地块详情' },
  },
  {
    path: '/plots/:id/edit',
    name: 'PlotEdit',
    component: () => import('@/views/plots/PlotForm.vue'),
    meta: { title: '编辑地块' },
  },
  // ---- 种植档案相关独立页面（无底部 TabBar） ----
  {
    path: '/plots/:plotId/plantings/new',
    name: 'PlantingNew',
    component: () => import('@/views/plantings/PlantingForm.vue'),
    meta: { title: '新增种植档案' },
  },
  {
    path: '/plantings/:id',
    name: 'PlantingDetail',
    component: () => import('@/views/plantings/PlantingDetail.vue'),
    meta: { title: '种植档案详情' },
  },
  {
    path: '/plantings/:id/edit',
    name: 'PlantingEdit',
    component: () => import('@/views/plantings/PlantingForm.vue'),
    meta: { title: '编辑种植档案' },
  },
  // ---- 作业记录相关独立页面（无底部 TabBar） ----
  {
    path: '/plantings/:plantingId/operations/new',
    name: 'OperationNew',
    component: () => import('@/views/operations/OperationForm.vue'),
    meta: { title: '新增作业记录' },
  },
  {
    path: '/operations/:id/edit',
    name: 'OperationEdit',
    component: () => import('@/views/operations/OperationForm.vue'),
    meta: { title: '编辑作业记录' },
  },
  // ---- 销售记录相关独立页面（无底部 TabBar） ----
  {
    path: '/plantings/:plantingId/sales/new',
    name: 'SalesNew',
    component: () => import('@/views/sales/SalesForm.vue'),
    meta: { title: '新增销售记录' },
  },
  {
    path: '/sales/:id/edit',
    name: 'SalesEdit',
    component: () => import('@/views/sales/SalesForm.vue'),
    meta: { title: '编辑销售记录' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
