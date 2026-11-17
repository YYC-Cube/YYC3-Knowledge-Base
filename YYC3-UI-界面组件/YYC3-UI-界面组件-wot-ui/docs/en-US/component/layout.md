# Layout

Used for quick layout.

## Layout Capability

### Basic Usage

The `Layout` component provides a `24-column` grid. By setting the `span` property on `wd-col`, the column width is calculated based on the percentage of the current content.

Note: The column layout only provides layout, i.e., element width. Internal styles can be defined by the user as needed through `custom-class` or modifying internal tags.

::: code-group

```html
<wd-row>
  <wd-col :span="24"><view class="bg-dark1">span: 24</view></wd-col>
</wd-row>
<wd-row>
  <wd-col :span="12"><view class="bg-dark">span: 12</view></wd-col>
  <wd-col :span="12"><view class="bg-light">span: 12</view></wd-col>
</wd-row>
<wd-row>
  <wd-col :span="8"><view class="bg-dark">span: 8</view></wd-col>
  <wd-col :span="8"><view class="bg-light">span: 8</view></wd-col>
  <wd-col :span="8"><view class="bg-dark">span: 8</view></wd-col>
</wd-row>
<wd-row>
  <wd-col :span="6"><view class="bg-dark">span: 6</view></wd-col>
  <wd-col :span="6"><view class="bg-light">span: 6</view></wd-col>
  <wd-col :span="6"><view class="bg-dark">span: 6</view></wd-col>
  <wd-col :span="6"><view class="bg-light">span: 6</view></wd-col>
</wd-row>
```

```scss
.bg-dark1,
.bg-dark,
.bg-light {
  border-radius: 4px;
  min-height: 30px;
  text-align: center;
  line-height: 30px;
  font-size: 12px;
  margin-bottom: 10px;
  color: rgba(0, 0, 0, 0.45);
}
.bg-dark1 {
  background: #99a9bf;
  color: #fff;
}
.bg-dark {
  background: #d3dce6;
}
.bg-light {
  background: #e5e9f2;
}
```

:::

### Column Offset

The `offset` property can set the offset of the column. The calculation method and offset size are the same as `span`.

```html
<wd-row>
  <wd-col :span="4"><view class="bg-dark">span: 4</view></wd-col>
  <wd-col :span="8" :offset="4"><view class="bg-light">span: 8 offset: 4</view></wd-col>
</wd-row>
<wd-row>
  <wd-col :span="8" :offset="4"><view class="bg-dark">span: 8 offset: 4</view></wd-col>
  <wd-col :span="8" :offset="4"><view class="bg-light">span: 8 offset: 4</view></wd-col>
</wd-row>
```

### Column Gap

The spacing between column elements can be set through the `gutter` property. The default spacing is 0.

```html
<wd-row :gutter="20">
  <wd-col :span="8"><view class="bg-dark">span: 8</view></wd-col>
  <wd-col :span="8"><view class="bg-light">span: 8</view></wd-col>
  <wd-col :span="8"><view class="bg-dark">span: 8</view></wd-col>
</wd-row>
```

### Justify Alignment

The main axis alignment can be set through the `justify` property. Optional values are `start`, `center`, `end`, `space-between`, `space-around`, `space-evenly`.

```html
<wd-row justify="center">
  <wd-col :span="6"><view class="bg-dark">center</view></wd-col>
  <wd-col :span="6"><view class="bg-light">center</view></wd-col>
  <wd-col :span="6"><view class="bg-dark">center</view></wd-col>
</wd-row>
<wd-row justify="end">
  <wd-col :span="6"><view class="bg-dark">end</view></wd-col>
  <wd-col :span="6"><view class="bg-light">end</view></wd-col>
  <wd-col :span="6"><view class="bg-dark">end</view></wd-col>
</wd-row>
<wd-row justify="space-between">
  <wd-col :span="6"><view class="bg-dark">between</view></wd-col>
  <wd-col :span="6"><view class="bg-light">between</view></wd-col>
  <wd-col :span="6"><view class="bg-dark">between</view></wd-col>
</wd-row>
<wd-row justify="space-around">
  <wd-col :span="6"><view class="bg-dark">around</view></wd-col>
  <wd-col :span="6"><view class="bg-light">around</view></wd-col>
  <wd-col :span="6"><view class="bg-dark">around</view></wd-col>
</wd-row>
```

### Align Alignment

The cross axis alignment can be set through the `align` property. Optional values are `top`, `middle`, `bottom`.

```html
<wd-row align="middle">
  <wd-col :span="8"><view class="bg-dark" style="height: 60px; line-height: 60px">middle</view></wd-col>
  <wd-col :span="8"><view class="bg-light" style="height: 30px; line-height: 30px">middle</view></wd-col>
  <wd-col :span="8"><view class="bg-dark" style="height: 50px; line-height: 50px">middle</view></wd-col>
</wd-row>
<wd-row align="bottom">
  <wd-col :span="8"><view class="bg-dark" style="height: 60px; line-height: 60px">bottom</view></wd-col>
  <wd-col :span="8"><view class="bg-light" style="height: 30px; line-height: 30px">bottom</view></wd-col>
  <wd-col :span="8"><view class="bg-dark" style="height: 50px; line-height: 50px">bottom</view></wd-col>
</wd-row>
```

## Row Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| gutter | Spacing between column elements (unit is px) | `number` | `0` |
| justify | Main axis alignment, optional values are `start`, `center`, `end`, `space-between`, `space-around`, `space-evenly` | `string` | `start` |
| align | Cross axis alignment, optional values are `top`, `middle`, `bottom` | `string` | `top` |
| custom-class | Root node style class name | `string` | - |
| custom-style | Root node style | `string` | - |

## Col Attributes

| Parameter | Description | Type | Default Value |
| --- | --- | --- | --- |
| span | Column element width (number of columns occupied by the grid, total 24 columns) | `number` | `24` |
| offset | Column element offset distance (number of interval columns on the left side of the grid) | `number` | `0` |
| custom-class | Root node style class name | `string` | - |
| custom-style | Root node style | `string` | - |

## Row Slots

| name | Description |
| --- | --- |
| default | Row content |

## Col Slots

| name | Description |
| --- | --- |
| default | Column content |
