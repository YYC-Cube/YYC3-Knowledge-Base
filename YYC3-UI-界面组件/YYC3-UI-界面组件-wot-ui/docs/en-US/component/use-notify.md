# useNotify

Used to conveniently call the Notify message notification component.

## Basic Usage

Need to import wd-notify component in the page as the mount point.

```html
<wd-notify />
<wd-button @click="showNotify">notify</wd-button>
```

```ts
import { useNotify } from '@/uni_modules/wot-ui'

const { showNotify } = useNotify()

function showNotify() {
  showNotify('Notification content')
}
```

## Notification Types

Supports `primary`, `success`, `warning`, `danger` four notification types, default is `danger`.

```ts
// Primary notification
showNotify({ type: 'primary', message: 'Notification content' })

// Success notification
showNotify({ type: 'success', message: 'Notification content' })

// Danger notification
showNotify({ type: 'danger', message: 'Notification content' })

// Warning notification
showNotify({ type: 'warning', message: 'Notification content' })
```

## Custom Styles

```ts
showNotify({
  message: 'Custom color',
  color: '#ad0000',
  background: '#ffe1e1'
})

showNotify({
  message: 'Custom position',
  position: 'bottom'
})

showNotify({
  message: 'Custom duration',
  duration: 1000
})
```

## API

### Methods

| Method Name | Description | Parameters | 
|---------|------|------|
| showNotify | Show prompt | `NotifyOptions` / `string` |
| closeNotify | Close prompt | - |
| setNotifyDefaultOptions | Modify default configuration, affects all `showNotify` calls | `NotifyOptions` |
| resetNotifyDefaultOptions | Reset default configuration, affects all `showNotify` calls | - |

### Options

| Parameter | Description | Type | Optional Values | Default Value |
|-----|------|------|--------|--------|
| type | Type | NotifyType | `primary` `success` `warning` `danger` | `danger` |
| message | Display text, supports line breaks via \n | string | - | - |
| duration | Display duration (ms), when value is 0, notify will not disappear | number | - | 3000 |
| zIndex | z-index | number | - | 99 |
| position | Popup position | NotifyPosition | `top` `bottom` | `top` |
| color | Font color | string | - | - |
| background | Background color | string | - | - |
| safeHeight | Top safe height | number / string | - | - |
| onClick | Callback function when clicked | (event: MouseEvent) => void | - | - |
| onClosed | Callback function when closed | () => void | - | - |
| onOpened | Callback function after displayed | () => void | - | - |
