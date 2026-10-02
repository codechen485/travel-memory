<template>
  <div class="profile-container">
    <!-- 导航栏（视觉由全局 main.css 统一） -->
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <main class="main-content">
      <n-spin :show="loading">
        <!-- 资料卡片 -->
        <section class="profile-card">
          <div class="profile-head">
            <div class="avatar-circle avatar-lg">
              <img v-if="profile?.avatar" :src="profile.avatar" alt="头像" />
              <span v-else>{{ avatarText }}</span>
            </div>
            <div class="profile-meta">
              <h2>{{ profile?.nickname || profile?.username || '' }}</h2>
              <p class="profile-sub">@{{ profile?.username }} · {{ profile?.email }}</p>
              <p class="profile-bio">{{ profile?.bio || '这位行囊旅人还没有写简介' }}</p>
            </div>
            <n-button secondary type="primary" @click="openEditModal">
              <template #icon>
                <n-icon :component="CreateOutline" />
              </template>
              编辑资料
            </n-button>
          </div>
          <div class="profile-stats">
            <div class="pstat">
              <strong>{{ profile?._count.journeys ?? 0 }}</strong>
              <span>旅程</span>
            </div>
            <div class="pstat">
              <strong>{{ profile?._count.copywritings ?? 0 }}</strong>
              <span>文案</span>
            </div>
            <div class="pstat">
              <strong>{{ profile?._count.collects ?? 0 }}</strong>
              <span>收藏</span>
            </div>
          </div>
          <!-- 我的收藏：与资料同卡，用分割线隔开 -->
          <div class="collect-section">
          <div class="section-head">
            <h3>我的收藏（{{ collected.length }}）</h3>
            <n-button quaternary size="small" @click="router.push('/copywritings')">
              我的文案集 →
            </n-button>
          </div>
          <n-spin :show="collectLoading">
            <div v-if="collected.length" class="collect-list">
              <article v-for="item in collected" :key="item.id" class="collect-item">
                <img
                  v-if="item.photo?.thumbnailUrl"
                  :src="item.photo.thumbnailUrl"
                  class="collect-thumb"
                  alt=""
                  loading="lazy"
                />
                <div class="collect-body">
                  <p class="collect-text">{{ item.finalVersion }}</p>
                  <div class="collect-tags">
                    <n-tag v-if="item.sceneTag" size="tiny" :bordered="false">
                      {{ getSceneLabel(item.sceneTag) }}
                    </n-tag>
                    <n-tag v-if="item.mood" size="tiny" :bordered="false">
                      {{ getMoodLabel(item.mood) }}
                    </n-tag>
                    <span class="collect-meta">
                      ♥ {{ item.likesCount }} · 收藏于 {{ formatDate(item.collectedAt) }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
            <n-empty
              v-else-if="!collectLoading"
              description="还没有收藏文案，去灵感漂流逛逛吧"
            >
              <template #extra>
                <n-button size="small" secondary type="primary" @click="router.push('/inspiration')">
                  去灵感漂流
                </n-button>
              </template>
            </n-empty>
          </n-spin>
          </div>
        </section>
      </n-spin>
    </main>

    <!-- 编辑资料弹窗 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑资料"
      :style="{ width: '480px', maxWidth: '92vw' }"
      :mask-closable="false"
    >
      <n-form label-placement="top">
        <n-form-item label="头像">
          <div class="avatar-field">
            <div class="avatar-circle avatar-md">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像预览" />
              <span v-else>{{ avatarText }}</span>
            </div>
            <div class="avatar-ops">
              <div class="avatar-btns">
                <n-upload
                  :show-file-list="false"
                  accept="image/*"
                  :max="1"
                  :custom-request="handleAvatarUpload"
                >
                  <n-button secondary size="small" :loading="avatarUploading">
                    {{ avatarUploading ? '上传中...' : editForm.avatar ? '更换头像' : '上传头像' }}
                  </n-button>
                </n-upload>
                <n-button
                  v-if="editForm.avatar"
                  quaternary
                  size="small"
                  type="error"
                  @click="editForm.avatar = ''"
                >
                  移除
                </n-button>
              </div>
              <p class="avatar-hint">支持 jpg / png 图片，10MB 以内，建议用正方形图</p>
            </div>
          </div>
        </n-form-item>
        <n-form-item label="昵称">
          <n-input
            v-model:value="editForm.nickname"
            placeholder="留空则显示用户名"
            :maxlength="50"
            show-count
            clearable
          />
        </n-form-item>
        <n-form-item label="简介">
          <n-input
            v-model:value="editForm.bio"
            type="textarea"
            placeholder="一句话介绍自己，如：记录路上的山河与日落"
            :maxlength="200"
            show-count
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="savingProfile" @click="handleSaveProfile">
            保存
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NTag,
  NSpin,
  NEmpty,
  NUpload,
  useMessage,
  type UploadCustomRequestOptions,
} from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import { getProfile, updateProfile, type UserProfile } from '@/api/user'
import { getCollectedCopywritings, type CollectedCopywriting } from '@/api/copywriting'
import { uploadImage } from '@/api/upload'
import AppNavbar from '@/components/AppNavbar.vue'
import { useUserStore } from '@/stores/user'
import { getSceneLabel } from '@/utils/scene'
import { getMoodLabel } from '@/utils/mood'
import { formatDate } from '@/utils/format'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const loading = ref(false)
const collectLoading = ref(false)
const profile = ref<UserProfile | null>(null)
const collected = ref<CollectedCopywriting[]>([])

const showEditModal = ref(false)
const savingProfile = ref(false)
const avatarUploading = ref(false)
const editForm = ref({ nickname: '', bio: '', avatar: '' })

/** 头像占位文字（昵称/用户名首字） */
const avatarText = computed(() => {
  const name = profile.value?.nickname || profile.value?.username || userStore.username
  return name ? name.charAt(0).toUpperCase() : '行'
})

onMounted(() => {
  fetchProfile()
  fetchCollected()
})

async function fetchProfile() {
  loading.value = true
  try {
    const res = await getProfile()
    profile.value = res.data
    // 同步到全局 store（导航栏等位置可用）
    userStore.setProfileInfo({
      avatar: res.data.avatar,
      nickname: res.data.nickname,
      bio: res.data.bio,
    })
  } catch (error) {
    console.error('获取个人资料失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchCollected() {
  collectLoading.value = true
  try {
    const res = await getCollectedCopywritings()
    collected.value = res.data
  } catch (error) {
    console.error('获取收藏列表失败:', error)
  } finally {
    collectLoading.value = false
  }
}

function openEditModal() {
  editForm.value = {
    nickname: profile.value?.nickname ?? '',
    bio: profile.value?.bio ?? '',
    avatar: profile.value?.avatar ?? '',
  }
  showEditModal.value = true
}

/** 头像上传：通用上传端点，只拿 URL */
async function handleAvatarUpload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  const raw = file.file
  if (!raw) {
    onError()
    return
  }
  if (raw.size > 10 * 1024 * 1024) {
    message.error('图片大小不能超过10MB')
    onError()
    return
  }

  avatarUploading.value = true
  try {
    const res = await uploadImage(raw)
    editForm.value.avatar = res.data.url
    message.success('头像已上传，记得保存')
    onFinish()
  } catch (error) {
    console.error('头像上传失败:', error)
    onError()
  } finally {
    avatarUploading.value = false
  }
}

async function handleSaveProfile() {
  savingProfile.value = true
  try {
    const res = await updateProfile({
      nickname: editForm.value.nickname.trim(),
      bio: editForm.value.bio.trim(),
      avatar: editForm.value.avatar,
    })
    profile.value = { ...profile.value, ...res.data } as UserProfile
    userStore.setProfileInfo({
      avatar: res.data.avatar,
      nickname: res.data.nickname,
      bio: res.data.bio,
    })
    message.success('资料已更新')
    showEditModal.value = false
  } catch (error) {
    console.error('更新资料失败:', error)
  } finally {
    savingProfile.value = false
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: var(--color-background);
}

.main-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 40px 60px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 资料卡片 */
.profile-card {
  background-color: var(--color-card);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-card);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 24px;
}

/* 圆形头像（自绘元素保证正圆，不依赖组件库尺寸） */
.avatar-circle {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary, #8fb996);
  color: #fff;
  font-weight: 600;
  letter-spacing: 1px;
  user-select: none;
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-lg {
  width: 84px;
  height: 84px;
  font-size: 34px;
}

.avatar-md {
  width: 72px;
  height: 72px;
  font-size: 28px;
}

.profile-meta {
  flex: 1;
  min-width: 0;
}

.profile-meta h2 {
  margin: 0 0 6px;
  font-size: 24px;
  color: var(--color-text);
}

.profile-sub {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-decoration);
}

.profile-bio {
  margin: 0;
  font-size: 14px;
  color: var(--color-secondary);
  line-height: 1.6;
}

.profile-stats {
  display: flex;
  gap: 48px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid rgba(212, 226, 212, 0.6);
}

.pstat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pstat strong {
  font-size: 24px;
  color: var(--color-primary);
}

.pstat span {
  font-size: 13px;
  color: var(--color-secondary);
}

/* 收藏列表 */
/* 收藏区：与资料同属一张卡片，顶部用分割线隔开 */
.collect-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid rgba(212, 226, 212, 0.6);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-head h3 {
  margin: 0;
  font-size: 17px;
  color: var(--color-text);
}

.collect-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collect-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background-color: rgba(212, 226, 212, 0.18);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.collect-item:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.collect-thumb {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.collect-body {
  flex: 1;
  min-width: 0;
}

.collect-text {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text);
}

.collect-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.collect-meta {
  font-size: 12px;
  color: var(--color-decoration);
}

/* 编辑弹窗 */
.avatar-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-ops {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.avatar-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-hint {
  margin: 0;
  font-size: 12px;
  color: #8fb996;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .main-content {
    padding: 20px 16px 40px;
  }

  .profile-card {
    padding: 20px;
  }

  /* 头部改纵向堆叠：头像居中 → 资料居中 → 按钮，
     避免横排时 meta 被 flex 压到几十 px 导致用户名/邮箱截断 */
  .profile-head {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
  }

  .profile-meta {
    width: 100%;
  }

  .profile-sub {
    word-break: break-word;
  }

  .profile-stats {
    gap: 12px;
    justify-content: space-between;
  }

  /* 收藏项：缩小缩略图 + 间距，给正文更多空间 */
  .collect-item {
    gap: 12px;
    padding: 12px;
  }

  .collect-thumb {
    width: 56px;
    height: 56px;
  }

  .section-head {
    flex-wrap: wrap;
    gap: 8px;
  }

  /* 编辑弹窗内头像行改纵向，避免上传按钮被挤出 */
  .avatar-field {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
