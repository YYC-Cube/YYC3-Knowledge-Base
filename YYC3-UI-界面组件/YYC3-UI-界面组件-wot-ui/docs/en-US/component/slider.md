# Slider

Supports single-direction slider and dual-direction slider, can be used to select a value or a range within a range.

## Component Types

### Basic Usage

`v-model` is the binding value. When the value is `number`, one slider is displayed.

```html
<wd-slider v-model="value" />
```

```ts
const value = ref<number>(30)
```

### Dual Slider

After setting `range`, the binding value becomes an array type.

```html
<wd-slider v-model="value" range />
```

```ts
const value = ref<number[]>([20, 60])
```

## Component States

### Disabled State

Set `disabled` to disable the slider.

```html
<wd-slider v-model="value" disabled />
```

## Component Styles

### Show Extreme Values

Set `show-extreme-value` to display the minimum and maximum values.

```html
<wd-slider v-model="value" show-extreme-value />
```

### Capsule Style

Set `theme="capsule"` to use the capsule style.

```html
<wd-slider v-model="value" theme="capsule" />
```

### Specify Step Size

Set the step size through `step`.

```html
<wd-slider v-model="value" :step="10" />
```

### Specify Selection Range

Set the value range through `min` and `max`.

```html
<wd-slider v-model="value" :min="-10" :max="10" show-extreme-value />
```

### Scale Marks

Configure scale marks through `marks`.

```html
<wd-slider v-model="value" :marks="[0, 25, 50, 75, 100]" :step="25" />
```

### Scale Marks (Capsule)

Scale marks can also be combined with the capsule style.

```html
<wd-slider v-model="value" :marks="[0, 25, 50, 75, 100]" :step="25" theme="capsule" />
```

## Layout Capabilities

### Vertical Direction

Set `vertical` to display in vertical direction.

```html
<wd-slider v-model="value" vertical />
<wd-slider v-model="rangeValue" vertical range />
```

### Vertical + Capsule

Vertical direction supports combination with `theme="capsule"`.

```html
<wd-slider v-model="value" vertical theme="capsule" />
<wd-slider v-model="rangeValue" vertical theme="capsule" range show-extreme-value />
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| model-value / v-model | Current slider value, single slider is `number`, dual slider is `number[]` | `SliderValue` | `0` |
| min | Minimum value | `number` | `0` |
| max | Maximum value | `number` | `100` |
| step | Step size | `number` | `1` |
| range | Whether it is dual slider mode | `boolean` | `false` |
| vertical | Whether to display vertically | `boolean` | `false` |
| theme | Slider style, optional values are `default`, `capsule` | `SliderTheme` | `'default'` |
| disabled | Whether disabled | `boolean` | `false` |
| show-extreme-value | Whether to display minimum and maximum value text | `boolean` | `false` |
| popover-visible | Bubble display mode, optional values are `always`, `normal`, `never` | `SliderPopoverVisible` | `'normal'` |
| marks | Scale marks, supports array or object form | `SliderMarks` | - |
| active-color | Progress bar active state color | `string` | `''` |
| inactive-color | Progress bar inactive state color | `string` | `''` |
| custom-class | Root node style class | `string` | `''` |
| custom-style | Root node style | `string` | `''` |

## Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| dragstart | Triggered when starting to drag | `{ value }` |
| dragmove | Triggered during dragging | `{ value }` |
| dragend | Triggered when dragging ends | `{ value }` |
| change | Triggered when value changes | `value` |

## Methods

| Method Name | Description | Parameters |
| --- | --- | --- |
| initSlider | Initialize slider size data | - |
