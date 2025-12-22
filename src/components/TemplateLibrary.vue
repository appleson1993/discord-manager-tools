<template>
  <v-dialog v-model="open" max-width="900">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center">
        <span class="text-h6">模板庫</span>
        <v-spacer />
        <v-btn icon variant="text" @click="open = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text>
        <v-row>
          <v-col
            v-for="template in templates"
            :key="template.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              variant="tonal"
              class="template-card"
              rounded="lg"
              @click="selectTemplate(template)"
            >
              <v-card-text class="text-center">
                <div class="text-h3 mb-2">{{ template.icon }}</div>
                <div class="text-subtitle-1 font-weight-bold mb-1">{{ template.name }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ template.description }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="tonal" :disabled="!hasSelectedServer" @click="importTemplate">
          <v-icon start icon="mdi-import" />
          匯入模板
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useElectron } from '../composables/useElectron'

const props = defineProps({
  show: Boolean,
  hasSelectedServer: Boolean
})

const emit = defineEmits(['close', 'apply', 'update:show'])
const { importTemplate: importTemplateFile } = useElectron()

const open = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const templates = ref([
  {
    id: 'gaming',
    name: '遊戲社群',
    icon: '🎮',
    description: '適合遊戲討論與組隊的頻道結構',
    categories: [
      {
        id: '1',
        name: '公告區',
        channels: [
          { id: '1-1', name: '規則', type: 'announcement', topic: '伺服器規則' },
          { id: '1-2', name: '更新公告', type: 'announcement', topic: '最新消息' }
        ]
      },
      {
        id: '2',
        name: '遊戲討論',
        channels: [
          { id: '2-1', name: '一般聊天', type: 'text' },
          { id: '2-2', name: '組隊招募', type: 'text' }
        ]
      },
      {
        id: '3',
        name: '語音頻道',
        channels: [
          { id: '3-1', name: '語音房1', type: 'voice' },
          { id: '3-2', name: '語音房2', type: 'voice' }
        ]
      }
    ]
  },
  {
    id: 'study',
    name: '學習群組',
    icon: '📚',
    description: '適合課程學習與討論的結構',
    categories: [
      {
        id: '1',
        name: '課程資訊',
        channels: [
          { id: '1-1', name: '課程公告', type: 'announcement' },
          { id: '1-2', name: '資源分享', type: 'text' }
        ]
      },
      {
        id: '2',
        name: '學習討論',
        channels: [
          { id: '2-1', name: '問題討論', type: 'text' },
          { id: '2-2', name: '作業繳交', type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'company',
    name: '公司團隊',
    icon: '💼',
    description: '適合團隊協作的頻道配置',
    categories: [
      {
        id: '1',
        name: '公司公告',
        channels: [
          { id: '1-1', name: '重要通知', type: 'announcement' },
          { id: '1-2', name: '會議紀錄', type: 'text' }
        ]
      },
      {
        id: '2',
        name: '專案管理',
        channels: [
          { id: '2-1', name: '專案A', type: 'text' },
          { id: '2-2', name: '專案B', type: 'text' }
        ]
      }
    ]
  }
])

function selectTemplate(template) {
  if (confirm(`確定要套用「${template.name}」模板嗎？`)) {
    emit('apply', template)
  }
}

async function importTemplate() {
  const result = await importTemplateFile()
  if (result.success && result.template) {
    emit('apply', result.template)
  }
}
</script>

<style scoped>
.template-card {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.template-card:hover {
  transform: translateY(-2px);
}
</style>
