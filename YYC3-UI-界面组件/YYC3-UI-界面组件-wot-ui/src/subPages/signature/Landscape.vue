<template>
  <view class="landscape-signature">
    <wd-signature
      v-if="inited"
      ref="signatureRef"
      :height="height"
      :width="width"
      enable-history
      pressure
      background-color="#f5f5f5"
      @confirm="handleConfirm"
    >
      <!-- #ifndef MP-WEIXIN -->

      <template #footer="{ clear, confirm, restore, revoke, canUndo, canRedo }">
        <view class="landscape-signature__actions">
          <view class="landscape-signature__button-group">
            <wd-button size="small" plain @click="revoke" :disabled="!canUndo">{{ $t('che-hui') }}</wd-button>
            <wd-button size="small" plain @click="restore" :disabled="!canRedo">{{ $t('hui-fu') }}</wd-button>
            <wd-button size="small" plain @click="clear">{{ $t('qing-chu') }}</wd-button>
            <wd-button size="small" type="primary" @click="confirm">{{ $t('wan-cheng') }}</wd-button>
          </view>
        </view>
      </template>
      <!-- #endif -->
    </wd-signature>
  </view>
</template>

<script lang="ts" setup>
import { getSystemInfo, pause } from '@/uni_modules/wot-ui/common/util'
import type { SignatureInstance, SignatureResult } from '@/uni_modules/wot-ui/components/wd-signature/types'
import { ref, onMounted } from 'vue'

const signatureRef = ref<SignatureInstance>()
const height = ref(0)
const width = ref(0)
const inited = ref(false)

onMounted(() => {
  const { windowWidth, windowHeight } = getSystemInfo()
  // #ifdef MP-WEIXIN
  // 微信小程序下不需要预留按钮空间，使用全屏尺寸
  width.value = windowWidth
  height.value = windowHeight - 60 // 预留底部按钮空间
  // #endif

  // #ifndef MP-WEIXIN
  width.value = windowWidth - 48
  height.value = windowHeight - 48
  inited.value = true
  // #endif

  pause(100).then(() => {
    inited.value = true
  })
})

function handleConfirm(result: SignatureResult) {
  if (result.success) {
    uni.previewImage({
      urls: [result.tempFilePath]
    })
  }
}
</script>

<style lang="scss">
.landscape-signature {
  height: 100vh;
  // #ifdef H5
  height: calc(100vh - 44px);
  // #endif
  background: $filled-oppo;
  position: relative;
  box-sizing: border-box;

  // #ifdef MP-WEIXIN
  // 微信小程序横屏模式下的布局
  padding: 0;
  display: flex;
  flex-direction: column;
  // #endif

  // #ifndef MP-WEIXIN
  padding: $padding-ultra-loose 0;
  padding-left: $padding-ultra-spacious;

  &__actions {
    position: fixed;
    left: 0;
    top: 50%;
    width: $padding-ultra-spacious;
    transform: translateY(-50%) rotate(90deg);
    transform-origin: center;
    z-index: 10;
  }

  &__button-group {
    display: flex;
    flex-direction: row;
    gap: $spacing-loose;
    white-space: nowrap;
    width: max-content;
    transform: translateX(-50%);
  }
  // #endif
}
</style>
