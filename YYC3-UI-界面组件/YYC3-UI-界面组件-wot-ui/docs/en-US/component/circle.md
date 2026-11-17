# Circle

Circular progress bar component, supporting color customization, gradient colors, direction control and slot content.

## Component Type

### Basic Usage

Bind current progress through `v-model`, control center text through `text`.

```html
<wd-circle v-model="current" :text="`${current}%`" />
```

## Component Style

### Width Control

Control progress bar width through `stroke-width`.

```html
<wd-circle v-model="current" :stroke-width="6" />
```

### Color Customization

Control progress bar color through `color`, control track color through `layer-color`.

```html
<wd-circle v-model="current" color="#ee0a24" layer-color="#eee" />
```

### Gradient Color

`color` supports object format to define gradient colors.

```html
<wd-circle v-model="current" :color="gradientColor" />
```

```ts
const gradientColor = {
  '0': 'red',
  '100': 'white'
}
```

### Counter-clockwise Direction

Set `clockwise` to `false`, progress expands from counter-clockwise direction.

```html
<wd-circle v-model="current" :clockwise="false" />
```

### Size Customization

Control circle diameter through `size`.

```html
<wd-circle v-model="current" :size="120" />
```

## Content Form

### Use Default Slot

When `text` is not passed, default slot can be used to customize center content.

```html
<wd-circle v-model="current" :stroke-width="6">
  <view style="color: red">{{ current }}%</view>
</wd-circle>
```

## Special Style

### Progress Control

```html
<wd-button type="primary" size="small" @click="doAdd">Increase</wd-button>
<wd-button type="danger" size="small" @click="doDecre">Decrease</wd-button>
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| v-model | Current progress | number | 0 |
| size | Circle diameter, unit px | number | 120 |
| color | Progress bar color, supports string or gradient object | `string \| Record<string, string>` | `#1C64FD` |
| layer-color | Track color | string | `#F2F3F5` |
| fill | Fill color | string | - |
| speed | Animation speed, unit rate/s | number | 50 |
| text | Circle center text | string | - |
| stroke-width | Progress bar width, unit px | number | 18 |
| stroke-linecap | Endpoint shape, optional values are `butt`, `round`, `square` | string | round |
| clockwise | Whether to increase clockwise | boolean | true |
| custom-class | Root node custom class name | string | `''` |
| custom-style | Root node custom style | string | `''` |

## Slots

| name | Description | Parameters |
| --- | --- | --- |
| default | Custom circle center content (only displayed when `text` is empty) | - |
