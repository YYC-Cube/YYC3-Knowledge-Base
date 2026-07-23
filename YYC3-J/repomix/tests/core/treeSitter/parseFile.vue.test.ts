import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for Vue', () => {
  test('should parse Vue files correctly', async () => {
    const fileContent = `
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>{{ greeting }}</p>
  </div>
</template>

<script>
// Hello component
/**
 * Vue component that displays a greeting message
 */
export default {
  name: 'HelloWorld',
  props: {
    msg: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      greeting: 'Welcome to Vue!'
    };
  },
  methods: {
    /**
     * Updates the greeting message
     * @param newGreeting The new greeting message
     */
    updateGreeting(newGreeting) {
      this.greeting = newGreeting;
    }
  }
};
</script>

<style scoped>
.hello {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
}
</style>
    `;
    const filePath = 'HelloWorld.vue';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '<template>',
      '<script>',
      '<style scoped>',
      '// Hello component',
      '* Vue component that displays a greeting message',
      'updateGreeting',
      '* Updates the greeting message',
      '@param newGreeting The new greeting message',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse Vue files with TypeScript correctly', async () => {
    const fileContent = `
<template>
  <div class="counter">
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script lang="ts">
// Counter component
import { defineComponent } from 'vue';

/**
 * A simple counter component
 */
export default defineComponent({
  name: 'Counter',
  data() {
    return {
      count: 0
    };
  },
  methods: {
    /**
     * Increments the counter
     */
    increment(): void {
      this.count++;
    }
  }
});
</script>
    `;
    const filePath = 'Counter.vue';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '<template>',
      '<script lang="ts">',
      '// Counter component',
      '* A simple counter component',
      'increment',
      '* Increments the counter',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse Vue files with composition API correctly', async () => {
    const fileContent = `
<template>
  <div class="composition">
    <p>Message: {{ message }}</p>
    <button @click="updateMessage">Update</button>
  </div>
</template>

<script setup>
// Composition API example
import { ref } from 'vue';

/**
 * Message state
 */
const message = ref('Hello from Composition API');

/**
 * Updates the message
 */
function updateMessage() {
  message.value = 'Updated message!';
}
</script>
    `;
    const filePath = 'Composition.vue';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '<template>',
      '<script setup>',
      '// Composition API example',
      '* Message state',
      'updateMessage',
      '* Updates the message',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
