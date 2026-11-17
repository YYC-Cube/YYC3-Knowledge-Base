# Gap

Used for spacing placeholders in page layout, can replace `margin` or `padding`, or as a bottom placeholder element.

## Component Type

### Basic Usage

Default renders a gap with height `14px` and transparent background.

```html
<wd-gap />
```

## Component Variant

### Custom Background Color

Set background color through `bg-color`.

```html
<wd-gap bg-color="#4D80F0" />
```

### Custom Height

Set height through `height`, supports numbers and strings with units.

```html
<wd-gap bg-color="#4D80F0" height="120rpx" />
```

## Component Style

### Custom Class Name

Extend styles through `custom-class`.

```html
<wd-gap custom-class="custom-gap" />
```

```css
.custom-gap {
  padding-bottom: 120rpx;
  background: #34d19d !important;
}
```

## Special Style

### Bottom Safe Area

After enabling `safe-area-bottom`, bottom safe area padding will be automatically appended, suitable for bottom fixed placeholder scenarios.

```html
<wd-gap safe-area-bottom height="0" />
```

## Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| height | Gap height, supports numbers (unit `px`) or strings (such as `20rpx`) | `string \| number` | `14` |
| bg-color | Background color | `string` | `'transparent'` |
| safe-area-bottom | Whether to enable bottom safe area adaptation | `boolean` | `false` |
| custom-class | Root node custom class name | `string` | `''` |
| custom-style | Root node custom style | `string` | `''` |
