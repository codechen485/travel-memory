<template>
  <div class="rich-editor">
    <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" class="editor-toolbar" />
    <!-- 用自有 div 承载高度，避免依赖 Editor 组件根节点继承 class -->
    <div class="editor-content">
      <Editor
        v-model="valueHtml"
        :defaultConfig="editorConfig"
        :mode="mode"
        @onCreated="handleCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { uploadPhoto } from '@/api/photo'

const props = withDefaults(
  defineProps<{
    modelValue: string
    journeyId: number
    placeholder?: string
    disabled?: boolean
    mode?: string
  }>(),
  {
    placeholder: '记录此刻的心情与风景...',
    disabled: false,
    mode: 'default',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorRef = shallowRef<IDomEditor>()

const valueHtml = ref(props.modelValue)

// 同步外部传入的值（仅初次与编辑模式回填时）
watch(
  () => props.modelValue,
  (val) => {
    if (val !== valueHtml.value) {
      valueHtml.value = val
    }
  },
)

// 内容变化时通知父组件
watch(valueHtml, (val) => {
  emit('update:modelValue', val)
})

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video', 'fullScreen'],
}

const editorConfig = computed<Partial<IEditorConfig>>(() => ({
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      // 编辑器内插入图片时也走统一的上传接口
      async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
        try {
          const res = await uploadPhoto({ journeyId: props.journeyId, file })
          insertFn(res.data.originalUrl, file.name, res.data.originalUrl)
        } catch (error) {
          console.error('编辑器图片上传失败:', error)
        }
      },
    },
  },
}))

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
  if (props.disabled) {
    editor.disable()
  }
}

// 切换只读状态
watch(
  () => props.disabled,
  (disabled) => {
    const editor = editorRef.value
    if (!editor) return
    if (disabled) {
      editor.disable()
    } else {
      editor.enable()
    }
  },
)

// 组件销毁时清理编辑器实例，避免内存泄漏
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
  editorRef.value = undefined
})
</script>

<style scoped>
.rich-editor {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  /* 不能 overflow:hidden，否则工具栏下拉面板（标题/表情等）会被裁切 */
  overflow: visible;
  background-color: #fff;
}

.editor-toolbar {
  border-bottom: 1px solid #e8e8e8;
  background-color: #fafafa;
  border-radius: 8px 8px 0 0;
}

.editor-content {
  height: 320px;
  background-color: #fff;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

:deep(.editor-content .w-e-text-container) {
  height: 100% !important;
}
</style>
