<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { isValidRemoteValue } from '../utils/validation';
import PackButton from './PackButton.vue';

const props = defineProps<{
  url: string;
  loading: boolean;
  showButton?: boolean;
}>();

const emit = defineEmits<{
  'update:url': [value: string];
  submit: [];
  keydown: [event: KeyboardEvent];
  cancel: [];
}>();

const isValidUrl = computed(() => {
  if (!props.url) return false;
  return isValidRemoteValue(props.url.trim());
});

// Array to manage input history
const urlHistory = ref<string[]>([]);
const historyListId = 'repository-url-history';

// Load URL history when component is mounted
onMounted(() => {
  loadUrlHistory();
});

// Load URL history from localStorage
function loadUrlHistory() {
  try {
    const savedHistory = localStorage.getItem('repomix-url-history');
    if (savedHistory) {
      urlHistory.value = JSON.parse(savedHistory);
    }
  } catch (error) {
    console.error('Failed to load URL history from localStorage:', error);
    // Continue with empty history rather than displaying an error to the user
    // as this is a non-critical feature
    urlHistory.value = [];
  }
}

// Save URL to history
function saveUrlToHistory(url: string) {
  if (!url) return;

  const trimmedUrl = url.trim();
  if (!isValidRemoteValue(trimmedUrl)) return;

  // Remove existing entry and add to the beginning
  const filteredHistory = urlHistory.value.filter((item) => item !== trimmedUrl);
  urlHistory.value = [trimmedUrl, ...filteredHistory].slice(0, 5); // Keep only the latest 10 entries

  try {
    localStorage.setItem('repomix-url-history', JSON.stringify(urlHistory.value));
  } catch (error) {
    console.error('Failed to save URL history to localStorage:', error);
    // Non-critical error, so we don't need to show it to the user
  }
}

function handleUrlInput(event: Event) {
  const input = event.target as HTMLInputElement;
  emit('update:url', input.value);
}

// Process and save valid URL
function processValidUrl() {
  if (isValidUrl.value) {
    saveUrlToHistory(props.url);
  }
}

function handleSubmit() {
  processValidUrl();
  emit('submit');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && isValidUrl.value) {
    processValidUrl();
  }
  emit('keydown', event);
}
</script>

<template>
  <div class="input-group">
    <div class="url-input-container">
      <input
        :value="url"
        @input="handleUrlInput"
        @keydown="handleKeydown"
        type="text"
        placeholder="GitHub repository URL or user/repo (e.g., yamadashy/repomix)"
        class="repository-input"
        :class="{ 'invalid': url && !isValidUrl }"
        aria-label="GitHub repository URL"
        autocomplete="on"
        :list="historyListId"
      />
      <datalist :id="historyListId">
        <option v-for="historyUrl in urlHistory" :key="historyUrl" :value="historyUrl" />
      </datalist>
    </div>

    <div v-if="url && !isValidUrl" class="url-warning">
      <AlertTriangle class="warning-icon" :size="16" />
      <span>Please enter a valid GitHub repository URL (e.g., yamadashy/repomix)</span>
    </div>
    <div v-if="showButton" class="pack-button-container">
      <PackButton :isValid="isValidUrl" :loading="loading" @click="handleSubmit" @cancel="$emit('cancel')"/>
    </div>
  </div>
</template>

<style scoped>
.input-group {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.url-input-container {
  flex: 1;
  position: relative;
  height: 100%;
}

.repository-input {
  width: 100%;
  height: 50px;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color 0.2s;
  /* Hide datalist dropdown arrow in different browsers */
  &::-webkit-calendar-picker-indicator {
    display: none !important;
  }
  &::-webkit-list-button {
    display: none !important;
  }
  &::-webkit-inner-spin-button {
    display: none !important;
  }
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
}

.repository-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.repository-input.invalid {
  border-color: var(--vp-c-danger-1);
}

.url-warning {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-warning-1);
  font-size: 14px;
}

.warning-icon {
  flex-shrink: 0;
  color: var(--vp-c-warning-1);
}

.pack-button-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>
