<template>
  <div class="planting-form-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="isEdit ? '编辑种植档案' : '新增种植档案'"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 表单区域 -->
    <div class="form-wrapper">
      <van-form ref="formRef" @submit="onSubmit">
        <!-- 所在的地块名（仅新增时显示） -->
        <van-cell-group inset v-if="!isEdit && plotName">
          <van-field label="地块" :model-value="plotName" readonly />
        </van-cell-group>

        <van-cell-group inset title="基本信息">
          <!-- 年份 -->
          <van-field
            v-model.number="formData.year"
            name="year"
            label="年份"
            placeholder="请输入年份"
            type="digit"
            :rules="[
              { required: true, message: '请输入年份' },
              { validator: validateYear, message: '年份需在 2000 ~ 2100 之间' },
            ]"
          />

          <!-- 季节 -->
          <van-field
            v-model="formData.season"
            name="season"
            label="季节"
            placeholder="请选择季节（也可手动输入）"
            :rules="[{ required: true, message: '请选择季节' }]"
            readonly
            is-link
            @click="showSeasonPicker = true"
          />

          <!-- 作物名称 -->
          <van-field
            v-model="formData.cropName"
            name="cropName"
            label="作物名称"
            placeholder="请选择作物（也可手动输入）"
            :rules="[{ required: true, message: '请选择作物' }]"
            readonly
            is-link
            @click="showCropPicker = true"
          />

          <!-- 品种 -->
          <van-field
            v-model="formData.variety"
            name="variety"
            label="品种"
            placeholder="例如：济麦22（选填）"
            maxlength="100"
            clearable
          />

          <!-- 种植面积 -->
          <van-field
            v-model.number="formData.area"
            name="area"
            label="种植面积"
            placeholder="请输入种植面积"
            type="number"
            :rules="[
              { required: true, message: '请输入种植面积' },
              { validator: validateArea, message: '面积必须大于 0' },
            ]"
          >
            <template #extra>
              <span style="color: #999; font-size: 14px">亩</span>
            </template>
          </van-field>

          <!-- 状态 -->
          <van-field name="status" label="状态">
            <template #input>
              <van-radio-group v-model="formData.status" direction="horizontal">
                <van-radio :name="1">进行中</van-radio>
                <van-radio :name="2">已完成</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>

        <!-- 备注 -->
        <van-cell-group inset title="备注（选填）">
          <van-field
            v-model="formData.notes"
            name="notes"
            label="备注"
            placeholder="可补充种植相关的备注信息"
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

    <!-- 季节选择弹出层 -->
    <van-action-sheet
      v-model:show="showSeasonPicker"
      title="选择季节"
      :actions="seasonActions"
      cancel-text="取消"
      @select="onSelectSeason"
    />

    <!-- 作物选择弹出层 -->
    <van-action-sheet
      v-model:show="showCropPicker"
      title="选择作物"
      :actions="cropActions"
      cancel-text="取消"
      @select="onSelectCrop"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { addPlantingRecord, updatePlantingRecord, getPlantingRecordById } from '@/db/services/plantingRecordService'
import { getPlotById } from '@/db/services/plotService'
import type { PlantingRecord, Plot } from '@/db/types'

const route = useRoute()
const router = useRouter()

/** 是否编辑模式 */
const isEdit = computed(() => route.name === 'PlantingEdit')

/** 所属地块信息（仅新增时需要） */
const plotName = ref('')

/** 提交状态 */
const submitting = ref(false)

/** 表单数据 */
const formData = reactive({
  year: new Date().getFullYear(),
  season: '',
  cropName: '',
  variety: '',
  area: undefined as number | undefined,
  status: 1, // 默认"进行中"
  notes: '',
})

/** 季节选择器 */
const showSeasonPicker = ref(false)
const seasonPresets = ['上季', '下季', '春季', '夏季', '秋季', '冬季']
const seasonActions = seasonPresets.map((s) => ({ name: s }))

/** 作物选择器 */
const showCropPicker = ref(false)
const cropPresets = ['小麦', '玉米']
const cropActions = cropPresets.map((c) => ({ name: c }))

/** 加载数据 */
onMounted(async () => {
  if (isEdit.value) {
    // 编辑模式：加载已有档案
    const id = Number(route.params.id)
    try {
      const record = await getPlantingRecordById(id)
      if (record) {
        formData.year = record.year
        formData.season = record.season
        formData.cropName = record.cropName
        formData.variety = record.variety || ''
        formData.area = record.area
        formData.status = record.status
        formData.notes = record.notes || ''

        // 加载地块名称
        const plot = await getPlotById(record.plotId)
        plotName.value = plot?.name || ''
      } else {
        showToast('种植档案不存在')
        router.back()
      }
    } catch (error) {
      console.error('[农记] 加载种植档案失败:', error)
      showToast('加载失败')
    }
  } else {
    // 新增模式：加载地块信息，默认带入面积
    const plotId = Number(route.params.plotId)
    try {
      const plot = await getPlotById(plotId)
      if (plot) {
        plotName.value = plot.name
        formData.area = plot.area
      }
    } catch (error) {
      console.error('[农记] 加载地块信息失败:', error)
    }
  }
})

/** 年份校验 */
function validateYear(val: number | undefined): boolean {
  return !!(val && val >= 2000 && val <= 2100)
}

/** 面积校验 */
function validateArea(val: number | undefined): boolean {
  return !!(val && val > 0)
}

/** 选择季节 */
function onSelectSeason(action: { name: string }) {
  formData.season = action.name
  showSeasonPicker.value = false
}

/** 选择作物 */
function onSelectCrop(action: { name: string }) {
  formData.cropName = action.name
  showCropPicker.value = false
}

/** 提交 */
async function onSubmit() {
  submitting.value = true
  try {
    if (isEdit.value) {
      // 编辑模式
      await updatePlantingRecord(Number(route.params.id), {
        year: formData.year,
        season: formData.season,
        cropName: formData.cropName,
        variety: formData.variety || undefined,
        area: formData.area!,
        status: formData.status,
        notes: formData.notes || undefined,
      })
      showToast({ message: '保存成功', icon: 'success' })
      router.replace({ name: 'PlantingDetail', params: { id: route.params.id as string } })
    } else {
      // 新增模式
      const plotId = Number(route.params.plotId)
      const id = await addPlantingRecord({
        plotId,
        year: formData.year,
        season: formData.season,
        cropName: formData.cropName,
        variety: formData.variety || undefined,
        area: formData.area!,
        totalYield: undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      })
      showToast({ message: '新增成功', icon: 'success' })
      // 返回地块详情页
      router.replace({ name: 'PlotDetail', params: { id: String(plotId) } })
    }
  } catch (error: any) {
    console.error('[农记] 保存种植档案失败:', error)
    showToast(error?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

/** 返回 */
function goBack() {
  router.back()
}
</script>

<style scoped>
.planting-form-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.form-wrapper {
  padding: 12px 0 24px;
}

:deep(.van-cell-group__title) {
  padding: 16px 16px 8px;
  font-size: 14px;
  color: #999;
}

.submit-area {
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom, 0px));
}
</style>
