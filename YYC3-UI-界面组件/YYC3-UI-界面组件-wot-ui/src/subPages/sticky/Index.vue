<template>
  <page-wraper>
    <view class="page-sticky page-sticky__stage">
      <demo-group :title="$t('zu-jian-lei-xing')">
        <demo-group-item :title="$t('jiBenYongFa')">
          <view class="page-sticky__container">
            <wd-sticky custom-style="margin-left: var(--wot-spacing-super-loose);">
              <wd-button type="success">{{ $t('ji-chu-yong-fa-0') }}</wd-button>
            </wd-sticky>
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('xiang-dui-rong-qi')">
          <view class="page-sticky__container">
            <wd-sticky-box>
              <view class="page-sticky__box">
                <wd-sticky custom-style="margin-left: var(--wot-n-220)">
                  <wd-button type="warning">{{ $t('xiang-dui-rong-qi') }}</wd-button>
                </wd-sticky>
              </view>
            </wd-sticky-box>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-yang-shi')">
        <demo-group-item :title="$t('xi-ding-ju-li')">
          <view class="page-sticky__container">
            <wd-sticky :offset-top="50" custom-style="margin-left: var(--wot-n-120)">
              <wd-button>{{ $t('xi-ding-ju-li-0') }}</wd-button>
            </wd-sticky>
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('xiang-dui-rong-qi-xi-ding-ju-li')">
          <view class="page-sticky__container">
            <wd-sticky-box>
              <view class="page-sticky__box">
                <wd-sticky :offset-top="150">
                  <wd-button type="warning">{{ $t('xiang-dui-rong-qi-xi-ding-ju-li') }}</wd-button>
                </wd-sticky>
              </view>
            </wd-sticky-box>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('te-shu-yang-shi')">
        <demo-group-item :title="$t('dong-tai-cha-ru')">
          <view class="page-sticky__container">
            <wd-button type="info" plain @click="insert">{{ $t('dian-ji-cha-ru') }}</wd-button>
            <wd-sticky custom-style="margin-left: var(--wot-n-220)">
              <wd-button v-if="show" type="danger">{{ $t('dong-tai-sheng-cheng') }}</wd-button>
            </wd-sticky>
          </view>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
const show = ref<boolean>(false)

function display() {
  show.value = true
}
function insert() {
  display()
}
onShow(() => {
  setTimeout(display, 5000)
})
</script>
<style lang="scss" scoped>
.page-sticky {
  width: 100vw;
  overflow-x: hidden;
  &__stage {
    height: 250vh;
  }

  &__container {
    padding: $padding-extra-loose 0;
    color: $text-auxiliary;
  }

  &__box {
    width: 100vw;
    height: 120px;
    background-color: $filled-oppo;
  }
}
</style>
