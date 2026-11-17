<template>
  <page-wraper>
    <view class="page-tooltip" @click="closeOutside">
      <demo-group :title="$t('zu-jian-lei-xing')" transparent>
        <demo-group-item :title="$t('jiBenYongFa')">
          <view class="page-tooltip__top">
            <wd-tooltip placement="bottom-start" content="bottom-start 提示文字" @change="handleChange1">
              <wd-button :round="false">bottom-start</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="bottom" content="bottom 提示文字" @change="handleChange2">
              <wd-button :round="false">bottom</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="bottom-end" content="bottom-end 提示文字" @change="handleChange3">
              <wd-button :round="false">bottom-end</wd-button>
            </wd-tooltip>
          </view>
          <view class="page-tooltip__left">
            <wd-tooltip placement="right-start" content="right-start 提示文字" @change="handleChange4">
              <wd-button :round="false">right-start</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="right" content="right 提示文字" custom-class="tooltip-middle-item" @change="handleChange5">
              <wd-button :round="false">right</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="right-end" content="right-end 提示文字" @change="handleChange6">
              <wd-button :round="false">right-end</wd-button>
            </wd-tooltip>
          </view>
          <view class="page-tooltip__right">
            <wd-tooltip placement="left-start" content="left-start 提示文字" @change="handleChange7">
              <wd-button :round="false">
                left-start
                <wd-icon name="setting" />
              </wd-button>
            </wd-tooltip>
            <wd-tooltip placement="left" content="left 提示文字" custom-class="tooltip-middle-item" @change="handleChange8">
              <wd-button :round="false">left</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="left-end" content="left-end 提示文字" @change="handleChange9">
              <wd-button :round="false">left-end</wd-button>
            </wd-tooltip>
          </view>
          <view class="page-tooltip__bottom">
            <wd-tooltip placement="top-start" content="top-start 提示文字" @change="handleChange10">
              <wd-button :round="false">top-start</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="top" content="top 提示文字" @change="handleChange11">
              <wd-button :round="false">top</wd-button>
            </wd-tooltip>
            <wd-tooltip placement="top-end" content="top-end 提示文字" @change="handleChange12">
              <wd-button :round="false">top-end</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-zhuang-tai')" transparent>
        <demo-group-item :title="$t('xian-shi-guan-bi-an-niu')">
          <view class="page-tooltip__demo-left">
            <wd-tooltip content="显示关闭按钮" placement="right" show-close @change="handleChange13">
              <wd-button :round="false">{{ $t('xian-shi-guan-bi-an-niu-0') }}</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('kong-zhi-xian-yin')">
          <view @click.stop="control">
            <wd-button plain size="small" class="page-tooltip__button-control">{{ show ? '关闭' : '打开' }}</wd-button>
          </view>
          <view class="page-tooltip__demo-left page-tooltip__demo-control">
            <wd-tooltip placement="top" content="控制显隐" v-model="show">
              <wd-button :round="false">top</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('jinYong')">
          <view class="page-tooltip__demo-left">
            <wd-tooltip placement="right-end" content="禁用" disabled @change="handleChange17">
              <wd-button :round="false">{{ $t('jinYong') }}</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('nei-rong-xing-tai')" transparent>
        <demo-group-item :title="$t('duo-hang-wen-ben')">
          <view class="page-tooltip__demo-left page-tooltip__lines-demo">
            <wd-tooltip placement="right" use-content-slot @change="handleChange14">
              <wd-button :round="false">{{ $t('duo-hang-wen-ben-0') }}</wd-button>
              <template #content>
                <view class="page-tooltip__lines-content">
                  <view>{{ $t('duo-hang-wen-ben-1') }}</view>
                  <view>{{ $t('duo-hang-wen-ben-2') }}</view>
                  <view>{{ $t('duo-hang-wen-ben-3') }}</view>
                </view>
              </template>
            </wd-tooltip>
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('te-shu-yang-shi')" transparent>
        <demo-group-item :title="$t('dong-tai-nei-rong-yu-wei-zhi-geng-xin')">
          <view class="page-tooltip__demo-left page-tooltip__lines-demo">
            <wd-tooltip placement="right" use-content-slot ref="tooltipRef">
              <template #content>
                <view class="page-tooltip__lines-content" :style="{ width: dynamicTooltipWidth + 'px' }">
                  <view class="page-tooltip__dynamic-width-label">{{ $t('dang-qian-kuan-du-dynamictooltipwidth-px', dynamicTooltipWidth) }}</view>
                  <wd-button custom-class="page-tooltip__action-button" size="small" @click="changeTooltipSize">
                    {{ $t('gai-bian-da-xiao') }}
                  </wd-button>
                </view>
              </template>
              <wd-button :round="false">{{ $t('dong-tai-nei-rong') }}</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('bang-ding-change-shi-jian')">
          <view class="page-tooltip__demo-left">
            <wd-tooltip placement="right-end" :content="content" @open="onShow" @close="onHide" @change="handleChange16">
              <wd-button :round="false">{{ $t('shi-jian-0') }}</wd-button>
            </wd-tooltip>
          </view>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import { useToast, useQueue } from '@/uni_modules/wot-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const show = ref<boolean>(false)
const content = ref<string>(t('xian-shi-nei-rong'))
const tooltipRef = ref()
const dynamicTooltipWidth = ref<number>(90)

const toast = useToast()

const { closeOutside } = useQueue()

function changeTooltipSize() {
  dynamicTooltipWidth.value = dynamicTooltipWidth.value === 90 ? 150 : 90
  setTimeout(() => {
    tooltipRef.value && tooltipRef.value.updatePosition()
  }, 50)
}

function control() {
  show.value = !show.value
}
function onShow() {
  console.log('显示')
}
function onHide() {
  toast.show(t('wen-zi-ti-shi-guan-bi'))
}
function handleChange1(event: any) {
  console.log(event)
}
function handleChange2(event: any) {
  console.log(event)
}
function handleChange3(event: any) {
  console.log(event)
}
function handleChange4(event: any) {
  console.log(event)
}
function handleChange5(event: any) {
  console.log(event)
}
function handleChange6(event: any) {
  console.log(event)
}
function handleChange7(event: any) {
  console.log(event)
}
function handleChange8(event: any) {
  console.log(event)
}
function handleChange9(event: any) {
  console.log(event)
}
function handleChange10(event: any) {
  console.log(event)
}
function handleChange11(event: any) {
  console.log(event)
}
function handleChange12(event: any) {
  console.log(event)
}
function handleChange13(event: any) {
  console.log(event)
}
function handleChange14(event: any) {
  console.log(event)
}
function handleChange15(event: any) {
  console.log(event)
}
function handleChange16(event: any) {
  console.log(event)
}
function handleChange17(event: any) {
  console.log(event)
}
</script>
<style lang="scss" scoped>
.page-tooltip {
  overflow: hidden;

  :deep() {
    .wd-button {
      min-width: auto;
    }
  }

  &__left {
    float: left;
    display: flex;
    flex-direction: column;
  }

  &__right {
    float: right;
    display: flex;
    flex-direction: column;
    margin-bottom: $spacing-super-loose;
    text-align: right;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    margin-top: $spacing-super-loose;
    margin-bottom: $spacing-super-loose;
  }

  &__bottom {
    clear: both;
    display: flex;
    justify-content: space-between;
    margin-top: $spacing-super-loose;
  }

  &__demo-left {
    text-align: left;
  }

  &__button-control {
    float: left;
  }

  &__demo-control {
    display: block;
    clear: both;
    margin-bottom: $spacing-main;
    padding-top: $n-18;
    text-align: center;
  }

  &__lines-demo {
    padding: $spacing-ultra-loose + $spacing-extra-tight 0;
  }

  &__lines-content {
    width: 90px;
    padding: $n-5;
    color: $text-main;
  }

  &__dynamic-width-label {
    margin-bottom: $spacing-main;
  }
}

:deep(.tooltip-middle-item) {
  margin: $spacing-super-loose 0;
}

:deep(.page-tooltip__action-button) {
  margin: 0 !important;
}
</style>
