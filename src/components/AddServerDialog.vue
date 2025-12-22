<template>
  <v-dialog v-model="open" max-width="520">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center">
        <span class="text-h6">連接伺服器</span>
        <v-spacer />
        <v-btn icon variant="text" @click="open = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text>
        <v-text-field
          ref="serverNameInput"
          v-model="serverName"
          label="自訂名稱（選填）"
          placeholder="給這個連接取個名字"
          variant="outlined"
          density="comfortable"
          @keyup.enter="addServer"
        />

        <v-text-field
          v-model="serverId"
          label="Discord Guild ID（必填）"
          placeholder="例如：123456789012345678"
          variant="outlined"
          density="comfortable"
          :rules="[v => !!v || '必填']"
          @keyup.enter="addServer"
        />

        <div class="text-subtitle-2 mb-2">顏色</div>
        <div class="d-flex flex-wrap ga-3">
          <v-btn
            v-for="color in colors"
            :key="color"
            :color="color"
            :variant="selectedColor === color ? 'flat' : 'outlined'"
            size="small"
            icon
            @click="selectedColor = color"
          />
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('close')">取消</v-btn>
        <v-btn color="primary" :disabled="!serverId" @click="addServer">新增</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'add', 'update:show'])

const open = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const serverNameInput = ref(null)
const serverName = ref('')
const serverId = ref('')
const selectedColor = ref('#5865f2')

const colors = [
  '#5865f2', '#57f287', '#fee75c', '#eb459e',
  '#ed4245', '#f26522', '#9146ff', '#00d9ff'
]

// 當對話框開啟時，焦點到第一個輸入框
watch(open, async (val) => {
  if (val) {
    await nextTick()
    serverNameInput.value?.focus?.()
  }
})

function addServer() {
  if (!serverId.value) {
    alert('Guild ID 必填')
    return
  }

  const newServer = {
    id: Date.now().toString(),
    guildId: serverId.value,
    name: serverName.value,
    color: selectedColor.value,
    categories: []
  }

  emit('add', newServer)
  // Reset form
  serverName.value = ''
  serverId.value = ''
  selectedColor.value = '#5865f2'
  open.value = false
}
</script>

<style scoped>
/* Vuetify handles most styling */
</style>

