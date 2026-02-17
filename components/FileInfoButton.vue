<template>
  <button
    @click="handleClick"
    class="file-info-button"
    title="Részletek"
  >
    <Icon name="info" :size="16" />
  </button>
</template>

<script setup lang="ts">
import Icon from '@admin/components/ui/Icon.vue'
import type { MediaFile } from '../services/mediaFileService'

interface Props {
  file: MediaFile
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'show-info': [file: MediaFile]
}>()

const handleClick = (event: Event) => {
  event.stopPropagation()
  emit('show-info', props.file)
}
</script>

<style scoped>
.file-info-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-info-button:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  transform: scale(1.1);
}
</style>

