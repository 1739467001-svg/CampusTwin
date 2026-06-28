<script setup lang="ts">
import { computed } from 'vue'
import { useCampusStore } from '../stores/campus'
import AdminDashboard from './AdminDashboard.vue'

const store = useCampusStore()

// 联动 3D 聚焦
function onFocusBuilding(buildingId: string) {
  if (buildingId) {
    store.setFocusBuilding(buildingId)
    // 同时高亮该楼所有房间
    const building = store.buildings.find(b => b.id === buildingId)
    if (building) {
      const roomIds = building.floors.flatMap(f => f.rooms.map(r => r.id))
      store.highlightRooms(roomIds)
    }
  } else {
    store.setFocusBuilding(null)
    store.highlightRooms([])
  }
}

const panelTitle = computed(() => {
  if (store.viewMode === 'admin') return '管理态势'
  switch (store.activePanel) {
    case 'booking': return '预约服务台'
    case 'repair': return '设备报修'
    case 'admin': return '管理态势'
    case 'navigate': return '校园导航'
    default: return '服务台'
  }
})

const panelIcon = computed(() => {
  if (store.viewMode === 'admin') return 'chart'
  switch (store.activePanel) {
    case 'booking': return 'calendar'
    case 'repair': return 'wrench'
    case 'admin': return 'chart'
    case 'navigate': return 'map'
    default: return 'sparkles'
  }
})

// 候选房间
const candidateRooms = computed(() => {
  if (store.activePanel !== 'booking') return []
  return store.freeRooms
})

function confirmBooking(roomId: string) {
  const ok = store.bookRoom(roomId, '14:00', '16:00')
  if (ok) {
    store.addMessage('agent', `预约成功！房间已确认，凭证号：BK${Date.now().toString().slice(-6)}`)
  }
}

function submitRepair(roomId: string, deviceType: string) {
  const device = store.devices.find(d => d.roomId === roomId && d.type === deviceType)
  store.createTicket(device?.id || 'unknown', roomId, `${deviceType}故障`)
  store.addMessage('agent', `报修单已提交，工单号：TK${Date.now().toString().slice(-6)}，后勤将尽快处理。`)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 标题区 + 视图切换 -->
    <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-brand-gold/10 flex items-center justify-center">
          <svg v-if="panelIcon === 'calendar'" class="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <svg v-else-if="panelIcon === 'wrench'" class="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
          <svg v-else-if="panelIcon === 'chart'" class="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <svg v-else class="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <span class="text-sm font-medium text-brand-navy">{{ panelTitle }}</span>
      </div>

      <!-- 师生端 / 管理端 切换 -->
      <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
        <button
          @click="store.setViewMode('student')"
          :class="['px-2.5 py-1 rounded-md text-[11px] font-medium transition', store.viewMode === 'student' ? 'bg-white text-brand-navy shadow-sm' : 'text-text-secondary hover:text-text-primary']"
        >师生端</button>
        <button
          @click="store.setViewMode('admin'); store.setActivePanel('admin')"
          :class="['px-2.5 py-1 rounded-md text-[11px] font-medium transition', store.viewMode === 'admin' ? 'bg-white text-brand-navy shadow-sm' : 'text-text-secondary hover:text-text-primary']"
        >管理端</button>
      </div>
    </div>

    <!-- 面板内容区 -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <!-- 管理端视图（由 Dashboard 接管全部内容） -->
      <template v-if="store.viewMode === 'admin'">
        <AdminDashboard @focus-building="onFocusBuilding" />
      </template>

      <!-- 师生端视图 -->
      <template v-else>
        <!-- 新生/无障碍提示条 -->
        <div v-if="store.accessibilityMode" class="mb-3 p-2.5 rounded-lg bg-brand-navy/5 border border-brand-navy/10 flex items-center gap-2">
          <svg class="w-4 h-4 text-brand-navy" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <span class="text-[11px] text-brand-navy font-medium">新生友好模式已开启</span>
          <span class="text-[10px] text-text-secondary ml-auto">字号放大 · 操作高亮</span>
        </div>

        <!-- 默认空态 -->
        <div v-if="store.activePanel === 'none'" class="text-center py-12">
          <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p class="text-text-secondary text-sm">在左侧对话区输入指令</p>
          <p class="text-text-secondary/60 text-xs mt-1">系统将自动切换对应服务面板</p>
        </div>

        <!-- 预约面板 -->
        <div v-else-if="store.activePanel === 'booking'" class="space-y-3">
          <div class="text-xs text-text-secondary font-medium">候选房间（{{ candidateRooms.length }}）</div>
          <div v-for="room in candidateRooms" :key="room.id" class="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-brand-blue/30 hover:shadow-sm transition cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span :class="['w-2 h-2 rounded-full', room.status === 'free' ? 'bg-status-free' : room.status === 'busy' ? 'bg-status-busy' : 'bg-status-repair']"></span>
                <span class="text-sm font-medium text-text-primary">{{ room.name }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-text-secondary">{{ room.type === 'meeting' ? '会议室' : room.type === 'classroom' ? '教室' : room.type === 'lab' ? '实验室' : '场馆' }}</span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-text-secondary">
              <span>容量 {{ room.capacity }} 人</span>
              <span>{{ room.equipment.join(' · ') }}</span>
            </div>
            <button @click="confirmBooking(room.id)" class="mt-2 w-full py-1.5 rounded-lg bg-brand-blue text-white text-xs font-medium hover:bg-brand-blue/90 active:scale-[0.98] transition">
              确认预约
            </button>
          </div>
          <div v-if="!candidateRooms.length" class="text-center py-8 text-text-secondary text-sm">暂无可用房间</div>
        </div>

        <!-- 报修面板 -->
        <div v-else-if="store.activePanel === 'repair'" class="space-y-3">
          <div class="text-xs text-text-secondary font-medium">快速报修</div>
          <div v-for="room in store.allRooms.filter(r => r.status !== 'repair')" :key="room.id" class="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <div class="text-sm font-medium text-text-primary">{{ room.name }}</div>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <button
                v-for="eq in room.equipment" :key="eq"
                @click="submitRepair(room.id, eq === '投影' ? 'projector' : eq === '空调' ? 'ac' : eq === '灯光' ? 'light' : 'mic')"
                class="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs text-text-secondary hover:border-status-repair hover:text-status-repair transition"
              >{{ eq }} 报修</button>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="text-xs text-text-secondary font-medium mb-2">我的工单</div>
            <div v-for="tk in store.tickets" :key="tk.id" class="p-2.5 rounded-lg bg-gray-50 border border-gray-100 mb-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-text-primary">{{ tk.id }}</span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded', tk.status === 'new' ? 'bg-status-repair/10 text-status-repair' : tk.status === 'doing' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-status-free/10 text-status-free']">
                  {{ tk.status === 'new' ? '待受理' : tk.status === 'doing' ? '处理中' : '已完成' }}
                </span>
              </div>
              <div class="text-[11px] text-text-secondary mt-1">{{ tk.desc }} · {{ tk.assignee }}</div>
            </div>
          </div>
        </div>

        <!-- 导航面板（占位） -->
        <div v-else-if="store.activePanel === 'navigate'" class="text-center py-12 text-text-secondary text-sm">
          导航功能将在后续版本接入
        </div>
      </template>
    </div>

    <!-- 底部工具栏：无障碍开关 -->
    <div class="shrink-0 px-4 py-2 border-t border-gray-100 flex items-center justify-between bg-white">
      <div class="flex items-center gap-1.5">
        <button
          @click="store.setAccessibilityMode(!store.accessibilityMode)"
          :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition border', store.accessibilityMode ? 'bg-brand-navy/5 border-brand-navy/20 text-brand-navy' : 'bg-gray-50 border-gray-200 text-text-secondary hover:bg-gray-100']"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          {{ store.accessibilityMode ? '新生友好模式开' : '新生友好模式' }}
        </button>
        <span class="text-[10px] text-text-secondary/50">{{ store.accessibilityMode ? '字号已放大' : '点击放大字号' }}</span>
      </div>
      <div class="text-[10px] text-text-secondary/40">诚毅勤朴 · 浙江工商大学</div>
    </div>
  </div>
</template>
