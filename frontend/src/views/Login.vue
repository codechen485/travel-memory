<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>🌿 行囊</h1>
        <p>每一次出发，都值得被好好安放</p>
      </div>

      <n-form ref="loginFormRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item path="username">
          <n-input v-model:value="loginForm.username" placeholder="请输入用户名" clearable>
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password">
          <n-input
            v-model:value="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
            clearable
          >
            <template #prefix>
              <n-icon :component="LockClosed" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item>
          <n-button
            type="primary"
            attr-type="submit"
            :loading="loading"
            block
            size="large"
            class="login-btn"
          >
            {{ loading ? '登录中...' : '登录' }}
          </n-button>
        </n-form-item>

        <div class="login-footer">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { NForm, NFormItem, NInput, NButton, NIcon, type FormInst, type FormRules } from 'naive-ui'
import { PersonOutline, LockClosed } from '@vicons/ionicons5'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInst>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    const success = await userStore.userLogin(loginForm)

    if (success) {
      await router.push('/')
    }
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f7f5f0 0%, #d4e2d4 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(91, 140, 90, 0.08);
  /* 入场动画：淡入 + 上浮 */
  animation: card-enter 0.5s ease both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 32px;
  color: var(--color-primary, #5b8c5a);
  margin: 0 0 10px 0;
  font-weight: 600;
}

.login-header p {
  color: var(--color-secondary, #8fb996);
  font-size: 14px;
  margin: 0;
  letter-spacing: 1px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  color: var(--color-secondary, #8fb996);
  font-size: 14px;
}

.link {
  color: #5b8c5a;
  text-decoration: none;
  font-weight: 500;
  margin-left: 5px;
}

.link:hover {
  color: #4a7a49;
  text-decoration: underline;
}
</style>
