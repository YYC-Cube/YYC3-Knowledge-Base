<template>
  <page-wraper>
    <view class="page-progress">
      <demo-group :title="$t('zu-jian-lei-xing')">
        <demo-group-item :title="$t('jiBenYongFa')">
          <wd-progress :percentage="basePercentage" />
        </demo-group-item>
        <demo-group-item :title="$t('nei-zhi-bai-fen-bi')">
          <view v-for="item in innerItems" :key="item.key" class="page-progress__row">
            <wd-progress :percent-position="item.percentPosition" :percentage="item.percentage" :status="item.status" />
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-zhuang-tai')">
        <demo-group-item :title="$t('jin-du-tiao-zhuang-tai')">
          <view v-for="item in statusItems" :key="item.status" class="page-progress__row">
            <wd-progress :percentage="basePercentage" :status="item.status" hide-text />
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-yang-shi')">
        <demo-group-item :title="$t('bu-xian-shi-jin-du-wen-zi')">
          <wd-progress :percentage="basePercentage" hide-text />
        </demo-group-item>
        <demo-group-item :title="$t('xiu-gai-yan-se')">
          <view v-for="item in solidColorItems" :key="item.color" class="page-progress__row">
            <wd-progress :percentage="basePercentage" :color="item.color" />
          </view>
        </demo-group-item>
        <demo-group-item :title="$t('yan-se-shu-zu')">
          <view class="page-progress__row">
            <wd-progress :percentage="basePercentage" :color="gradientColors" />
          </view>
          <view class="page-progress__row">
            <wd-progress :percentage="basePercentage" :color="colorObject" />
          </view>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('te-shu-yang-shi')">
        <demo-group-item :title="$t('dong-tai-kong-zhi')">
          <wd-progress :percentage="interactivePercentage" />
          <view class="page-progress__actions">
            <wd-button custom-class="page-progress__button" type="danger" size="small" @click="reduce">-10</wd-button>
            <wd-button type="success" size="small" @click="add">+10</wd-button>
          </view>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>

<script lang="ts" setup>
import type { ProgressColor, ProgressStatus } from '@/uni_modules/wot-ui/components/wd-progress/types'
import { ref } from 'vue'

const basePercentage = 50
const interactivePercentage = ref<number>(50)

const innerItems = [
  {
    key: 'inner-center',
    percentPosition: { type: 'inner', align: 'center' },
    percentage: basePercentage,
    status: undefined
  },
  {
    key: 'inner-right',
    percentPosition: { type: 'inner', align: 'right' },
    percentage: basePercentage,
    status: 'success'
  },
  {
    key: 'inner-left',
    percentPosition: { type: 'inner', align: 'left' },
    percentage: basePercentage,
    status: 'danger'
  },
  {
    key: 'inner-zero',
    percentPosition: { type: 'inner', align: 'center' },
    percentage: 0,
    status: undefined
  }
] as const

const statusItems: Array<{ status: ProgressStatus }> = [{ status: 'success' }, { status: 'danger' }, { status: 'warning' }]

const solidColorItems = [
  { color: 'var(--wot-primary-6, #0083ff)' },
  { color: 'var(--wot-success-main, #00c740)' },
  { color: 'var(--wot-warning-main, #ffb300)' }
] as const

const gradientColors: string[] = [
  'var(--wot-success-main, #00c740)',
  'var(--wot-warning-main, #ffb300)',
  'var(--wot-danger-main, #e2231a)',
  'var(--wot-primary-6, #0083ff)'
]

const colorObject: ProgressColor[] = [
  {
    color: 'var(--wot-warning-main, #ffb300)',
    percentage: 30
  },
  {
    color: 'var(--wot-danger-main, #e2231a)',
    percentage: 60
  },
  {
    color: 'var(--wot-primary-6, #0083ff)',
    percentage: 80
  },
  {
    color: 'var(--wot-text-main, #000000)',
    percentage: 90
  }
]

function add() {
  interactivePercentage.value = Math.min(interactivePercentage.value + 10, 100)
}

function reduce() {
  interactivePercentage.value = Math.max(interactivePercentage.value - 10, 0)
}
</script>

<style lang="scss" scoped>
.page-progress {
  &__row {
    margin-bottom: $spacing-loose;
  }

  &__row:last-child {
    margin-bottom: 0;
  }

  &__actions {
    display: flex;
    justify-content: center;
    margin-top: $spacing-ultra-loose;
  }

  :deep(.page-progress__button) {
    margin-right: $spacing-main;
  }
}
</style>
