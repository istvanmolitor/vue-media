# MediaFilePicker Component

A Vue component for selecting media files from the media library.

## Features

- Browse media files by folders
- Search for files by name
- Filter by file type (MIME type)
- Preview images
- Select and return file URL

## Usage

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MediaFilePicker } from '@/packages/vue-media'

const imageUrl = ref('')
</script>

<template>
  <MediaFilePicker v-model="imageUrl" />
</template>
```

### With Image Type Filter

```vue
<template>
  <MediaFilePicker 
    v-model="imageUrl"
    :accept-types="['image/*']"
  />
</template>
```

### Specific MIME Types

```vue
<template>
  <MediaFilePicker 
    v-model="fileUrl"
    :accept-types="['image/jpeg', 'image/png', 'image/gif']"
  />
</template>
```

### Without Preview

```vue
<template>
  <MediaFilePicker 
    v-model="fileUrl"
    :show-preview="false"
  />
</template>
```

### Listen to Selection Event

```vue
<script setup lang="ts">
import { MediaFilePicker, type MediaFile } from '@/packages/vue-media'

const handleFileSelect = (file: MediaFile) => {
  console.log('Selected file:', file)
}
</script>

<template>
  <MediaFilePicker 
    v-model="imageUrl"
    @select="handleFileSelect"
  />
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | The selected file URL (v-model) |
| `acceptTypes` | `string[]` | `[]` | Array of accepted MIME types. Use `'image/*'` for all images, `'video/*'` for videos, etc. |
| `showPreview` | `boolean` | `true` | Whether to show image preview below the input |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when a file is selected, contains the file URL |
| `select` | `MediaFile` | Emitted when a file is selected, contains the full file object |

## Integration with CMS

The MediaFilePicker is already integrated with the CMS package's `ImageElementEditor` component:

```vue
<!-- This is automatically used in ImageElementEditor -->
<MediaFilePicker 
  v-model="url"
  :accept-types="['image/*']"
  :show-preview="true"
/>
```

When editing image elements in the CMS, users can now browse and select images from the media library instead of manually typing URLs.

