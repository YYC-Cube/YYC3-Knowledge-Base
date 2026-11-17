<template>
  <page-wraper>
    <view class="page-loadmore">
      <view v-for="index in num" :key="index" class="page-loadmore__item">
        <image :src="blackMao" />
        <view class="page-loadmore__content">{{ $t('zhe-shi-yi-tiao-ce-shi-index') + index + 1 }}</view>
      </view>
      <wd-loadmore :state="state" @reload="loadmore" />
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { ref } from 'vue'
import blackMao from '../static/images/black-mao.png'

const state = ref<any>('loading')
const num = ref<number>(0)
const max = ref<number>(60)

onReachBottom(() => {
  if (num.value === 45) {
    state.value = 'error'
  } else if (num.value < max.value) {
    loadmore()
  } else if (num.value === max.value) {
    state.value = 'finished'
  }
})

onLoad(() => {
  loadmore()
})

function loadmore() {
  setTimeout(() => {
    num.value = num.value + 15
    state.value = 'loading'
  }, 200)
}
</script>
<style lang="scss" scoped>
.page-loadmore {
  &__item {
    position: relative;
    display: flex;
    padding: $padding-main $padding-extra-loose;
    color: $text-secondary;
    background: $filled-oppo;

    &::after {
      position: absolute;
      left: 0;
      bottom: 0;
      display: block;
      width: 100%;
      height: $stroke-main;
      content: '';
      background: $divider-light;
      transform: scaleY(0.5);
    }
  }

  &__content {
    flex: 1;
  }

  image {
    display: block;
    width: 120px;
    height: 78px;
    margin-right: $padding-extra-loose;
  }
}
</style>
