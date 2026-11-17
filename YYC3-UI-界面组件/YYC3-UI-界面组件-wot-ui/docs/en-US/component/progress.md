# Progress

Used to display the current progress of an operation.

## Component Types

### Basic Usage

Set the percentage `percentage`.

```html
<wd-progress :percentage="50" />
```

### Built-in Percentage

Configure the percentage to be displayed inside the progress bar through `percent-position`, and set the alignment.

```html
<wd-progress :percentage="50" :percent-position="{ type: 'inner', align: 'center' }" />
<wd-progress :percentage="50" status="success" :percent-position="{ type: 'inner', align: 'right' }" />
<wd-progress :percentage="50" status="danger" :percent-position="{ type: 'inner', align: 'left' }" />
```

## Component States

### Status

Set `status` to inform the user of the current state and expectations.

```html
<wd-progress :percentage="50" status="success" hide-text />
<wd-progress :percentage="50" status="danger" hide-text />
<wd-progress :percentage="50" status="warning" hide-text />
```

## Component Styles

### Hide Progress Text

Set `hide-text` to hide the progress text.

```html
<wd-progress :percentage="50" hide-text />
```

### Modify Color

Set `color` to modify the progress bar color.

```html
<wd-progress :percentage="50" color="var(--wot-color-theme, #0083ff)" />
<wd-progress :percentage="50" color="var(--wot-color-success, #00c740)" />
<wd-progress :percentage="50" color="var(--wot-color-warning, #ffb300)" />
```

### Color Array

`color` can also be set as a color array or `ProgressColor[]`. When a string array is passed in, the component will automatically calculate the progress boundary corresponding to each color segment.

```html
<wd-progress :percentage="50" :color="['#00c740', '#ffb300', '#e2231a', '#0083ff']" />
<wd-progress :percentage="50" :color="colorObject" />
```

```ts
import type { ProgressColor } from '@/uni_modules/wot-ui/components/wd-progress/types'

const colorObject: ProgressColor[] = [
  {
    color: 'yellow',
    percentage: 30
  },
  {
    color: 'red',
    percentage: 60
  },
  {
    color: 'blue',
    percentage: 80
  },
  {
    color: 'black',
    percentage: 90
  }
]
```

## Special Styles

### Dynamic Control

Dynamic progress control can be achieved by modifying the `percentage` binding value.

```html
<wd-progress :percentage="percentage" />
<wd-button type="danger" size="small" @click="reduce">-10</wd-button>
<wd-button type="success" size="small" @click="add">+10</wd-button>
```

```ts
const percentage = ref(50)

function add() {
  percentage.value = Math.min(percentage.value + 10, 100)
}

function reduce() {
  percentage.value = Math.max(percentage.value - 10, 0)
}
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| percentage | Progress value, maximum is `100` | `number` | `0` |
| hide-text | Whether to hide progress text | `boolean` | `false` |
| color | Progress bar color, optional values are `string`, `string[]`, `ProgressColor[]` | `string \| string[] \| ProgressColor[]` | - |
| status | Progress bar status, optional values are `success`, `danger`, `warning` | `string` | - |
| duration | Milliseconds required for progress to increase by `1%` | `number` | `30` |
| percent-position | Percentage display position configuration, `type` optional `inner`, `outer`, `align` optional `left`, `center`, `right` | `PercentPosition` | `{ align: 'right', type: 'outer' }` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

### ProgressColor

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| color | Color value | `string` | - |
| percentage | Progress threshold for color to take effect | `number` | - |

### PercentPosition

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| type | Percentage display position, optional values are `inner`, `outer` | `string` | `'outer'` |
| align | Percentage text alignment, optional values are `left`, `center`, `right` | `string` | `'right'` |
