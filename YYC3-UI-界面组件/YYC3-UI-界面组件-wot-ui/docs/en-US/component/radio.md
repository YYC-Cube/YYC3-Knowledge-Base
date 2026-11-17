# Radio

Radio is used for single selection among a group of options.

## Component Types

### Basic Usage

`v-model` is the binding value, which is the `value` of the currently selected `wd-radio`.

```html
<wd-radio-group v-model="value">
  <wd-radio :value="1">Radio 1</wd-radio>
  <wd-radio type="square" :value="2">Radio 2</wd-radio>
  <wd-radio type="dot" :value="3">Radio 3</wd-radio>
</wd-radio-group>
```

```ts
const value = ref(1)
```

### Button Style

Set `type="button"` to switch to button-style radio.

```html
<wd-radio-group v-model="value" type="button">
  <wd-radio :value="1">Option One</wd-radio>
  <wd-radio :value="2">Option Two</wd-radio>
</wd-radio-group>
```

## Component States

### Disabled

You can set `disabled` on `wd-radio-group` to disable the entire group of radios uniformly; you can also set it individually on a single `wd-radio`.

```html
<wd-radio-group v-model="value" disabled>
  <wd-radio :value="1">Option One</wd-radio>
  <wd-radio :value="2">Option Two</wd-radio>
</wd-radio-group>
```

### Read-only State

After setting `readonly`, the radio option still displays the current value, but will not respond to click switching.

```html
<wd-radio-group v-model="value" readonly>
  <wd-radio :value="1">Option One</wd-radio>
  <wd-radio :value="2">Option Two</wd-radio>
</wd-radio-group>
```

### Allow Unchecking

After setting `allow-uncheck`, clicking the currently selected radio option can uncheck it.

```html
<wd-radio-group v-model="value" allow-uncheck>
  <wd-radio :value="1">Support Unchecking</wd-radio>
  <wd-radio :value="2">Support Unchecking</wd-radio>
</wd-radio-group>
```

## Component Styles

### Icon Position

Set `placement` to control whether the icon is displayed on the left or right side of the text.

```html
<wd-radio-group v-model="value" placement="right">
  <wd-radio :value="1">Radio 1</wd-radio>
  <wd-radio :value="2">Radio 2</wd-radio>
</wd-radio-group>
```

### Modify Selected Color

Set `checked-color` to modify the icon color in the selected state.

```html
<wd-radio-group v-model="value" checked-color="#fa4350">
  <wd-radio :value="1">Option One</wd-radio>
  <wd-radio :value="2">Option Two</wd-radio>
</wd-radio-group>
```

### Modify Unselected Color

Set `unchecked-color` to modify the icon color in the unselected state.

```html
<wd-radio-group v-model="value" unchecked-color="#fa4350">
  <wd-radio :value="1">Option One</wd-radio>
  <wd-radio :value="2">Option Two</wd-radio>
</wd-radio-group>
```

## Special Styles

### Props Priority

Properties set on a single `wd-radio` have higher priority than those on `wd-radio-group`.

```html
<wd-radio-group v-model="value" type="button" disabled checked-color="#fa4350">
  <wd-radio :value="1" checked-color="#000" :disabled="false">Option One</wd-radio>
  <wd-radio :value="2" :disabled="false">Option Two</wd-radio>
  <wd-radio :value="3">Option Three</wd-radio>
</wd-radio-group>
```

### Combined with Cell Usage

You can place `wd-radio` in the right area of `wd-cell`, and cooperate with the entire row click to achieve a list selection effect.

```html
<wd-radio-group v-model="value">
  <wd-cell-group border insert>
    <wd-cell title="Radio 1" clickable @click="value = 1">
      <template #right-icon>
        <wd-radio :value="1" />
      </template>
    </wd-cell>
    <wd-cell title="Radio 2" clickable @click="value = 2">
      <template #right-icon>
        <wd-radio :value="2" />
      </template>
    </wd-cell>
  </wd-cell-group>
</wd-radio-group>
```

### Custom Icon

The selected and unselected icons can be customized through the `icon` slot.

```html
<wd-radio-group v-model="value">
  <wd-radio :value="1">
    Custom Icon
    <template #icon="{ isChecked }">
      <wd-icon :name="isChecked ? 'star-fill' : 'star'" size="22px" :color="isChecked ? '#fa4350' : '#ccc'" />
    </template>
  </wd-radio>
</wd-radio-group>
```

## Layout Capabilities

### Inline Display

Set `direction="horizontal"` to arrange radios in the same row.

```html
<wd-radio-group v-model="value" direction="horizontal">
  <wd-radio :value="1">Radio 1</wd-radio>
  <wd-radio :value="2">Radio 2</wd-radio>
</wd-radio-group>
```

## RadioGroup Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| v-model | Currently selected value, automatically matches the `value` of the corresponding `wd-radio` | `string \| number \| boolean` | - |
| type | Radio type, optional values are `circle`, `dot`, `square`, `button` | `string` | `circle` |
| checked-color | Icon color in selected state | `string` | - |
| unchecked-color | Icon color in unselected state | `string` | - |
| disabled | Whether to disable the entire group of radios | `boolean` | `false` |
| readonly | Whether read-only | `boolean` | `false` |
| placement | Icon position, optional values are `left`, `right` | `string` | `left` |
| direction | Layout direction, optional values are `horizontal`, `vertical` | `string` | `vertical` |
| allow-uncheck | Whether to allow unchecking the currently selected value | `boolean` | `false` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

## RadioGroup Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| change | Triggered when binding value changes | `{ value }` |

## Radio Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| value | Value of the radio option, matches with `wd-radio-group`'s `v-model` | `string \| number \| boolean` | - |
| type | Radio type, optional values are `circle`, `dot`, `square`, `button` | `string` | Inherited from `wd-radio-group` |
| checked-color | Icon color in selected state | `string` | Inherited from `wd-radio-group` |
| unchecked-color | Icon color in unselected state | `string` | Inherited from `wd-radio-group` |
| disabled | Whether to disable the current radio option | `boolean` | Inherited from `wd-radio-group` |
| readonly | Whether read-only | `boolean` | Inherited from `wd-radio-group` |
| placement | Icon position, optional values are `left`, `right` | `string` | Inherited from `wd-radio-group` |
| direction | Layout direction, optional values are `horizontal`, `vertical` | `string` | Inherited from `wd-radio-group` |
| custom-label-class | Custom text node class name | `string` | - |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

## Slots

| Component | Name | Description | Parameters |
| --- | --- | --- | --- |
| wd-radio | default | Radio option text content | - |
| wd-radio | icon | Custom icon content | `{ isChecked }` |
