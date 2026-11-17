<template>
  <page-wraper>
    <view class="page-circle">
      <wd-dialog selector="circle"></wd-dialog>

      <demo-group :title="$t('zu-jian-lei-xing')">
        <demo-group-item :title="$t('ji-chu-yong-fa')">
          <wd-circle custom-class="page-circle__circle" v-model="current" :text="current + '%'" />
          <wd-circle color="#F57F00" custom-class="page-circle__circle" v-model="current" :text="current + '%'" />
          <wd-circle color="#F14646" custom-class="page-circle__circle" v-model="current" :text="current + '%'" />
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('zu-jian-yang-shi')">
        <demo-group-item :title="$t('yang-shi-ding-zhi')">
          <wd-circle custom-class="page-circle__circle" v-model="current" :stroke-width="6" :text="$t('kuan-du-ding-zhi')" />
          <wd-circle custom-class="page-circle__circle" v-model="current" layer-color="#F2F3F5" color="#F14646" :text="$t('yan-se-ding-zhi')" />
          <wd-circle custom-class="page-circle__circle" v-model="current" :color="gradientColor" :text="$t('jian-bian-se')" />
          <wd-circle custom-class="page-circle__circle" v-model="current" color="#12B886" :clockwise="false" :text="$t('ni-shi-zhen')" />
          <wd-circle custom-class="page-circle__circle" v-model="current" :size="120" :text="$t('da-xiao-ding-zhi')" />
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('nei-rong-xing-tai')">
        <demo-group-item :title="$t('shi-yong-slot')">
          <wd-circle custom-class="page-circle__circle" v-model="current" :stroke-width="6">
            <view class="page-circle__value">{{ current }}%</view>
          </wd-circle>
        </demo-group-item>
      </demo-group>

      <demo-group :title="$t('te-shu-yang-shi')">
        <demo-group-item :title="$t('jin-du-kong-zhi')">
          <wd-button custom-style="margin-right:24rpx" type="primary" size="small" @click="doAdd">
            {{ $t('zeng-jia') }}
          </wd-button>
          <wd-button type="danger" size="small" @click="doDecre">{{ $t('jian-shao') }}</wd-button>
        </demo-group-item>
        <demo-group-item :title="$t('alert-yan-zheng-ceng-ji')">
          <wd-button @click="alert">alert</wd-button>
        </demo-group-item>
      </demo-group>
    </view>
  </page-wraper>
</template>
<script lang="ts" setup>
import { useDialog } from '@/uni_modules/wot-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const current = ref<number>(20)
const gradientColor: Record<string, string> = {
  '0': '#F14646',
  '100': '#FFFFFF'
}

function doAdd() {
  if (current.value < 100) {
    current.value += 10
  }
}

function doDecre() {
  if (current.value > 0) {
    current.value -= 10
  }
}

const dialog = useDialog('circle')

function alert() {
  dialog.alert(t('cao-zuo-cheng-gong'))
}
</script>
<style lang="scss" scoped>
.page-circle {
  :deep(.page-circle__circle) {
    margin-left: $spacing-ultra-loose;
  }

  &__value {
    color: $danger-main;
  }
}
</style>
