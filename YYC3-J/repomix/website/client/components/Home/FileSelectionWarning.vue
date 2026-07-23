<template>
  <div class="warning-message">
    <div class="warning-icon">⚠️</div>
    <div class="warning-text">
      <slot>
        Selecting more than {{ threshold }} files may cause processing issues or timeouts. Consider reducing your selection for better performance.
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  threshold: number;
}

defineProps<Props>();
</script>

<style scoped>
.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-warning-soft);
  border: 1px solid var(--vp-c-warning);
  border-radius: 4px;
  margin-bottom: 8px;
}

.warning-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.warning-text {
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}
</style>