# Style Override

Through this chapter, you can learn how to effectively override the default styles of components when using Wot UI.

## Using External Style Classes

We have opened a large number of external style classes for developers to use, such as: `custom-style` and `custom-class`. The specific style class names can be found in the corresponding component documentation.

When using, directly pass the custom class name to the corresponding external style class attribute:

```vue
<wd-button custom-class="custom-button" type="primary">Primary Button</wd-button>
```

```scss
/* Component styles */
:deep(.custom-button) {
  color: red !important;
}
```

## Page-level Style Override

When using Wot UI components on a page, you can directly override styles in the page's style file.

`Wot UI` components usually have feature class names starting with `wd-` at the outermost layer or key nodes. If you are in a normal style block without using `scoped`, you can directly override styles through class names:

```vue
<wd-button type="primary">Primary Button</wd-button>
```

```scss
/* Page styles (non-scoped) */
.wd-button {
  color: red !important;
}
```

If you are in a style block using `scoped`, you need to use the `:deep()` pseudo-class to penetrate the component for style override:

```vue
<wd-button type="primary">Primary Button</wd-button>
```

```scss
/* Page styles (scoped) */
:deep(.wd-button) {
  color: red !important;
}
```
### Deep Understanding of :deep()

In most cases, directly using class names can override styles. However, if you use `scoped` styles in **your own page**, your CSS will only affect elements on the current page. If you want to affect child components (i.e., Wot UI components) in `scoped` styles, you need to use the `:deep()` pseudo-class:

```css
<style scoped>
.my-page :deep(.wd-button) {
  color: red !important;
}
</style>
```

The above code will be compiled into something like this (with data attributes):

```css
.my-page[data-v-f3f3eg9] .wd-button {
  color: red !important;
}
```

For details, see [Single File Component CSS Features](https://vuejs.org/api/sfc-css-features.html#sfc-css-features).

## Removing Custom Component Style Isolation

If you use Wot UI components in **custom components you write yourself**, and want to override Wot component styles within the custom component, you may find that styles do not take effect.

This is because in mini-program environments, custom components have style isolation enabled by default. You need to explicitly remove this limitation: enable the `styleIsolation: 'shared'` option.

```vue
<wd-button type="primary">Primary Button</wd-button>
```

**Vue 3.3+ Configuration Method:**
Through the `defineOptions` macro:

```ts
<script lang="ts" setup>
defineOptions({
  options: {
    styleIsolation: 'shared'
  }
})
</script>
```

**Vue 3.2 and below Configuration Method:**

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
// ... other logic
</script>
```

After enabling `shared`, you can override Wot components in your component styles:

```scss
/* Component styles */
:deep(.wd-button) {
  color: red !important;
}
```

## Using CSS Variables

We have opened CSS variable (CSS Variables) based customization solutions for all components.

Compared to the class name or penetration forced override introduced above, this solution is more elegant, supporting batch modification of multiple component styles at the page or application level for theme customization.

Of course, using it to modify partial styles of a single component is also more than sufficient:

```vue
<template>
  <view class="custom-theme-wrapper">
    <wd-button type="primary">Primary Button</wd-button>
  </view>
</template>

<style>
.custom-theme-wrapper {
  /* Override button's primary background color */
  --wot-button-primary-bg: pink;
}
</style>
```

For the complete list of all CSS variables and more in-depth theme customization guides, please refer to [Custom Theme](./custom-theme.md).

## Specific Platform Style Penetration Failure

In some specific platforms (such as Alipay Mini Program) version updates, the default style isolation strategy may be changed, causing the original style penetration to fail.

For example, uni-app in version `3.99.2023122704` set the default `styleIsolation` of Alipay Mini Program to `apply-shared`, while Alipay Mini Program's original default `styleIsolation` was `shared`, causing style penetration of mask layers and other components to fail.

**Solution:**
Force set `styleIsolation` to `shared` in `manifest.json` in the project root directory.

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
