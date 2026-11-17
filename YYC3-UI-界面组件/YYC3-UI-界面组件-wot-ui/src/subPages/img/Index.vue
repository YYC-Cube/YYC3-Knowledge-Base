<template>
  <page-wraper>
    <view class="page-img">
      <demo-group :title="$t('zu-jian-lei-xing')">
        <demo-group-item :title="$t('ji-ben-shi-yong')">
          <wd-img :width="100" :height="100" :src="imgURL" />
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-zhuang-tai')">
        <demo-group-item :title="$t('jia-zai-zhong-0')">
          <view class="page-img__grid page-img__grid--two">
            <view class="page-img__col">
              <wd-img width="100%" height="27vw" src="https://www.123.wot.com/a.jpg" />
              <view class="page-img__text">{{ $t('mo-ren-ti-shi') }}</view>
            </view>
            <view class="page-img__col">
              <wd-img width="100%" height="27vw" src="https://www.123.wot.com/a.jpg">
                <template #loading>
                  <wd-loading />
                </template>
              </wd-img>
              <view class="page-img__text">{{ $t('zi-ding-yi-ti-shi') }}</view>
            </view>
          </view>
        </demo-group-item>

        <demo-group-item :title="$t('jia-zai-shi-bai')">
          <view class="page-img__grid page-img__grid--two">
            <view class="page-img__col">
              <wd-img width="100%" height="27vw" src="https://www.123.wot.com/a.jpg" />
              <view class="page-img__text">{{ $t('mo-ren-ti-shi-0') }}</view>
            </view>
            <view class="page-img__col">
              <wd-img width="100%" height="27vw" src="https://www.123.wot.com/a.jpg">
                <template #error>
                  <view class="page-img__error">{{ $t('jia-zai-shi-bai') }}</view>
                </template>
              </wd-img>
              <view class="page-img__text">{{ $t('zi-ding-yi-ti-shi-0') }}</view>
            </view>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-yang-shi')">
        <demo-group-item :title="$t('tian-chong')">
          <view class="page-img__grid">
            <view class="page-img__col" v-for="mode in modes" :key="mode">
              <wd-img width="100%" height="27vw" :src="imgURL" :mode="mode" />
              <view class="page-img__text">{{ mode }}</view>
            </view>
          </view>
        </demo-group-item>

        <demo-group-item :title="$t('yuan-xing')">
          <view class="page-img__grid">
            <view class="page-img__col" v-for="mode in modes" :key="`round-${mode}`">
              <wd-img round width="100%" height="27vw" :src="imgURL" :mode="mode" />
              <view class="page-img__text">{{ mode }}</view>
            </view>
          </view>
        </demo-group-item>

        <demo-group-item :title="$t('yuan-jiao')">
          <view class="page-img__grid">
            <view class="page-img__col" v-for="mode in modes" :key="`radius-${mode}`">
              <wd-img width="100%" height="27vw" :radius="5" :src="imgURL" :mode="mode" />
              <view class="page-img__text">{{ mode }}</view>
            </view>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('te-shu-yong-fa')">
        <demo-group-item :title="$t('ke-yu-lan')">
          <view class="page-img__grid page-img__grid--two">
            <view class="page-img__col">
              <wd-img width="100%" mode="widthFix" :src="imgURL" :enable-preview="true" />
              <view class="page-img__text">{{ $t('mo-ren-yu-lan-tu') }}</view>
            </view>
            <view class="page-img__col">
              <wd-img width="100%" mode="widthFix" :src="imgURL" :preview-src="previewURL" :enable-preview="true" />
              <view class="page-img__text">{{ $t('zhi-ding-yu-lan-tu') }}</view>
            </view>
          </view>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import type { ImageMode } from '@/uni_modules/wot-ui/components/wd-img/types'
import blackMao from '../static/images/black-mao.png'
import blackMaoPreview from '../static/images/black-mao-1.png'

const imgURL = blackMao
const previewURL = blackMaoPreview

const modes: ImageMode[] = [
  'top left',
  'top right',
  'bottom left',
  'bottom right',
  'right',
  'left',
  'center',
  'bottom',
  'top',
  'heightFix',
  'widthFix',
  'scaleToFill',
  'aspectFit',
  'aspectFill'
]
</script>

<style lang="scss" scoped>
.page-img {
  :deep(.demo-group-item__content) {
    overflow: hidden;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
  }

  &__grid--two {
    .page-img__col {
      width: 50%;
    }
  }

  &__col {
    box-sizing: border-box;
    width: 33.3333%;
    min-height: 1px;
    padding: 0 $padding-main $padding-super-loose;
  }

  &__text {
    margin-top: $spacing-tight;
    text-align: center;
  }

  &__error {
    width: 100%;
    height: 100%;
    line-height: 100px;
    text-align: center;
    color: $text-white;
    background-color: $danger-main;
  }
}
</style>
