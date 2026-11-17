<!--
 * @Author: weisheng
 * @Date: 2025-08-25 17:12:16
 * @LastEditTime: 2026-04-08 13:58:22
 * @LastEditors: weisheng
 * @Description: 
 * @FilePath: /wot-ui/docs/en-US/component/root-portal.md
 * 记得注释
-->
# Root Portal

Detaches content from the page structure, used to solve various `fixed` positioning issues. Mainly used for creating modals, popups, and other overlay components.

:::tip Tip
The Root Portal component only supports `WeChat Mini Program`, `Alipay Mini Program`, `APP`, and `H5` platforms. The component automatically selects the appropriate implementation based on the platform:

- **H5**: Uses the `teleport` feature
- **WeChat and Alipay Mini Programs**: Uses the `root-portal` component
- **App**: Uses renderjs implementation
- **Other platforms**: This feature is not supported

This feature is mainly used to solve z-index and positioning issues for popups in complex layouts. It is recommended to use only when necessary.
:::

## Component Types

### Basic Usage

Use `wd-root-portal` to render content to the root node, avoiding parent component style interference.

```html
<wd-button type="primary" @click="show = true">Show Modal</wd-button>

<wd-root-portal v-if="show">
  <view class="modal">
    <view class="modal-content">
      <text>This is a global modal</text>
      <wd-button @click="show = false">Close</wd-button>
    </view>
  </view>
</wd-root-portal>
```

```scss
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 280px;
  text-align: center;
}
```

## Special Styles

### Using with Popup Components

Some popup components natively support the `root-portal` attribute, such as `wd-select-picker`. In these scenarios, an external trigger is still needed to control the popup visibility, and then the root portal capability is enabled through the component attribute.

```html
<wd-cell title="Select Category" :value="selectedLabel" is-link @click="showPicker = true" />
<wd-select-picker v-model="value" v-model:visible="showPicker" :columns="columns" root-portal @confirm="handleConfirm" />
```

```typescript
import { ref } from 'vue'

const showPicker = ref(false)
const value = ref<string[]>([])
const selectedLabel = ref('')
const columns = ref([
  { value: '101', label: 'Men\'s Clothing' },
  { value: '102', label: 'Luxury' },
  { value: '103', label: 'Women\'s Clothing' }
])

function handleConfirm({ value }: { value: string[] }) {
  selectedLabel.value = columns.value
    .filter((item) => value.includes(item.value))
    .map((item) => item.label)
    .join('、')
}
```

## Slots

| Name | Description |
| --- | --- |
| default | Default slot for rendering the portal content |
