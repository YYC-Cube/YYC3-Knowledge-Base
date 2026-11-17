# SortButton

A sorting button component that supports three states: ascending, descending, and reset.

## Component Types

### Basic Usage

Use `v-model` to bind the current sorting state. Values are `-1`, `0`, and `1`, representing descending, reset state, and ascending respectively.

```html
<wd-sort-button v-model="value" title="Price" @change="handleChange" />
```

```ts
const value = ref(0)

function handleChange({ value }) {
  console.log(value)
}
```

## Component Variants

### Allow Reset

Setting `allow-reset` allows the sort button to return to the reset state.

```html
<wd-sort-button v-model="value" title="Price" allow-reset />
```

### Descending First

Setting `desc-first` makes the first switch prioritize entering descending order.

```html
<wd-sort-button v-model="value" title="Price" desc-first />
```

## Component Styles

### Show Underline

Setting `line` displays an underline.

```html
<wd-sort-button v-model="value" title="Price" line />
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| model-value / v-model | Current sort direction value. `1` for ascending, `0` for reset state, `-1` for descending | `SortButtonValue` | `0` |
| title | Sort button text | `string` | `''` |
| allow-reset | Whether to allow reset to unselected state | `boolean` | `false` |
| desc-first | Whether to prioritize switching to descending order | `boolean` | `false` |
| line | Whether to show underline | `boolean` | `false` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

## Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| change | Triggered when sort direction changes | `{ value }` |
