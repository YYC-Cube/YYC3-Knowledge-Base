export const PRESETS = {
  basic: {
    name: "Basic",
    mode: "template" as const,
    code: `<div class="container">
  <h1>{{ title }}</h1>
  <p>{{ message }}</p>
</div>`,
  },
  directives: {
    name: "Directives",
    mode: "template" as const,
    code: `<div>
  <p v-if="show">Visible</p>
  <ul>
    <li v-for="item in items" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
  <button @click="handleClick">Click</button>
</div>`,
  },
  vModel: {
    name: "v-model",
    mode: "template" as const,
    code: `<div>
  <input v-model="text" placeholder="Type here" />
  <input v-model.number="count" type="number" />
  <input v-model.trim="name" />
  <p>{{ text }} - {{ count }} - {{ name }}</p>
</div>`,
  },
  events: {
    name: "Events",
    mode: "template" as const,
    code: `<div>
  <button @click="onClick">Click</button>
  <button @click.prevent="onSubmit">Submit</button>
  <input @keyup.enter="onEnter" />
  <div @mouseover.self="onHover">Hover me</div>
</div>`,
  },
  slots: {
    name: "Slots",
    mode: "template" as const,
    code: `<MyComponent>
  <template #header>
    <h1>Header Content</h1>
  </template>
  <template #default="{ item }">
    <p>{{ item.name }}</p>
  </template>
  <template #footer>
    <p>Footer Content</p>
  </template>
</MyComponent>`,
  },
  sfc: {
    name: "SFC",
    mode: "sfc" as const,
    code: [
      "<" + "script setup>",
      "import { ref } from 'vue'",
      "",
      "const count = ref(0)",
      "const increment = () => count.value++",
      "</" + "script>",
      "",
      "<template>",
      '  <div class="counter">',
      "    <p>Count: {{ count }}</p>",
      '    <button @click="increment">+</button>',
      "  </div>",
      "</template>",
      "",
      "<style scoped>",
      ".counter {",
      "  padding: 1rem;",
      "}",
      "button {",
      "  font-size: 1.5rem;",
      "}",
      "</style>",
    ].join("\n"),
  },
  sfcTs: {
    name: "SFC (TS)",
    mode: "sfc" as const,
    code: [
      "<" + 'script setup lang="ts">',
      "import { ref, computed } from 'vue'",
      "",
      "interface User {",
      "  id: number",
      "  name: string",
      "}",
      "",
      "const name = ref('Vue')",
      "const users = ref<User[]>([",
      "  { id: 1, name: 'Alice' },",
      "  { id: 2, name: 'Bob' },",
      "])",
      "",
      "const greeting = computed(() => `Hello, ${name.value}!`)",
      "</" + "script>",
      "",
      "<template>",
      "  <div>",
      "    <h1>{{ greeting }}</h1>",
      "    <ul>",
      '      <li v-for="user in users" :key="user.id">',
      "        {{ user.name }}",
      "      </li>",
      "    </ul>",
      "  </div>",
      "</template>",
    ].join("\n"),
  },
  macros: {
    name: "Macros",
    mode: "sfc" as const,
    code: [
      "<" + 'script setup lang="ts">',
      "import { ref, computed } from 'vue'",
      "",
      "// Compiler Macros",
      "const props = defineProps<{",
      "  title: string",
      "  count?: number",
      "}>()",
      "",
      "const emit = defineEmits<{",
      "  update: [number]",
      "  close: []",
      "}>()",
      "",
      "defineExpose({",
      "  reset: () => count.value = 0",
      "})",
      "",
      "// Reactive state",
      "const count = ref(props.count ?? 0)",
      "const doubled = computed(() => count.value * 2)",
      "",
      "function increment() {",
      "  count.value++",
      "  emit('update', count.value)",
      "}",
      "</" + "script>",
      "",
      "<template>",
      '  <div class="counter">',
      "    <h2>{{ title }}</h2>",
      "    <p>Count: {{ count }} (doubled: {{ doubled }})</p>",
      '    <button @click="increment">+1</button>',
      "    <button @click=\"emit('close')\">Close</button>",
      "  </div>",
      "</template>",
      "",
      "<style scoped>",
      ".counter {",
      "  padding: 1rem;",
      "  border: 1px solid #ccc;",
      "  border-radius: 8px;",
      "}",
      "button {",
      "  margin: 0.25rem;",
      "  padding: 0.5rem 1rem;",
      "}",
      "</style>",
    ].join("\n"),
  },
  propsDestructure: {
    name: "Props Destructure",
    mode: "sfc" as const,
    code: [
      "<" + 'script setup lang="ts">',
      "import { computed, watch } from 'vue'",
      "",
      "// Reactive Props Destructure (Vue 3.5+)",
      "const {",
      "  name,",
      "  count = 0,",
      "  disabled = false,",
      "  items = []",
      "} = defineProps<{",
      "  name: string",
      "  count?: number",
      "  disabled?: boolean",
      "  items?: string[]",
      "}>()",
      "",
      "const emit = defineEmits<{",
      "  update: [number]",
      "}>()",
      "",
      "// Destructured props are reactive!",
      "const doubled = computed(() => count * 2)",
      "const itemCount = computed(() => items.length)",
      "",
      "watch(() => count, (newVal) => {",
      "  console.log('count changed:', newVal)",
      "})",
      "",
      "function increment() {",
      "  emit('update', count + 1)",
      "}",
      "</" + "script>",
      "",
      "<template>",
      '  <div class="card">',
      "    <h2>{{ name }}</h2>",
      "    <p>Count: {{ count }} (doubled: {{ doubled }})</p>",
      "    <p>Items: {{ itemCount }}</p>",
      '    <button @click="increment" :disabled="disabled">',
      "      Increment",
      "    </button>",
      "  </div>",
      "</template>",
      "",
      "<style scoped>",
      ".card {",
      "  padding: 1rem;",
      "  border: 1px solid #42d392;",
      "  border-radius: 8px;",
      "}",
      "button:disabled {",
      "  opacity: 0.5;",
      "  cursor: not-allowed;",
      "}",
      "</style>",
    ].join("\n"),
  },
};

export type PresetKey = keyof typeof PRESETS;
export type InputMode = "template" | "sfc";
