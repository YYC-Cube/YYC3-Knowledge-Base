<template>
  <page-wraper>
    <view class="page-resize">
      <demo-group :title="$t('zu-jian-lei-xing')">
        <demo-group-item :title="$t('ji-chu-yong-fa-0')">
          <wd-resize @resize="handleResize">
            <view class="page-resize__target" :style="{ width, height }"></view>
          </wd-resize>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">width:</view>
            {{ lastWidth }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeWidth }}
          </view>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">height:</view>
            {{ lastHeight }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeHeight }}
          </view>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">top:</view>
            {{ lastTop }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeTop }}
          </view>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">right:</view>
            {{ lastRight }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeRight }}
          </view>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">bottom:</view>
            {{ lastBottom }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeBottom }}
          </view>
          <view class="page-resize__tip-item">
            <view class="page-resize__tip-label">left:</view>
            {{ lastLeft }}
            <wd-icon name="arrow-thin-up" custom-class="page-resize__icon"></wd-icon>
            {{ sizeLeft }}
          </view>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import { onReady } from '@dcloudio/uni-app'
import { ref } from 'vue'
const width = ref<string>('')
const height = ref<string>('')
const lastWidth = ref<string>('')
const lastHeight = ref<string>('')
const lastTop = ref<string>('')
const lastRight = ref<string>('')
const lastBottom = ref<string>('')
const lastLeft = ref<string>('')
const sizeWidth = ref<string>('')
const sizeHeight = ref<string>('')
const sizeTop = ref<string>('')
const sizeRight = ref<string>('')
const sizeBottom = ref<string>('')
const sizeLeft = ref<string>('')

onReady(() => {
  setTimeout(() => {
    width.value = '100px'
    height.value = '100px'
  }, 1500)
})

function handleResize(detail: Record<string, string | number>) {
  const { height, width, top, right, bottom, left } = detail
  lastHeight.value = sizeHeight.value
  lastTop.value = sizeTop.value
  lastRight.value = sizeRight.value
  lastBottom.value = sizeBottom.value
  lastLeft.value = sizeLeft.value
  sizeHeight.value = height as string
  sizeWidth.value = width as string
  sizeTop.value = top as string
  sizeRight.value = right as string
  sizeBottom.value = bottom as string
  sizeLeft.value = left as string
}
</script>
<style lang="scss" scoped>
.page-resize {
  &__target {
    background: $primary-6;
  }

  &__tip-item {
    margin-top: 15px;
    color: $text-secondary;
    font-size: $typography-label-size-main;
  }

  &__tip-label {
    display: inline-block;
    width: 70px;
  }
}

:deep(.page-resize__icon) {
  margin: 0 $spacing-super-tight;
  transform: rotate(90deg);
}
</style>
