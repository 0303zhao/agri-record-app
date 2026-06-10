<template>
  <div class="sales-form-page">
    <van-nav-bar
      :title="isEdit ? '编辑销售记录' : '新增销售记录'"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <div class="form-wrapper">
      <van-form ref="formRef" @submit="onSubmit">
        <van-cell-group inset title="销售信息">
          <!-- 销售日期 -->
          <van-field
            v-model="formData.saleDate"
            name="saleDate"
            label="销售日期"
            placeholder="请选择日期"
            :rules="[{ required: true, message: '请选择销售日期' }]"
            readonly
            is-link
            @click="showDatePicker = true"
          />

          <!-- 收购方 -->
          <van-field
            v-model="formData.buyer"
            name="buyer"
            label="收购方"
            placeholder="例如：粮站、合作社（选填）"
            maxlength="100"
            clearable
          />

          <!-- 销售数量 -->
          <van-field
            v-model.number="formData.quantity"
            name="quantity"
            label="销售数量"
            placeholder="请输入销售数量"
            type="number"
            :rules="[
              { required: true, message: '请输入销售数量' },
              { validator: validateQuantity, message: '必须大于0' },
            ]"
          >
            <template #extra>
              <span class="unit-text">斤</span>
            </template>
          </van-field>

          <!-- 单价 -->
          <van-field
            v-model.number="formData.unitPrice"
            name="unitPrice"
            label="销售单价"
            placeholder="请输入单价"
            type="number"
            :rules="[
              { required: true, message: '请输入销售单价' },
              { validator: validatePrice, message: '不能小于0' },
            ]"
          >
            <template #extra>
              <span class="unit-text">元/斤</span>
            </template>
          </van-field>

          <!-- 金额（自动计算，只读） -->
          <van-field
            :model-value="calcAmount"
            name="totalAmount"
            label="销售金额"
            readonly
          >
            <template #extra>
              <span class="amount-highlight">元</span>
            </template>
          </van-field>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import {
  addSalesRecord,
  updateSalesRecord,
  getSalesRecordById,
} from '@/db/services/salesRecordService'
import { todayStr } from '@/utils/format'
import type { SalesRecord } from '@/db/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'SalesEdit')
const submitting = ref(false)

const formData = reactive({
  saleDate: todayStr(),
  buyer: '',
  quantity: undefined as number | undefined,
  unitPrice: undefined as number | undefined,
  notes: '',
})

/** 自动计算金额 */
const calcAmount = computed(() => {
  if (formData.quantity && formData.unitPrice !== undefined) {
    return (formData.quantity * formData.unitPrice).toFixed(2)
  }
  return '0.00'
})

const showDatePicker = ref(false)
const selectedDate = ref<[string, string, string]>(['2026', '01', '01'])

onMounted(async () => {
  if (isEdit.value) {
    const id = Number(route.params.id)
    const record = await getSalesRecordById(id)
    if (record) {
      formData.saleDate = record.saleDate
      formData.buyer = record.buyer || ''
      formData.quantity = record.quantity
      formData.unitPrice = record.unitPrice
      formData.notes = record.notes || ''
    } else {
      showToast('销售记录不存在')
      router.back()
    }
  }
})

function validateQuantity(val: number | undefined): boolean {
  return !!(val && val > 0)
}

function validatePrice(val: number | undefined): boolean {
  return val !== undefined && val !== null && val >= 0
}

function onConfirmDate({ selectedValues }: { selectedValues: string[] }) {
  const [y, m, d] = selectedValues
  formData.saleDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  showDatePicker.value = false
}

async function onSubmit() {
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateSalesRecord(Number(route.params.id), {
        saleDate: formData.saleDate,
        buyer: formData.buyer || undefined,
        quantity: formData.quantity!,
        unitPrice: formData.unitPrice!,
        notes: formData.notes || undefined,
      })
      const record = await getSalesRecordById(Number(route.params.id))
      showToast({ message: '保存成功', icon: 'success' })
      if (record) {
        router.replace({ name: 'PlantingDetail', params: { id: String(record.plantingRecordId) } })
      } else {
        router.back()
      }
    } else {
      await addSalesRecord({
        plantingRecordId: Number(route.params.plantingId),
        saleDate: formData.saleDate,
        buyer: formData.buyer || undefined,
        quantity: formData.quantity!,
        unitPrice: formData.unitPrice!,
        notes: formData.notes || undefined,
      })
      showToast({ message: '新增成功', icon: 'success' })
      router.replace({ name: 'PlantingDetail', params: { id: route.params.plantingId as string } })
    }
  } catch (error: any) {
    console.error('[农记] 保存销售记录失败:', error)
    showToast(error?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.sales-form-page {
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

.amount-highlight {
  font-size: 16px;
  font-weight: 600;
  color: #ee0a24;
}

.submit-area {
  padding: 24px 16px;
}
</style>
