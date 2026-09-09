<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h1>🌿 行囊</h1>
        <p>创建你的旅行记忆空间</p>
      </div>

      <n-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        @submit.prevent="handleRegister"
      >
        <n-form-item path="username">
          <n-input
            v-model:value="registerForm.username"
            placeholder="请输入用户名（3-50个字符）"
            clearable
          >
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="email">
          <n-input v-model:value="registerForm.email" placeholder="请输入邮箱地址" clearable>
            <template #prefix>
              <n-icon :component="MailOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password">
          <n-input
            v-model:value="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6个字符）"
            show-password-on="click"
            clearable
          >
            <template #prefix>
              <n-icon :component="LockClosed" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="confirmPassword">
          <n-input
            v-model:value="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
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
            class="register-btn"
          >
            {{ loading ? '注册中...' : '注册' }}
          </n-button>
        </n-form-item>

        <div class="register-footer">
          <span>已有账号？</span>
          <router-link to="/login" class="link">立即登录</router-link>
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
import { PersonOutline, MailOutline, LockClosed } from '@vicons/ionicons5'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref<FormInst>()
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// 自定义验证规则：确认密码
const validateConfirmPassword = (rule: any, value: string) => {
  if (value === '') {
    return new Error('请再次输入密码')
  } else if (value !== registerForm.password) {
    return new Error('两次输入的密码不一致')
  }
  return true
}

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  try {
    await registerFormRef.value.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    const { confirmPassword, ...registerData } = registerForm

    const success = await userStore.userRegister(registerData)

    if (success) {
      await router.push('/')
    }
  } catch (error) {
    console.error('注册失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f7f5f0 0%, #d4e2d4 100%);
  padding: 20px;
}

.register-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(91, 140, 90, 0.08);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  font-size: 32px;
  color: #5b8c5a;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.register-header p {
  color: #8fb996;
  font-size: 14px;
  margin: 0;
}

.register-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.register-footer {
  text-align: center;
  margin-top: 20px;
  color: #8fb996;
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
