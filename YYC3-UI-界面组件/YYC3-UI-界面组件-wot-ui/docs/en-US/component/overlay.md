# Overlay

Create an overlay layer to emphasize specific page elements and prevent users from performing other operations.

## Basic Usage

### Basic Component

Use `show` to control the display/hide of the overlay layer.

```html
<wd-button type="primary" @click="show = true">Show Overlay</wd-button>
<wd-overlay :show="show" @click="show = false" />
```

## Special Styles

### Embedded Content

You can embed any content on the overlay layer through the default slot.

::: code-group

```html
<wd-button type="primary" @click="show = true">Embedded Content</wd-button>
<wd-overlay :show="show" @click="show = false">
  <view class="wrapper">
    <view class="block" @click.stop="" />
  </view>
</wd-overlay>
```

```scss
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.block {
  width: 120px;
  height: 120px;
  background-color: #fff;
}
```

:::

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| show | Whether to display the overlay layer | `boolean` | `false` |
| duration | Animation duration, in milliseconds | <code>Record&lt;string, number&gt; &#124; number &#124; boolean</code> | `300` |
| lock-scroll | Whether to lock background scrolling; when locked, content within the overlay will also be unable to scroll | `boolean` | `true` |
| z-index | Z-index level | `number` | `10` |
| custom-style | Root node style | `string` | `''` |
| custom-class | Root node style class name | `string` | `''` |

## Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| click | Triggered when clicking the overlay layer | - |
| before-enter | Triggered before enter animation starts | - |
| enter | Triggered when enter animation starts | - |
| after-enter | Triggered after enter animation ends | - |
| before-leave | Triggered before leave animation starts | - |
| leave | Triggered when leave animation starts | - |
| after-leave | Triggered after leave animation ends | - |

## Slots

| Name | Description |
| --- | --- |
| default | Overlay layer content |
