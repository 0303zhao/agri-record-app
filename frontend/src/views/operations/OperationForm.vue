<template>
  <div class="operation-form-page">
    <van-nav-bar
      :title="isEdit ? '编辑作业记录' : '新增作业记录'"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <div class="form-wrapper">
      <van-form ref="formRef" @submit="onSubmit">
        <!-- 基本信息 -->
        <van-cell-group inset title="基本信息">
          <van-field
            v-model="formData.operationDate"
            name="operationDate"
            label="作业日期"
            placeholder="请选择日期"
            :rules="[{ required: true, message: '请选择作业日期' }]"
            readonly
            is-link
            @click="showDatePicker = true"
          />

          <van-field
            v-model="operationTypeLabel"
            name="operationType"
            label="作业类型"
            placeholder="请选择作业类型"
            :rules="[{ required: true, message: '请选择作业类型' }]"
            readonly
            is-link
            @click="showTypePicker = true"
          />

          <van-field
            v-model="formData.description"
            name="description"
            label="作业说明"
            placeholder="例如：第一次除草、播种小麦"
            maxlength="200"
            clearable
          />
        </van-cell-group>

        <!-- 产品信息 -->
        <van-cell-group inset title="产品信息（选填）">
          <van-field
            v-model="formData.productName"
            name="productName"
            label="产品名称"
            placeholder="例如：复合肥、尿素"
            maxlength="100"
            clearable
          />
          <van-field
            v-model="formData.brand"
            name="brand"
            label="品牌"
            placeholder="品牌名称"
            maxlength="100"
            clearable
          />
          <van-field
            v-model.number="formData.quantity"
            name="quantity"
            label="总用量"
            placeholder="请输入"
            type="number"
          />
          <van-field
            v-model="formData.unit"
            name="unit"
            label="单位"
            placeholder="请选择"
            readonly
            is-link
            @click="showUnitPicker = true"
          />
        </van-cell-group>

        <!-- 费用明细 -->
        <van-cell-group inset title="费用明细">
          <van-field
            v-model.number="formData.materialCost"
            name="materialCost"
            label="材料费用"
            placeholder="0"
            type="number"
            :rules="[{ validator: validateNonNegative, message: '不能小于0' }]"
          >
            <template #extra>
              <span class="unit-text">元</span>
            </template>
          </van-field>

          <van-field
            v-model.number="formData.laborCount"
            name="laborCount"
            label="用工人数"
            placeholder="选填"
            type="digit"
          >
            <template #extra>
              <span class="unit-text">人</span>
            </template>
          </van-field>

          <van-field
            v-model.number="formData.laborCost"
            name="laborCost"
            label="人工费用"
            placeholder="0"
            type="number"
            :rules="[{ validator: validateNonNegative, message: '不能小于0' }]"
          >
            <template #extra>
              <span class="unit-text">元</span>
            </template>
          </van-field>

          <van-field
            v-model.number="formData.machineryCost"
            name="machineryCost"
            label="机械费用"
            placeholder="0"
            type="number"
            :rules="[{ validator: validateNonNegative, message: '不能小于0' }]"
          >
            <template #extra>
              <span class="unit-text">元</span>
            </template>
          </van-field>

          <van-field
            v-model.number="formData.otherCost"
            name="otherCost"
            label="其他费用"
            placeholder="0"
            type="number"
            :rules="[{ validator: validateNonNegative, message: '不能小于0' }]"
          >
            <template #extra>
              <span class="unit-text">元</span>
            </template>
          </van-field>
        </van-cell-group>

        <!-- 总费用 -->
        <van-cell-group inset title="总费用">
          <van-field
            v-model.number="formData.totalCost"
            name="totalCost"
            label="总费用"
            placeholder="自动计算或手动填写"
            type="number"
            :rules="[
              { required: true, message: '请输入总费用' },
              { validator: validateNonNegative, message: '不能小于0' },
            ]"
          >
            <template #extra>
              <span class="unit-text">元</span>
            </template>
          </van-field>
          <div class="calc-hint" v-if="autoTotal > 0">
            <van-icon name="info-o" size="14" />
            <span>分项费用合计：{{ autoTotal }} 元（已自动填入）</span>
          </div>
        </van-cell-group>

        <!-- 备注 -->
        <van-cell-group inset title="备注（选填）">
          <van-field
            v-model="formData.notes"
            name="notes"
            label="备注"
            placeholder="其他补充信息"
            type="textarea"
            rows="3"
            maxlength="500"
            show-word-limit
          />
        </van-cell-group>

        <!-- 提交 -->
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

    <!-- 日期选择 -->
    <van-popup v-model:show="showDatePicker" position="bottom" teleport="body">
      <van-date-picker
        :model-value="selectedDate"
        title="选择日期"
        :min-date="new Date(2000, 0, 1)"
        :max-date="new Date(2100, 11, 31)"
        @confirm="onConfirmDate"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 作业类型选择 -->
    <van-action-sheet
      v-model:show="showTypePicker"
      title="选择作业类型"
      :actions="typeActions"
      cancel-text="取消"
      @select="onSelectType"
    />

    <!-- 单位选择 -->
    <van-action-sheet
      v-model:show="showUnitPicker"
      title="选择单位"
      :actions="unitActions"
      cancel-text="取消"
      @select="onSelectUnit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import {
  addOperationRecord,
  updateOperationRecord,
  getOperationRecordById,
} from '@/db/services/operationRecordService'
import { getOperationTypeLabel, getOperationTypeOptions } from '@/utils/operationTypes'
import type { OperationRecord } from '@/db/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'OperationEdit')
const submitting = ref(false)

/** 表单数据 */
const formData = reactive({
  operationDate: formatToday(),
  operationType: '',
  description: '',
  productName: '',
  brand: '',
  quantity: undefined as number | undefined,
  unit: '',
  materialCost: 0,
  laborCount: undefined as number | undefined,
  laborCost: 0,
  machineryCost: 0,
  otherCost: 0,
  totalCost: 0,
  notes: '',
})

/** 作业类型中文显示 */
const operationTypeLabel = ref('')

/** 自算合计 */
const autoTotal = computed(() => {
  return (
    (formData.materialCost || 0) +
    (formData.laborCost || 0) +
    (formData.machineryCost || 0) +
    (formData.otherCost || 0)
  )
})

/** 分项费用变化时自动填入总计 */
watch(
  () => [formData.materialCost, formData.laborCost, formData.machineryCost, formData.otherCost],
  () => {
    if (autoTotal.value > 0) {
      formData.totalCost = autoTotal.value
    }
  }
)

/** 日期选择 */
const showDatePicker = ref(false)
const selectedDate = ref<[string, string, string]>(['2026', '01', '01'])

/** 作业类型 */
const showTypePicker = ref(false)
const typeActions = getOperationTypeOptions()

/** 单位 */
const showUnitPicker = ref(false)
const unitPresets = ['斤', '公斤', '袋', '瓶', '亩', '小时', '次', '其他']
const unitActions = unitPresets.map((u) => ({ name: u }))

onMounted(async () => {
  if (isEdit.value) {
    const id = Number(route.params.id)
    try {
      const record = await getOperationRecordById(id)
      if (record) {
        formData.operationDate = record.operationDate
        formData.operationType = record.operationType
        operationTypeLabel.value = getOperationTypeLabel(record.operationType)
        formData.description = record.description || ''
        formData.productName = record.productName || ''
        formData.brand = record.brand || ''
        formData.quantity = record.quantity
        formData.unit = record.unit || ''
        formData.materialCost = record.materialCost
        formData.laborCount = record.laborCount
        formData.laborCost = record.laborCost
        formData.machineryCost = record.machineryCost
        formData.otherCost = record.otherCost
        formData.totalCost = record.totalCost
        formData.notes = record.notes || ''
      } else {
        showToast('作业记录不存在')
        router.back()
      }
    } catch (error) {
      console.error('[农记] 加载作业记录失败:', error)
      showToast('加载失败')
    }
  }
})

/** 非负校验 */
function validateNonNegative(val: number | undefined): boolean {
  return val === undefined || val === null || val >= 0
}

/** 日期确认 */
function onConfirmDate({ selectedValues }: { selectedValues: string[] }) {
  const [y, m, d] = selectedValues
  formData.operationDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  showDatePicker.value = false
}

/** 选择作业类型 */
function onSelectType(action: { name: string; value: string }) {
  formData.operationType = action.value
  operationTypeLabel.value = action.name
  showTypePicker.value = false
}

/** 选择单位 */
function onSelectUnit(action: { name: string }) {
  formData.unit = action.name
  showUnitPicker.value = false
}

/** 提交 */
async function onSubmit() {
  submitting.value = true
  try {
    const data: Omit<OperationRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      plantingRecordId: isEdit.value ? 0 : Number(route.params.plantingId),
      operationType: formData.operationType,
      operationDate: formData.operationDate,
      description: formData.description || undefined,
      productName: formData.productName || undefined,
      brand: formData.brand || undefined,
      quantity: formData.quantity,
      unit: formData.unit || undefined,
      materialCost: formData.materialCost || 0,
      laborCount: formData.laborCount,
      laborCost: formData.laborCost || 0,
      machineryCost: formData.machineryCost || 0,
      otherCost: formData.otherCost || 0,
      totalCost: formData.totalCost || 0,
      notes: formData.notes || undefined,
    }

    if (isEdit.value) {
      await updateOperationRecord(Number(route.params.id), data)
      const record = await getOperationRecordById(Number(route.params.id))
      showToast({ message: '保存成功', icon: 'success' })
      if (record) {
        router.replace({ name: 'PlantingDetail', params: { id: String(record.plantingRecordId) } })
      } else {
        router.back()
      }
    } else {
      await addOperationRecord(data)
      showToast({ message: '新增成功', icon: 'success' })
      router.replace({ name: 'PlantingDetail', params: { id: route.params.plantingId as string } })
    }
  } catch (error: any) {
    console.error('[农记] 保存作业记录失败:', error)
    showToast(error?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}

function formatToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
</script>

<style scoped>
.operation-form-page {
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

.unit-text {
  font-size: 14px;
  color: #999;
}

.calc-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  color: #07c160;
}

.submit-area {
  padding: 24px 16px;
}
</style>
