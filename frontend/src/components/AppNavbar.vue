<template>
  <nav class="navbar">
    <div class="navbar-content">
      <div class="logo" @click="router.push('/')">
        <h1>🌿 行囊</h1>
      </div>

      <div class="nav-links">
        <button
          v-for="link in NAV_LINKS"
          :key="link.path"
          class="nav-link"
          :class="{ active: isActive(link.path) }"
          @click="router.push(link.path)"
        >
          {{ link.label }}
        </button>
      </div>

      <div class="nav-right">
        <slot name="actions" />
        <n-dropdown :options="dropdownOptions" trigger="click" @select="handleDropdownSelect">
          <button class="user-trigger">
            <span class="user-avatar">
              <img v-if="userStore.avatar" :src="userStore.avatar" alt="" />
              <em v-else>{{ avatarText }}</em>
            </span>
            <span class="user-name">{{ displayName }}</span>
            <n-icon :component="ChevronDownOutline" :size="14" color="#8fb996" class="chevron" />
          </button>
        </n-dropdown>

        <!-- 移动端汉堡菜单按钮（≤768px 显示） -->
        <button
          class="nav-toggle"
          :aria-expanded="menuOpen"
          aria-label="切换导航菜单"
          @click="menuOpen = !menuOpen"
        >
          <n-icon :component="menuOpen ? CloseOutline : MenuOutline" :size="24" />
        </button>
      </div>
    </div>

    <!-- 移动端折叠导航面板（绝对定位下拉，不推挤页面内容） -->
    <div v-show="menuOpen" class="mobile-nav">
      <button
        v-for="link in NAV_LINKS"
        :key="link.path"
        class="mobile-nav-link"
        :class="{ active: isActive(link.path) }"
        @click="handleMobileNav(link.path)"
      >
        {{ link.label }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NDropdown, NIcon, useMessage } from 'naive-ui'
import { ChevronDownOutline, MenuOutline, CloseOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'

/** 全局导航链接（与路由保持一致） */
const NAV_LINKS = [
  { label: '首页', path: '/' },
  { label: '我的旅程', path: '/journeys' },
  { label: '灵感漂流', path: '/inspiration' },
  { label: '文案集', path: '/copywritings' },
  { label: '旅行足迹', path: '/stats' },
]

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const message = useMessage()

/** 移动端折叠菜单开关 */
const menuOpen = ref(false)

// 路由变化时自动收起移动端菜单
watch(
  () => route.path,
  () => {
    menuOpen.value = false
  },
)

/** 下拉按钮显示昵称（未设置时回退用户名） */
const displayName = computed(() => userStore.nickname || userStore.username)

/** 头像占位文字（昵称/用户名首字） */
const avatarText = computed(() => {
  const name = userStore.nickname || userStore.username
  return name ? name.charAt(0).toUpperCase() : '行'
})

const dropdownOptions = [
  { label: '个人中心', key: 'profile' },
  { label: '退出登录', key: 'logout' },
]

/** 当前路由是否命中链接（首页精确匹配，其余前缀匹配） */
function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

function handleDropdownSelect(key: string) {
  if (key === 'profile') {
    router.push('/profile')
  } else if (key === 'logout') {
    userStore.logout()
    message.success('已退出登录')
  }
}

/** 移动端点击导航项：跳转并收起菜单 */
function handleMobileNav(path: string) {
  router.push(path)
  menuOpen.value = false
}
</script>

<style scoped>
/* 导航栏视觉（背景/毛玻璃/吸顶）统一在全局 main.css .navbar */
.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  cursor: pointer;
  flex-shrink: 0;
}

.logo h1 {
  font-size: 22px;
  color: var(--color-primary, #5b8c5a);
  margin: 0;
  font-weight: 600;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-link {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-secondary, #8fb996);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.nav-link:hover {
  background-color: rgba(91, 140, 90, 0.08);
  color: var(--color-primary, #5b8c5a);
}

.nav-link.active {
  color: var(--color-primary, #5b8c5a);
  font-weight: 600;
  background-color: rgba(91, 140, 90, 0.12);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 用户入口：头像 + 昵称 + 下拉箭头 */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s ease;
}

.user-trigger:hover {
  background-color: rgba(91, 140, 90, 0.1);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary, #8fb996);
  color: #fff;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.user-avatar em {
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  color: #3d3d3d;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 移动端汉堡按钮：桌面默认隐藏 */
.nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-primary, #5b8c5a);
}

/* 移动端折叠导航面板：桌面默认隐藏 */
.mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .navbar-content {
    padding: 0 12px;
    gap: 8px;
    justify-content: space-between;
  }

  /* 桌面内联导航隐藏，改用汉堡折叠菜单 */
  .nav-links {
    display: none;
  }

  .nav-toggle {
    display: flex;
  }

  /* 右侧只保留头像，隐藏昵称与箭头，避免超出小屏宽度 */
  .user-name,
  .chevron {
    display: none;
  }

  .user-trigger {
    padding: 4px;
  }

  /* 折叠面板：绝对定位于导航栏下方，覆盖页面内容而不推挤 */
  .mobile-nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 99;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px 14px;
    background-color: rgba(255, 255, 255, 0.98);
    border-bottom: 1px solid rgba(212, 226, 212, 0.6);
    box-shadow: 0 8px 20px rgba(91, 140, 90, 0.12);
  }

  .mobile-nav-link {
    border: none;
    background: transparent;
    text-align: left;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 15px;
    font-family: inherit;
    color: var(--color-secondary, #8fb996);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;
  }

  .mobile-nav-link:hover {
    background-color: rgba(91, 140, 90, 0.08);
  }

  .mobile-nav-link.active {
    color: var(--color-primary, #5b8c5a);
    font-weight: 600;
    background-color: rgba(91, 140, 90, 0.12);
  }
}
</style>
