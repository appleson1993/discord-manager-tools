<template>
  <v-container class="pa-6">
    <v-card rounded="lg" variant="tonal">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        設定
      </v-card-title>
      <v-card-text>
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">Discord Bot Token</div>
          <v-text-field
            v-model="botToken"
            :type="showToken ? 'text' : 'password'"
            label="機器人 Token"
            placeholder="填入你的 Discord Bot Token"
            variant="outlined"
            density="comfortable"
            :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showToken = !showToken"
          />
          <div class="text-caption text-medium-emphasis">Token 會保存在本機使用者資料夾（userData/config/settings.json）。</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn variant="tonal" @click="testToken" :loading="testing">測試連線</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="closeSettings">關閉</v-btn>
        <v-btn color="primary" @click="save">儲存</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useElectron } from '../composables/useElectron'

const { loadSettings, saveSettings, discordTestToken } = useElectron()

const emit = defineEmits(['update:modelValue'])

const botToken = ref('')
const showToken = ref(false)
const testing = ref(false)

onMounted(async () => {
  const res = await loadSettings()
  if (res.success && res.data) {
    botToken.value = res.data.botToken || ''
  }
})

async function save() {
  const res = await saveSettings({ botToken: botToken.value })
  if (res.success) {
    alert('設定已儲存')
  } else {
    alert('儲存失敗：' + (res.error || '未知錯誤'))
  }
}

async function testToken() {
  testing.value = true
  try {
    const res = await discordTestToken(botToken.value)
    testing.value = false
    if (res.success) {
      alert('連線成功！')
    } else {
      alert('連線失敗：' + (res.error || '未知錯誤'))
    }
  } catch (err) {
    testing.value = false
    alert('發生錯誤：' + err.message)
  }
}

function closeSettings() {
  emit('update:modelValue', false)
}
</script>
