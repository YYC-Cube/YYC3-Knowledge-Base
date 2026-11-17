# Text

Text component for displaying text information.

## Component Types

### Basic Usage

Pass text content through `text`.

```html
<wd-text :text="text"></wd-text>
```

```ts
const text = ref('Reeds fill the sandbar, cold sand with shallow streams. Twenty years since I last visited the South Tower.')
```

### Set Theme

Set theme color through `type`, supports `primary`, `error`, `success`, `warning`, `default`.

```html
<wd-text type="primary" text="Primary"></wd-text>
<wd-text type="error" text="Error"></wd-text>
<wd-text type="success" text="Success"></wd-text>
<wd-text type="warning" text="Warning"></wd-text>
<wd-text text="Default"></wd-text>
```

### Mode

Format text through `mode`, supports `text`, `date`, `phone`, `name`, `price`.

```html
<wd-text text="18888888888" mode="phone"></wd-text>
<wd-text text="Wang San" mode="name"></wd-text>
<wd-text text="1719976636911" mode="date"></wd-text>
```

### Price

Set `mode="price"` to display price formatted text.

```html
<wd-text text="16354.156" mode="price" type="success" decoration="line-through" prefix="￥" />
```

## Component Styles

### Custom Font Color

Set text color through `color`.

```html
<wd-text :text="text" color="#36B8C2"></wd-text>
```

### Bold

Set `bold` to enable bold text.

```html
<wd-text :text="text" bold></wd-text>
```

### Font Size

Set font size through `size`.

```html
<wd-text :text="text" size="16px"></wd-text>
```

### Lines

Set `lines` to limit the number of displayed lines, showing ellipsis when exceeded.

```html
<wd-text :text="text" :lines="2" size="16px"></wd-text>
```

### LineHeight

Set line height through `lineHeight`.

```html
<wd-text :text="text" :lines="2" lineHeight="20px"></wd-text>
```

### Text Decoration

Set text decoration line through `decoration`.

```html
<wd-text :text="text" type="warning" decoration="underline" />
```

## Special Styles

### Desensitization

After setting `format`, desensitization display will be performed when `mode` is `phone` or `name`.

```html
<wd-text text="Zhang Changsan" mode="name" :format="true"></wd-text>
<wd-text text="18888888888" mode="phone" :format="true"></wd-text>
```

### Prefix and Suffix Slots

Extend front and back content through `prefix`, `suffix` properties or slots with the same name.

```html
<wd-text text="12345678901" mode="phone" format type="primary" prefix="Prefix" suffix="Suffix" />

<wd-text text="12345678901" mode="phone" format type="primary">
  <template #prefix>
    <text>Prefix</text>
  </template>
  <template #suffix>Suffix</template>
</wd-text>
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| type | Theme type, optional values are `default`, `primary`, `success`, `warning`, `error` | `TextType` | `default` |
| text | Text content | `string \| number` | `''` |
| size | Font size | `string` | `''` |
| mode | Text processing mode, optional values are `text`, `date`, `phone`, `name`, `price` | `TextMode` | `text` |
| decoration | Text decoration, optional values are `none`, `underline`, `line-through`, `overline` | `TextDecoration` | `none` |
| call | Whether to dial when clicking text when `mode="phone"` | `boolean` | `false` |
| bold | Whether bold | `boolean` | `false` |
| format | Whether to desensitize, only effective when `mode` is `phone` and `name` | `boolean` | `false` |
| color | Text color | `string` | `''` |
| prefix | Prefix content | `string` | - |
| suffix | Suffix content | `string` | - |
| lines | Number of display lines, showing ellipsis when exceeded | `number` | - |
| line-height | Text line height | `string` | `''` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |

## Events

| Event Name | Description | Parameters |
| --- | --- | --- |
| click | Triggered when clicking text | `Event` |

## Slots

| Name | Description |
| --- | --- |
| prefix | Prefix content |
| suffix | Suffix content |

## External Style Classes

| Class Name | Description |
| --- | --- |
| custom-class | Root node style class |
| custom-style | Root node inline style |
