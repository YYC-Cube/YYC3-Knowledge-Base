<template>
  <wd-toast></wd-toast>
  <view class="page-floating-panel">
    <page-wraper>
      <wd-tabs v-model="tab">
        <wd-tab :title="$t('ji-chu-yong-fa-1')">
          <wd-floating-panel safeAreaInsetBottom>
            <wd-cell-group border>
              <wd-cell v-for="item in data" :key="item" :title="item" />
            </wd-cell-group>
          </wd-floating-panel>
        </wd-tab>
        <wd-tab :title="$t('zi-ding-yi-mao-dian-0')">
          <wd-floating-panel v-model:height="height" :anchors="anchors" safeAreaInsetBottom @heightChange="handleHeightChange">
            <view class="page-floating-panel__content">
              {{ $t('"zi-ding-yi-mao-dian"') }} {{ anchors.map(addUnit) }} - {{ addUnit(height.toFixed(0)) }}
            </view>
          </wd-floating-panel>
        </wd-tab>
        <wd-tab :title="$t('jin-tou-bu-tuo-zhuai-0')">
          <wd-floating-panel :contentDraggable="false">
            <view class="page-floating-panel__content">{{ $t('nei-rong-qu-bu-ke-yi-tuo-zhuai') }}</view>
          </wd-floating-panel>
        </wd-tab>
      </wd-tabs>
    </page-wraper>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useToast } from '@/uni_modules/wot-ui'
import { addUnit, getSystemInfo } from '@/uni_modules/wot-ui/common/util'

const { show } = useToast()

const data = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

const tab = ref<number>(0)
const height = ref<number>(0)
const windowHeight = ref<number>(0)
const anchors = ref<number[]>([])

const handleHeightChange = ({ height }: { height: number }) => {
  show(addUnit(height))
}

onLoad(() => {
  windowHeight.value = getSystemInfo().windowHeight
  anchors.value = [100, Math.round(0.4 * windowHeight.value), Math.round(0.7 * windowHeight.value)]
  height.value = anchors.value[1]
})
</script>

<style lang="scss" scoped>
.page-floating-panel {
  &__content {
    padding: $padding-main;
    font-size: $typography-body-size-extra-large;
    font-weight: $typography-body-font-weight-strong;
    text-align: center;
    color: $text-main;
  }
}
</style>
