# IndexBar

Used for index classification display and quick positioning of lists.

## Component Type

### Basic Usage

Use a fixed-height element to wrap the `wd-index-bar` component. The component's width and height will be the same as the wrapping element.

Use `wd-index-anchor` as a child component. It will generate anchors and a sidebar based on the anchor component's `index` property.

```vue
<template>
  <view class="wraper">
    <wd-index-bar sticky>
      <view v-for="item in data" :key="item.index">
        <wd-index-anchor :index="item.index" />
        <wd-cell border clickable v-for="city in item.data" :key="city" :title="city" @click="handleClick(item.index, city)"></wd-cell>
      </view>
    </wd-index-bar>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const data = ref([
  {
    index: 'A',
    data: ['Aba', 'Alxa', 'Ali', 'Ankang', 'Anqing', 'Anshan', 'Anshun', 'Anyang', 'Macau']
  },
  {
    index: 'B',
    data: ['Beijing', 'Baiyin', 'Baoding', 'Baoji', 'Baoshan', 'Baotou', 'Bazhong', 'Beihai', 'Bengbu', 'Benxi', 'Bijie', 'Binzhou', 'Baise', 'Bozhou']
  },
  {
    index: 'C',
    data: [
      'Chongqing',
      'Chengdu',
      'Changsha',
      'Changchun',
      'Cangzhou',
      'Changde',
      'Chamdo',
      'Changzhi',
      'Changzhou',
      'Chaohu',
      'Chaozhou',
      'Chengde',
      'Chenzhou',
      'Chifeng',
      'Chizhou',
      'Chongzuo',
      'Chuxiong',
      'Chuzhou',
      'Chaoyang'
    ]
  },
  {
    index: 'D',
    data: ['Dalian', 'Dongguan', 'Dali', 'Dandong', 'Daqing', 'Datong', 'Daxinganling', 'Dehong', 'Deyang', 'Dezhou', 'Dingxi', 'Diqing', 'Dongying']
  },
  {
    index: 'E',
    data: ['Ordos', 'Enshi', 'Ezhou']
  },
  {
    index: 'F',
    data: ['Fuzhou', 'Fangchenggang', 'Foshan', 'Fushun', 'Fuzhou', 'Fuxin', 'Fuyang']
  },
  {
    index: 'G',
    data: ['Guangzhou', 'Guilin', 'Guiyang', 'Gannan', 'Ganzhou', 'Ganzi', 'Guangan', 'Guangyuan', 'Guigang', 'Guoluo']
  },
  {
    index: 'H',
    data: [
      'Hangzhou',
      'Harbin',
      'Hefei',
      'Haikou',
      'Hohhot',
      'Haibei',
      'Haidong',
      'Hainan',
      'Haixi',
      'Handan',
      'Hanzhong',
      'Hebi',
      'Hechi',
      'Hegang',
      'Heihe',
      'Hengshui',
      'Hengyang',
      'Heyuan',
      'Hezhou',
      'Honghe',
      'Huai'an',
      'Huaibei',
      'Huaihua',
      'Huainan',
      'Huanggang',
      'Huangnan',
      'Huangshan',
      'Huangshi',
      'Huizhou',
      'Huludao',
      'Hulunbuir',
      'Huzhou',
      'Heze'
    ]
  }
])

function handleClick(index: string, city: string) {
  console.log(`Current clicked item: ${index}, City: ${city}`)
}
</script>

<style lang="scss">
.wraper {
  height: calc(100vh - var(--window-top));
  height: calc(100vh - var(--window-top) - constant(safe-area-inset-bottom));
  height: calc(100vh - var(--window-top) - env(safe-area-inset-bottom));
}
</style>
```

## Special Usage

### Update List Data

The current example page only provides basic usage demonstrations. If your list data needs to be dynamically updated, you can refer to the following extended example, used in conjunction with the `wd-search` component:

::: details View Update List Data Example
::: code-group

```html [vue/html]
<template>
  <view>
    <wd-search hide-cancel placeholder="Where do I want to go?" v-model="keyword" @search="handleSearch" @clear="handleClear" />
    <view class="wraper">
      <wd-index-bar sticky v-if="showList.length">
        <view v-for="item in showList" :key="item.index">
          <wd-index-anchor :index="item.index" />
          <wd-cell border clickable v-for="city in item.data" :key="city" :title="city" @click="handleClick(item.index, city)"></wd-cell>
        </view>
      </wd-index-bar>
    </view>
  </view>
</template>
```

```typescript [typescript]
<script lang="ts" setup>
import { useToast } from '@/uni_modules/wot-ui'
import { nextTick, onMounted, ref } from 'vue'

const { show: showToast } = useToast()
const keyword = ref('')
const showList = ref<any>([])

const indexList = [
  {
    index: 'A',
    data: ['Aba', 'Alxa', 'Ali', 'Ankang', 'Anqing', 'Anshan', 'Anshun', 'Anyang', 'Macau']
  },
  {
    index: 'B',
    data: ['Beijing', 'Baiyin', 'Baoding', 'Baoji', 'Baoshan', 'Baotou', 'Bazhong', 'Beihai', 'Bengbu', 'Benxi', 'Bijie', 'Binzhou', 'Baise', 'Bozhou']
  },
  {
    index: 'C',
    data: [
      'Chongqing',
      'Chengdu',
      'Changsha',
      'Changchun',
      'Cangzhou',
      'Changde',
      'Chamdo',
      'Changzhi',
      'Changzhou',
      'Chaohu',
      'Chaozhou',
      'Chengde',
      'Chenzhou',
      'Chifeng',
      'Chizhou',
      'Chongzuo',
      'Chuxiong',
      'Chuzhou',
      'Chaoyang'
    ]
  },
  {
    index: 'D',
    data: ['Dalian', 'Dongguan', 'Dali', 'Dandong', 'Daqing', 'Datong', 'Daxinganling', 'Dehong', 'Deyang', 'Dezhou', 'Dingxi', 'Diqing', 'Dongying']
  },
  {
    index: 'E',
    data: ['Ordos', 'Enshi', 'Ezhou']
  },
  {
    index: 'F',
    data: ['Fuzhou', 'Fangchenggang', 'Foshan', 'Fushun', 'Fuzhou', 'Fuxin', 'Fuyang']
  },
  {
    index: 'G',
    data: ['Guangzhou', 'Guilin', 'Guiyang', 'Gannan', 'Ganzhou', 'Ganzi', 'Guangan', 'Guangyuan', 'Guigang', 'Guoluo']
  },
  {
    index: 'H',
    data: [
      'Hangzhou',
      'Harbin',
      'Hefei',
      'Haikou',
      'Hohhot',
      'Haibei',
      'Haidong',
      'Hainan',
      'Haixi',
      'Handan',
      'Hanzhong',
      'Hebi',
      'Hechi',
      'Hegang',
      'Heihe',
      'Hengshui',
      'Hengyang',
      'Heyuan',
      'Hezhou',
      'Honghe',
      'Huai\'an',
      'Huaibei',
      'Huaihua',
      'Huainan',
      'Huanggang',
      'Huangnan',
      'Huangshan',
      'Huangshi',
      'Huizhou',
      'Huludao',
      'Hulunbuir',
      'Huzhou',
      'Heze'
    ]
  }
]

onMounted(() => {
  handleSearch()
})

function handleClick(index: string, city: string) {
  showToast(`Current clicked item: ${index}, City: ${city}`)
}

function handleSearch() {
  showList.value = []
  nextTick(() => {
    if (keyword.value) {
      showList.value = indexList.filter((item) => {
        return item.data.some((city) => {
          return city.includes(keyword.value)
        })
      })
    } else {
      showList.value = indexList
    }
  })
}

function handleClear() {
  keyword.value = ''
  handleSearch()
}
</script>
```

```css [css]
.wraper {
  height: calc(100vh - var(--window-top) - 54px);
  height: calc(100vh - var(--window-top) - constant(safe-area-inset-bottom) - 54px);
  height: calc(100vh - var(--window-top) - env(safe-area-inset-bottom) - 54px);
}
```

:::

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| sticky | Whether the index sticks to the top | `boolean` | `false` |

## Slots

| name | Description |
| --- | --- |
| default | Customize index list content |

## IndexAnchor Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| index | Index character | `string \| number` | - |
| custom-style | Root node custom style | `string` | - |
| custom-class | Root node custom class name | `string` | - |

## IndexAnchor Slots

| name | Description |
| --- | --- |
| default | Customize content |
