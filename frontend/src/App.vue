<script setup lang="ts">
import { RouterView } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  dateZhCN,
  zhCN,
  type GlobalThemeOverrides,
} from 'naive-ui'

// 《行囊》主题色配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#5B8C5A',
    primaryColorHover: '#6FA06E',
    primaryColorPressed: '#4A7A49',
    primaryColorSuppl: '#6FA06E',
    borderRadius: '8px',
  },
  Button: {
    borderRadiusMedium: '24px',
    borderRadiusLarge: '24px',
    borderRadiusSmall: '24px',
  },
  Input: {
    borderRadius: '8px',
    borderHover: '#8FB996',
    borderFocus: '#5B8C5A',
  },
  Card: {
    borderRadius: '16px',
  },
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <RouterView />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped></style>
