# 样式覆盖

通过本章节，你可以学习到使用 Wot UI 时，如何有效地覆盖组件的默认样式。

## 使用外部样式类

我们开放了大量的外部样式类供开发者使用，例如：`custom-style` 和 `custom-class`，具体的样式类名称可查阅对应组件文档。

使用时，直接将自定义的类名传递给对应的外部样式类属性即可：

```vue
<wd-button custom-class="custom-button" type="primary">主要按钮</wd-button>
```

```scss
/* 组件样式 */
:deep(.custom-button) {
  color: red !important;
}
```

## 页面级样式覆盖

在页面中使用 Wot UI 组件时，可直接在页面的样式文件中覆盖样式。

`Wot UI` 的组件通常在最外层或关键节点带有以 `wd-` 开头的特征类名。如果你在没有使用 `scoped` 的普通样式块中，可以直接通过类名覆盖样式：

```vue
<wd-button type="primary">主要按钮</wd-button>
```

```scss
/* 页面样式（非 scoped） */
.wd-button {
  color: red !important;
}
```

如果你在使用了 `scoped` 的样式块中，则需要通过 `:deep()` 伪类穿透组件来进行样式覆盖：

```vue
<wd-button type="primary">主要按钮</wd-button>
```

```scss
/* 页面样式（scoped） */
:deep(.wd-button) {
  color: red !important;
}
```
### 深入理解 :deep()

在多数情况下，直接使用类名即可覆盖样式。但是，如果你在**你自己的页面中**使用了 `scoped` 样式，那么你的 CSS 只会影响当前页面的元素。如果你想在 `scoped` 样式中影响到子组件（即 Wot UI 组件），就需要使用 `:deep()` 伪类：

```css
<style scoped>
.my-page :deep(.wd-button) {
  color: red !important;
}
</style>
```

上面的代码会被编译成类似这样（附带 data 属性）：

```css
.my-page[data-v-f3f3eg9] .wd-button {
  color: red !important;
}
```

详细可见 [单文件组件 CSS 功能](https://cn.vuejs.org/api/sfc-css-features.html#sfc-css-features)。

## 解除自定义组件样式隔离

如果你在**自己编写的自定义组件**中使用了 Wot UI 组件，并且想要在自定义组件内覆盖 Wot 组件的样式，那么你可能会发现样式不生效。

这是因为在小程序环境中，自定义组件默认开启了样式隔离。你需要显式地解除这一限制：开启 `styleIsolation: 'shared'` 选项。

```vue
<wd-button type="primary">主要按钮</wd-button>
```

**Vue 3.3+ 的配置方式：**
通过 `defineOptions` 宏：

```ts
<script lang="ts" setup>
defineOptions({
  options: {
    styleIsolation: 'shared'
  }
})
</script>
```

**Vue 3.2 及以下版本的配置方式：**

```ts
// vue
<script lang="ts">
export default {
  options: {
    styleIsolation: 'shared'
  }
}
</script>
<script lang="ts" setup>
// ... 其他逻辑
</script>
```

开启 `shared` 后，你就可以在你的组件样式中覆盖 Wot 组件了：

```scss
/* 组件样式 */
:deep(.wd-button) {
  color: red !important;
}
```

## 使用 CSS 变量

我们为所有的组件都开放了基于 CSS 变量（CSS Variables）的定制方案。

相较于上面介绍的通过类名或穿透强制覆盖，这种方案更加优雅，支持在页面或应用级别对多个组件的样式做批量修改，以进行主题样式的定制。

当然，用它来修改单个组件的部分样式也是绰绰有余的：

```vue
<template>
  <view class="custom-theme-wrapper">
    <wd-button type="primary">主要按钮</wd-button>
  </view>
</template>

<style>
.custom-theme-wrapper {
  /* 覆盖按钮的主要背景色 */
  --wot-button-primary-bg: pink;
}
</style>
```

关于所有的 CSS 变量清单以及更深入的主题定制指南，请查阅 [定制主题](./custom-theme.md)。

## 特定平台样式穿透失效

在一些特定的平台（如支付宝小程序）版本更新中，可能会改变默认的样式隔离策略，导致原有的样式穿透失效。

例如，uni-app 在 `3.99.2023122704` 版本将支付宝小程序的 `styleIsolation` 默认值设置为了 `apply-shared`，而支付宝小程序原默认的 `styleIsolation` 为 `shared`，导致遮罩层等组件的样式穿透无法生效。

**解决办法：** 
在项目根目录的 `manifest.json` 中强制将 `styleIsolation` 设为 `shared`。

```json
{
  // ...
  "mp-alipay": {
    // ...
    "styleIsolation": "shared"
    // ...
  }
  // ...
}
```
