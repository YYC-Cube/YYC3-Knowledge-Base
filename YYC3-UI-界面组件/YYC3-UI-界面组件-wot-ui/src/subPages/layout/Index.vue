<template>
  <page-wraper>
    <view class="page-layout">
      <demo-group :title="$t('bu-ju-neng-li')">
        <demo-group-item :title="$t('ji-chu-yong-fa-0')">
          <wd-row>
            <wd-col :span="24"><view class="page-layout__cell page-layout__cell--primary">span: 24</view></wd-col>
          </wd-row>
          <wd-row>
            <wd-col :span="12"><view class="page-layout__cell page-layout__cell--strong">span: 12</view></wd-col>
            <wd-col :span="12"><view class="page-layout__cell page-layout__cell--light">span: 12</view></wd-col>
          </wd-row>
          <wd-row>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong">span: 8</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--light">span: 8</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong">span: 8</view></wd-col>
          </wd-row>
          <wd-row>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">span: 6</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">span: 6</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">span: 6</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">span: 6</view></wd-col>
          </wd-row>
        </demo-group-item>

        <demo-group-item :title="$t('fen-lan-pian-yi')">
          <wd-row>
            <wd-col :span="4"><view class="page-layout__cell page-layout__cell--strong">span: 4</view></wd-col>
            <wd-col :span="8" :offset="4"><view class="page-layout__cell page-layout__cell--light">span: 8 offset: 4</view></wd-col>
          </wd-row>
          <wd-row>
            <wd-col :span="8" :offset="4"><view class="page-layout__cell page-layout__cell--strong">span: 8 offset: 4</view></wd-col>
            <wd-col :span="8" :offset="4"><view class="page-layout__cell page-layout__cell--light">span: 8 offset: 4</view></wd-col>
          </wd-row>
        </demo-group-item>

        <demo-group-item :title="$t('fen-lan-jian-ge')">
          <wd-row :gutter="20">
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong">span: 8</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--light">span: 8</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong">span: 8</view></wd-col>
          </wd-row>
        </demo-group-item>

        <demo-group-item :title="$t('justify-dui-qi')">
          <wd-row justify="center">
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">center</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">center</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">center</view></wd-col>
          </wd-row>
          <wd-row justify="end">
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">end</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">end</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">end</view></wd-col>
          </wd-row>
          <wd-row justify="space-between">
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">between</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">between</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">between</view></wd-col>
          </wd-row>
          <wd-row justify="space-around">
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">around</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--light">around</view></wd-col>
            <wd-col :span="6"><view class="page-layout__cell page-layout__cell--strong">around</view></wd-col>
          </wd-row>
        </demo-group-item>

        <demo-group-item :title="$t('align-dui-qi')">
          <wd-row align="middle" class="page-layout__row-align">
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong page-layout__cell--tall">middle</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--light">middle</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong page-layout__cell--medium">middle</view></wd-col>
          </wd-row>
          <wd-row align="bottom" class="page-layout__row-align">
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong page-layout__cell--tall">bottom</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--light">bottom</view></wd-col>
            <wd-col :span="8"><view class="page-layout__cell page-layout__cell--strong page-layout__cell--medium">bottom</view></wd-col>
          </wd-row>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup></script>
<style lang="scss" scoped>
.page-layout {
  &__cell {
    margin-bottom: $spacing-main;
    min-height: 30px;
    border-radius: $radius-main;
    color: $text-secondary;
    font-size: $typography-label-size-main;
    line-height: 30px;
    text-align: center;
  }

  &__cell--primary {
    color: $text-white;
    background: $primary-6;
  }

  &__cell--strong {
    background: $filled-strong;
  }

  &__cell--light {
    background: $filled-content;
  }

  &__cell--tall {
    min-height: 60px;
    line-height: 60px;
  }

  &__cell--medium {
    min-height: 50px;
    line-height: 50px;
  }

  &__row-align {
    .page-layout__cell {
      margin-bottom: $spacing-main;
    }
  }
}
</style>
