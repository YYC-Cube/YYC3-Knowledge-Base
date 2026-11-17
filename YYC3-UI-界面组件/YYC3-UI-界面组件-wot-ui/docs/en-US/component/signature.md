# Signature

Used for signature scenarios, a signature component based on Canvas, supporting image export, history records, pen pressure effects, custom bottom operations, and more.

:::tip Reminder
If you encounter unclear exported images, you can set `export-scale` to `2` or higher.
:::

## Component Types

### Basic Usage

Set `@confirm` to listen for confirmation events and get signature results after confirmation.

```html
<wd-signature :export-scale="2" background-color="#ffffff" @confirm="handleConfirm" />
```

```ts
import type { SignatureResult } from '@/uni_modules/wot-ui/components/wd-signature/types'

function handleConfirm(result: SignatureResult) {
  if (result.success) {
    uni.previewImage({
      urls: [result.tempFilePath]
    })
  }
}
```

### History Records

After setting `enable-history`, undo and redo capabilities can be used.

```html
<wd-signature enable-history background-color="#f5f5f5" />
```

## Component Variants

### Pressure Mode

Set `pressure` to enable pressure-sensitive pen effects.

```html
<wd-signature pressure :height="300" />
```

### Pressure Mode Combined with History

The signature component supports enabling both `pressure` and `enable-history` for more complete signature scenarios.

```html
<wd-signature pressure enable-history :height="300" :min-width="1" :max-width="6" background-color="#f5f5f5" />
```

## Component Styles

### Custom Bottom Buttons

After setting the `footer` slot, the bottom operation area can be fully customized.

```html
<wd-signature :disabled="disabled" enable-history :step="3">
  <template #footer="{ clear, confirm, currentStep, restore, revoke, historyList }">
    <wd-button v-if="disabled" block @click="disabled = false">Start Signature</wd-button>
    <block v-else>
      <wd-button size="small" plain @click="revoke" :disabled="currentStep <= 0">Undo</wd-button>
      <wd-button size="small" plain @click="restore" :disabled="currentStep >= historyList.length">Redo</wd-button>
      <wd-button size="small" plain @click="clear">Clear</wd-button>
      <wd-button size="small" @click="confirm">Confirm</wd-button>
    </block>
  </template>
</wd-signature>
```

```ts
const disabled = ref(true)
```

### Custom Pen

Set pen color and width through `pen-color` and `line-width`.

```html
<wd-signature pen-color="#0083ff" :line-width="4" />
```

## Special Styles

### Using in Popup

The signature component can be combined with `wd-popup`. It is recommended to call the instance's `init` method after the popup is displayed.

::: code-group

```html [vue]
<wd-button type="primary" @click="showPopup = true">Open Signature Board</wd-button>

<wd-popup
  v-model="showPopup"
  closable
  safe-area-inset-bottom
  position="bottom"
  custom-style="padding: 48px 20px 20px 20px; border-radius: 16px 16px 0 0;"
  @after-enter="signatureRef?.init()"
>
  <wd-signature ref="signatureRef" :height="300" enable-history pressure background-color="#f5f5f5" @confirm="handlePopupConfirm" />
</wd-popup>
```

```ts [ts]
import { ref } from 'vue'
import type { SignatureInstance, SignatureResult } from '@/uni_modules/wot-ui/components/wd-signature/types'

const showPopup = ref(false)
const signatureRef = ref<SignatureInstance>()

function handlePopupConfirm(result: SignatureResult) {
  showPopup.value = false
  if (result.success) {
    uni.previewImage({
      urls: [result.tempFilePath]
    })
  }
}
```

:::

:::tip Tip
When using the signature board in a popup, it is recommended to:
1. Enable `closable` to show the close button.
2. Set `safe-area-inset-bottom` to adapt to the bottom safe area.
3. Use `custom-style` to adjust popup padding and leave space for the close button.
4. Call the signature board's `init` method in the popup's `after-enter` event to ensure correct initialization.
:::

### Landscape Signature

Supports the following two landscape signature implementation solutions:

#### 1. Universal Landscape Solution (Recommended)

Achieve landscape effects through custom layout and button rotation, suitable for all platforms.

:::tip Implementation Notes
Universal landscape solution features:
1. Uses fixed layout with rotation to achieve left-side vertical button bar
2. Customizes operation buttons through footer slot
3. Uses transform to achieve button rotation effects
4. Consistent implementation across all platforms
5. It is recommended to use the `inited` variable with delayed loading to avoid canvas initialization issues
:::

::: code-group

```html [vue]
<template>
  <view class="landscape-signature">
    <wd-signature
      v-if="inited"
      :height="height"
      :width="width"
      enable-history
      pressure
      background-color="#f5f5f5"
      @confirm="handleConfirm"
    >
      <template #footer="{ clear, confirm, restore, revoke, canUndo, canRedo }">
        <view class="custom-actions">
          <view class="button-group">
            <wd-button size="small" plain @click="revoke" :disabled="!canUndo">Undo</wd-button>
            <wd-button size="small" plain @click="restore" :disabled="!canRedo">Redo</wd-button>
            <wd-button size="small" plain @click="clear">Clear</wd-button>
            <wd-button size="small" type="primary" @click="confirm">Done</wd-button>
          </view>
        </view>
      </template>
    </wd-signature>
  </view>
</template>
```

```ts [ts]
import { pause } from '@/uni_modules/wot-ui/common/util'

const height = ref(0)
const width = ref(0)
const inited = ref(false)

onMounted(() => {
  const { windowWidth, windowHeight } = uni.getSystemInfoSync()
  width.value = windowWidth - 48
  height.value = windowHeight - 48
  
  pause(100).then(() => {
    inited.value = true
  })
})
```

```scss [css]
.landscape-signature {
  height: 100vh;
  // #ifdef H5
  height: calc(100vh - 44px);
  // #endif
  background: #fff;
  position: relative;
  padding: 24px 0;
  padding-left: 48px;
  box-sizing: border-box;

  .custom-actions {
    position: fixed;
    left: 0;
    top: 50%;
    width: 48px;
    transform: translateY(-50%) rotate(90deg);
    transform-origin: center;
    z-index: 10;

    .button-group {
      display: flex;
      flex-direction: row;
      gap: 12px;
      white-space: nowrap;
      width: max-content;
      transform: translateX(-50%);
    }
  }
}
```
:::


#### 2. Native Landscape Solution (WeChat Mini Program Only)

WeChat Mini Program provides native landscape support. When using it, you need to distinguish between platforms:

:::warning Notes
1. The `pageOrientation` configuration only takes effect in WeChat Mini Program
2. Use conditional compilation to distinguish layout structures for different platforms
3. WeChat Mini Program pages will rotate automatically, button layout does not require special handling
4. When reserving space for bottom buttons, consider the landscape layout
5. For other platforms, please use the universal landscape solution
:::

::: code-group

```json [json]
{
  "path": "pages/signature/landscape",
  "style": {
    "navigationBarTitleText": "Landscape Signature",
    // #ifdef MP-WEIXIN
    "pageOrientation": "landscape"
    // #endif
  }
}
```

```html [vue]
<template>
  <view class="landscape-signature">
    <wd-signature
      v-if="inited"
      ref="signatureRef"
      :height="height" 
      :width="width"
      enable-history
      pressure
      background-color="#f5f5f5"
      @confirm="handleConfirm"
    >
    </wd-signature>
  </view>
</template>
```

```ts [ts]
import { pause } from '@/uni_modules/wot-ui/common/util'

const height = ref(0)
const width = ref(0)
const inited = ref(false)

onMounted(() => {
  const { windowWidth, windowHeight } = uni.getSystemInfoSync()
  width.value = windowWidth
  height.value = windowHeight - 60 // Reserve space for bottom buttons

  pause(100).then(() => {
    inited.value = true
  })
})
```

```scss [css]
.landscape-signature {
  height: 100vh;
  background: #fff;
  position: relative;
  box-sizing: border-box;

  // #ifdef MP-WEIXIN
  padding: 0;
  display: flex;
  flex-direction: column;

  .weixin-actions {
    padding: 12px;
    background-color: #f8f8f8;
    
    .button-group {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }
  // #endif
}
```
:::


## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| pen-color | Signature pen color | `string` | `'#000'` |
| line-width | Signature pen width | `number` | `3` |
| confirm-text | Confirm button text | `string` | Built-in text |
| clear-text | Clear button text | `string` | Built-in text |
| revoke-text | Revoke button text | `string` | Built-in text |
| restore-text | Restore button text | `string` | Built-in text |
| file-type | Exported image type, optional values are `png`, `jpg` | `'png' \| 'jpg'` | `'png'` |
| quality | Exported image quality, value range is `0` to `1` | `number` | `1` |
| export-scale | Exported image scale ratio | `number` | `1` |
| disabled | Whether to disable the signature board | `boolean` | `false` |
| height | Canvas height | `string \| number` | - |
| width | Canvas width | `string \| number` | - |
| background-color | Canvas background color | `string` | - |
| disable-scroll | Whether to disable canvas scrolling | `boolean` | `true` |
| enable-history | Whether to enable history records | `boolean` | `false` |
| step | Undo and redo step size | `number` | `1` |
| undo-text | Undo button text | `string` | Built-in text |
| redo-text | Redo button text | `string` | Built-in text |
| pressure | Whether to enable pressure mode | `boolean` | `false` |
| max-width | Maximum stroke width in pressure mode | `number` | `6` |
| min-width | Minimum stroke width in pressure mode | `number` | `2` |
| min-speed | Minimum speed threshold in pressure mode | `number` | `1.5` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

## Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| start | Triggered when signature starts | event |
| end | Triggered when signature ends | event |
| signing | Continuously triggered during signature process | event |
| confirm | Triggered when signature is confirmed | `SignatureResult` |
| clear | Triggered when signature is cleared | - |

## Methods

| Method Name | Description | Parameters |
| --- | --- | --- |
| init | Initialize signature board | `forceUpdate?: boolean` |
| confirm | Confirm and export signature image | - |
| clear | Clear signature | - |
| restore | Restore previous step | - |
| revoke | Revoke previous step | - |

## Slots

| Name | Description | Parameters |
| --- | --- | --- |
| footer | Custom bottom operation area | `{ clear, confirm, currentStep, revoke, restore, canUndo, canRedo, historyList }` |
