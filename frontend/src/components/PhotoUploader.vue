<template>
  <div class="photo-uploader">
    <!-- 拖拽上传区域 -->
    <div
      class="dropzone"
      :class="{ dragging }"
      @click="triggerFileInput"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <n-icon :component="ImagesOutline" :size="32" color="#8FB996" />
      <p class="dropzone-text">点击或拖拽照片到此处上传</p>
      <p class="dropzone-hint">支持 JPG / PNG / WebP，单张不超过 10MB</p>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden-input"
        @change="handleFileInputChange"
      />
    </div>

    <!-- 照片缩略图网格 -->
    <div v-if="items.length > 0" class="photo-grid">
      <div v-for="item in items" :key="item.uid" class="photo-cell">
        <img
          v-if="item.status === 'done' || item.photo"
          :src="item.photo?.thumbnailUrl || item.url"
          class="photo-thumb"
          alt="照片预览"
        />

        <!-- 上传中遮罩 + 进度条 -->
        <div v-if="item.status === 'uploading'" class="uploading-mask">
          <n-progress
            type="circle"
            :percentage="item.percent"
            :stroke-width="4"
            :show-indicator="true"
            color="#5B8C5A"
          />
        </div>

        <!-- 上传失败遮罩 -->
        <div v-else-if="item.status === 'error'" class="error-mask">
          <n-icon :component="AlertCircleOutline" :size="22" color="#fff" />
          <span>上传失败</span>
        </div>

        <!-- 删除按钮 -->
        <button
          v-if="item.status !== 'uploading'"
          type="button"
          class="remove-btn"
          @click.stop="handleRemove(item)"
        >
          <n-icon :component="CloseCircle" :size="18" color="#fff" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NIcon, NProgress, useMessage } from 'naive-ui'
import { AlertCircleOutline, CloseCircle, ImagesOutline } from '@vicons/ionicons5'
import { deletePhoto, uploadPhoto, type PhotoInfo } from '@/api/photo'

interface UploadItem {
  uid: string
  url: string // 本地预览 URL（上传中）
  status: 'uploading' | 'done' | 'error'
  percent: number
  photo?: PhotoInfo
}

const props = withDefaults(
  defineProps<{
    journeyId: number
    diaryId?: number
    /** 已有照片（编辑日记时回填） */
    modelValue?: PhotoInfo[]
    max?: number
  }>(),
  {
    modelValue: () => [],
    max: 20,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: PhotoInfo[]): void
}>()

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const items = ref<UploadItem[]>([])

// 初始化已有照片
if (props.modelValue.length > 0) {
  items.value = props.modelValue.map((photo) => ({
    uid: `exist-${photo.id}`,
    url: photo.thumbnailUrl || photo.originalUrl,
    status: 'done' as const,
    percent: 100,
    photo,
  }))
}

let uidCounter = 0

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    handleFiles(Array.from(target.files))
  }
  target.value = ''
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  const files = event.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

function handleFiles(files: File[]) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))

  if (imageFiles.length === 0) {
    message.warning('请选择图片文件')
    return
  }

  const remaining = props.max - items.value.length
  if (remaining <= 0) {
    message.warning(`最多上传 ${props.max} 张照片`)
    return
  }

  const toUpload = imageFiles.slice(0, remaining)
  if (imageFiles.length > remaining) {
    message.warning(`已达上限，仅上传前 ${remaining} 张`)
  }

  for (const file of toUpload) {
    if (file.size > 10 * 1024 * 1024) {
      message.warning(`「${file.name}」超过 10MB，已跳过`)
      continue
    }
    uploadSingle(file)
  }
}

function uploadSingle(file: File) {
  const uid = `upload-${++uidCounter}`
  const url = URL.createObjectURL(file)
  const item: UploadItem = { uid, url, status: 'uploading', percent: 0 }
  items.value.push(item)

  uploadPhoto({
    journeyId: props.journeyId,
    diaryId: props.diaryId,
    file,
    onProgress: (percent) => {
      item.percent = percent
    },
  })
    .then((response) => {
      item.status = 'done'
      item.percent = 100
      item.photo = response.data
      URL.revokeObjectURL(url)
      emitPhotos()
    })
    .catch((error) => {
      console.error('照片上传失败:', error)
      item.status = 'error'
    })
}

async function handleRemove(item: UploadItem) {
  // 已上传成功的照片调用后端删除
  if (item.photo) {
    try {
      await deletePhoto(item.photo.id)
    } catch (error) {
      console.error('删除照片失败:', error)
      // 仍然从前端移除
    }
  }
  items.value = items.value.filter((i) => i.uid !== item.uid)
  emitPhotos()
}

function emitPhotos() {
  const photos = items.value
    .map((item) => item.photo)
    .filter((photo): photo is PhotoInfo => !!photo)
  emit('update:modelValue', photos)
}
</script>

<style scoped>
.photo-uploader {
  width: 100%;
}

.dropzone {
  border: 2px dashed #c8d6c8;
  border-radius: 12px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #faf9f5;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: #5b8c5a;
  background-color: #f0f5f0;
}

.dropzone-text {
  margin: 8px 0 4px;
  font-size: 14px;
  color: #5b8c5a;
  font-weight: 500;
}

.dropzone-hint {
  margin: 0;
  font-size: 12px;
  color: #8fb996;
}

.hidden-input {
  display: none;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.photo-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background-color: #f0f0eb;
}

.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploading-mask,
.error-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background-color: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12px;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  width: 22px;
  height: 22px;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-cell:hover .remove-btn {
  opacity: 1;
}
</style>
