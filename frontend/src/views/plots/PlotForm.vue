<template>
  <div class="plot-form-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="isEdit ? '编辑地块' : '新增地块'"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 表单区域 -->
    <div class="form-wrapper">
      <van-form ref="formRef" @submit="onSubmit">
        <!-- 地块名称 -->
        <van-cell-group inset title="基本信息">
          <van-field
            v-model="formData.name"
            name="name"
            label="地块名称"
            placeholder="例如：村东头大块地"
            :rules="[{ required: true, message: '请输入地块名称' }]"
            maxlength="50"
            clearable
          />

          <!-- 面积 -->
          <van-field
            v-model.number="formData.area"
            name="area"
            label="面积"
            placeholder="请输入面积"
            type="number"
            :rules="[
              { required: true, message: '请输入面积' },
              { validator: validateArea, message: '面积必须大于 0' },
            ]"
          >
            <template #extra>
              <span style="color: #999; font-size: 14px">亩</span>
            </template>
          </van-field>
        </van-cell-group>

        <!-- 补充信息 -->
        <van-cell-group inset title="补充信息（选填）">
          <!-- 位置描述 -->
          <van-field
            v-model="formData.location"
            name="location"
            label="位置描述"
            placeholder="例如：村东头，靠近大路"
            maxlength="200"
            clearable
          />

          <!-- 土壤类型 -->
          <van-field
            v-model="formData.soilType"
            name="soilType"
            label="土壤类型"
            placeholder="请选择土壤类型"
            readonly
            is-link
            @click="showSoilPicker = true"
          />

          <!-- 状态 -->
          <van-field name="status" label="使用中">
            <template #input>
              <van-switch
                v-model="statusActive"
                active-color="#07c160"
                inactive-color="#999"
                size="24px"
              />
            </template>
          </van-field>
        </van-cell-group>

        <!-- 备注 -->
        <van-cell-group inset title="备注（选填）">
          <van-field
            v-model="formData.notes"
            name="notes"
            label="备注"
            placeholder="可补充地块的其他信息"
            type="textarea"
            rows="3"
            maxlength="500"
            show-word-limit
          />
        </van-cell-group>

        <!-- 提交按钮 -->
        <div class="submit-area">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="submitting"
            size="large"
          >
            {{ isEdit ? '保存修改' : '确认新增' }}
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 土壤类型选择弹出层 -->
    <van-action-sheet
      v-model:show="showSoilPicker"
      title="选择土壤类型"
      :actions="soilActions"
      cancel-text="取消"
      @select="onSelectSoil"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { FormInstance } from 'vant'
import { addPlot, updatePlot, getPlotById } from '@/db/services/plotService'
import type { Plot } from '@/db/types'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()

/** 是否编辑模式（根据路由参数判断） */
const isEdit = computed(() => !!route.params.id)

/** 是否正在提交 */
const submitting = ref(false)

/** 表单数据 */
const formData = reactive({
  name: '',
  area: undefined as number | undefined,
  location: '',
  soilType: '',
  notes: '',
})

/** 状态开关（true=使用中, false=已废弃） */
const statusActive = ref(true)

/** 土壤选择器 */
const showSoilPicker = ref(false)
const soilOptions = ['沙土', '壤土', '黏土', '盐碱地', '其他']
const soilActions = soilOptions.map((s) => ({ name: s }))

/** 编辑模式下加载地块数据 */
onMounted(async () => {
  if (isEdit.value) {
    const id = Number(route.params.id)
    const plot = await getPlotById(id)
    if (plot) {
      formData.name = plot.name
      formData.area = plot.area
      formData.location = plot.location || ''
      formData.soilType = plot.soilType || ''
      formData.notes = plot.notes || ''
      statusActive.value = plot.status === 1
    } else {
      showToast('地块不存在')
      router.replace({ name: 'PlotList' })
    }
  }
})

/** 面积校验：必须 > 0 */
function validateArea(val: number | undefined): boolean {
  return !!(val && val > 0)
}

/** 选择土壤类型 */
function onSelectSoil(action: { name: string }) {
  formData.soilType = action.name
  showSoilPicker.value = false
}

/** 提交表单 */
async function onSubmit() {
  submitting.value = true
  try {
    const data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      area: formData.area!,
      location: formData.location || undefined,
      soilType: formData.soilType || undefined,
      status: statusActive.value ? 1 : 0,
      notes: formData.notes || undefined,
    }

    if (isEdit.value) {
      // 编辑模式：更新地块
      await updatePlot(Number(route.params.id), data)
      showToast({ message: '保存成功', icon: 'success' })
      router.replace({ name: 'PlotDetail', params: { id: route.params.id as string } })
    } else {
      // 新增模式：添加地块
      await addPlot(data)
      showToast({ message: '新增成功', icon: 'success' })
      router.replace({ name: 'PlotList' })
    }
  } catch (error) {
    console.error('[农记] 保存地块失败:', error)
    showToast('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

/** 返回上一页 */
function goBack() {
  router.back()
}
</script>

<style scoped>
.plot-form-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.form-wrapper {
  padding: 12px 0 24px;
}

/* 让 CellGroup 标题更明显 */
:deep(.van-cell-group__title) {
  padding: 16px 16px 8px;
  font-size: 14px;
  color: #999;
}

.submit-area {
  padding: 24px 16px;
}
</style>
