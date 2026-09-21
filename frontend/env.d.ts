/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// @wangeditor/editor-for-vue 的 package.json exports 未声明 types 路径，
// 此处补充类型声明，避免 TS 无法解析模块。
declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue'
  export const Editor: DefineComponent<
    {
      modelValue?: string
      defaultConfig?: Record<string, unknown>
      defaultContent?: unknown[]
      defaultHtml?: string
      mode?: string
    },
    {},
    any
  >
  export const Toolbar: DefineComponent<
    {
      editor?: unknown
      defaultConfig?: Record<string, unknown>
      mode?: string
    },
    {},
    any
  >
}
