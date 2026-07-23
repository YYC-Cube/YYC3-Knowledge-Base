declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // biome-ignore lint/suspicious/noExplicitAny: Vue component
  // biome-ignore lint/complexity/noBannedTypes: Vue component type definition
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
