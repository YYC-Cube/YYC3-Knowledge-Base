# Resize

When the document flow size wrapped by the component changes, the `resize` event is triggered. Generally used to listen for size and position information changes caused by content updates, and then recalculate the layout based on this.

## Component Types

### Basic Usage

Do not add additional layout styles to `wd-resize` itself, but place the content to be monitored in the default slot.

::: code-group

```html [vue]
<wd-resize @resize="handleResize">
  <view :style="{ background: '#4d80f0', width, height }"></view>
</wd-resize>
```

```ts [ts]
import { onReady } from '@dcloudio/uni-app'
import { ref } from 'vue'

const width = ref('')
const height = ref('')

onReady(() => {
  setTimeout(() => {
    width.value = '100px'
    height.value = '100px'
  }, 1500)
})

function handleResize(detail: Record<string, string | number>) {
  const { height, width, top, right, bottom, left } = detail
}
```

:::

## Resize Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| custom-style | Custom root node style | `string` | `''` |
| custom-class | Custom root node style class | `string` | `''` |
| custom-container-class | Custom container style class | `string` | `''` |

## Resize Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| resize | Triggered when size changes | <code>{ width: number; height: number; top: number; right: number; bottom: number; left: number }</code> |

## Resize Slots

| Name | Description |
| --- | --- |
| default | Content that needs to listen for size changes |
