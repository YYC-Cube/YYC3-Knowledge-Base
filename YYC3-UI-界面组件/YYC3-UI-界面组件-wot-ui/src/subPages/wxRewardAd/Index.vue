<template>
  <page-wraper :use-wx-ad="false">
    <view class="page-wx-reward-ad">
      <view class="page-wx-reward-ad__title">{{ $t('gan-xie-ni-yuan-yi-lai-guan-kan-guang-gao') }}</view>
      <view class="page-wx-reward-ad__content">{{ $t('guan-kan-cheng-gong-jiu-yi-jing-cheng-gong-wei-wo-zhu-li') }}</view>
      <view class="page-wx-reward-ad__button-group">
        <wd-button type="success" block @click="back">{{ $t('fan-hui-shi-yong') }}</wd-button>
        <wd-button type="danger" block @click="showAd">{{ $t('guan-kan-shi-pin') }}</wd-button>
      </view>
    </view>
  </page-wraper>
</template>
<script setup lang="ts">
import { useRewardAd } from '@/store/useRewardAd'
import { onMounted } from 'vue'
const { createRewardVideoAd, showRewardAd } = useRewardAd()

onMounted(async () => {
  createRewardVideoAd()
})

function back() {
  uni.navigateBack()
}

function showAd() {
  showRewardAd()
}
</script>
<style lang="scss" scoped>
.page-wx-reward-ad {
  padding: $padding-super-loose;
  text-align: center;

  &__title {
    color: $success-main;
    font-size: $typography-title-size-extra-large;
  }

  &__content {
    margin: $spacing-extra-loose 0;
    color: $text-main;
    font-size: $typography-body-size-extra-large;
  }

  &__button-group {
    display: flex;
    justify-content: space-around;
    margin-top: $spacing-super-loose;
  }
}
</style>
