# Internationalization

Wot UI uses Chinese language by default and supports multi-language switching. If you want to use other languages, you can refer to the following solutions.

:::warning Note
Currently, Vite will cache pre-built dependencies to `node_modules/.vite`. The internationalization implementation of the component library is based on data sharing implemented by `reactive`. In the `dev` stage, the page will use internationalization data in pre-built products, while the component library uses internationalization data inside the component library, so when not introduced in `uni_modules` mode, you need to add the following configuration in `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  ...
  optimizeDeps: {
    exclude: ['@wot-ui/ui']
  }
  ...
})

```

Use [optimizeDeps.exclude](https://vitejs.dev/config/dep-optimization-options.html#optimizedeps-exclude) to force exclude the `@wot-ui/ui` module in pre-building. In `uni_modules` mode, no processing is required.

:::

## Using Other Languages

We implement multi-language support through the **Locale** component. Use the **Locale.use** method to switch the current language.

```typescript
import { Locale } from '@wot-ui/ui'
// Import English language pack
import enUS from '@wot-ui/ui/locale/lang/en-US'

Locale.use('en-US', enUS)
```

## Overriding Language Packs

Copy modification and extension of copy can be achieved through the **Locale.add** method, as shown in the following example:

```typescript
import { Locale } from '@wot-ui/ui'

const messages = {
  'zh-CN': {
    calendar: {
      title: 'Please select date' // Change 'Select date' to 'Please select date'
    }
  }
}

Locale.add(messages)
```

## Supported Languages

| Language | Filename | Version |
| ---------------- | --------- | --------- |
| Simplified Chinese | zh-CN | `v0.2.20` |
| Traditional Chinese (Taiwan) | zh-TW | `v0.2.20` |
| Traditional Chinese (Hong Kong) | zh-HK | `v0.2.20` |
| English | en-US | `v0.2.20` |
| Thai | th-TH | `v0.2.20` |
| Vietnamese | vi-VN | `v0.2.20` |
| Arabic | ar-SA | `v1.3.12` |
| German | de-DE | `v1.3.12` |
| Spanish | es-ES | `v1.3.12` |
| Portuguese | pt-PT | `v1.3.12` |
| French | fr-FR | `v1.3.12` |
| Japanese | ja-JP | `v1.3.12` |
| Korean | ko-KR | `v1.3.12` |
| Turkish | tr-TR | `v1.3.12` |
| Russian | ru-RU | `v1.3.12` |

If you need to use other languages, welcome to contribute [PR](https://github.com/Moonofweisheng/@wot-ui/ui/pulls). Just add a language configuration file [here](https://github.com/Moonofweisheng/@wot-ui/ui/tree/master/src/uni_modules/@wot-ui/ui/locale/lang).
