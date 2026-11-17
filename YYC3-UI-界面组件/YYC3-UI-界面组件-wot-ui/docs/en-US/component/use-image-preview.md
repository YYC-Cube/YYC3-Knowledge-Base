# useImagePreview

`useImagePreview` is used to programmatically call `wd-image-preview`.

## Basic Usage

First declare `wd-image-preview` in the page, then open image preview via `useImagePreview()`.

```html
<wd-image-preview />
<wd-button @click="openPreview">Preview Image</wd-button>
```

```ts
import { useImagePreview } from '@/uni_modules/wot-ui'

const { previewImage } = useImagePreview()

const openPreview = () => {
  previewImage({
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ],
    startPosition: 0
  })
}
```

## Pass Image Array

You can directly pass an image URL array to simplify the calling method.

```typescript
previewImage([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg'
])
```

## Multiple Instance Calls

Use `selector` to distinguish between multiple instances on the page. `useImagePreview(selector)` will bind to the specified instance. The `selector` value must match the `selector` attribute on the `wd-image-preview` component.

```html
<wd-button @click="handleSlotPreview">Custom Slot</wd-button>

<wd-image-preview selector="slot-preview">
  <!-- Custom indicator -->
  <template #indicator="{ current, total }">
    <wd-swiper-nav :current="current" :total="total" type="dots-bar" custom-style="bottom: 64px;" />
  </template>
  <!-- Bottom custom content -->
  <template #default="{ current }">
    <view class="custom-bottom">
      <text class="custom-bottom__text">{{ imageDescriptions[current] }}</text>
    </view>
  </template>
</wd-image-preview>
```

```typescript
import { useImagePreview } from '@/uni_modules/wot-ui'

const { previewImage } = useImagePreview('slot-preview')

const images = [
  'https://wot-ui.cn/assets/redpanda.jpg',
  'https://wot-ui.cn/assets/capybara.jpg'
]

const imageDescriptions = ['Red Panda', 'Capybara']

function handleSlotPreview() {
  previewImage({
    images,
    showIndex: false // Hide default indicator
  })
}
```

## API

### useImagePreview

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| selector | Specifies the image preview instance identifier, uses default instance when empty string | string | `''` |

### Methods

The object returned by the programmatic call contains the following methods:

| Method Name | Description | Parameters |
| --- | --- | --- |
| previewImage | Open image preview | `options: ImagePreviewOptions` \| `string[]` |
| closeImagePreview | Close image preview | - |

### ImagePreviewOptions

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| images | Image URL array | `string[]` | `[]` |
| startPosition | Starting position index | `number` | `0` |
| showIndex | Whether to show page number | `boolean` | `true` |
| loop | Whether to loop playback | `boolean` | `true` |
| closeable | Whether to show close button | `boolean` | `true` |
| closeIcon | Close icon name | `string` | `close` |
| closeIconPosition | Close icon position, optional values are `top-left`, `top-right` | `string` | `top-right` |
| closeOnClick | Whether to close when clicking image or mask | `boolean` | `true` |
| showMenuByLongpress | Enable long press image to show recognize mini program code menu | `boolean` | `true` |
| zIndex | zIndex level | `number` | `1000` |
| onOpen | Callback when opening | `() => void` | - |
| onClose | Callback when closing | `() => void` | - |
| onChange | Callback when switching images | `(index: number) => void` | - |
| onLongPress | Callback when long pressing image | `(image: string) => void` | - |
