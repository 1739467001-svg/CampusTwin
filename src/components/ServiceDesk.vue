<script setup lang="ts">
import { computed } from 'vue'
import { useCampusStore } from '../stores/campus'
import AdminDashboard from './AdminDashboard.vue'

const store = useCampusStore()

function onFocusBuilding(buildingId: string) {
  if (buildingId) {
    store.setFocusBuilding(buildingId)
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
  if (store.viewMode === 'admin') return '管理态势中心'
  switch (store.activePanel) {
    case 'booking': return '预约服务台'
    case 'repair': return '设备报修台'
    case 'navigate': return '校园导航'
    default: return '一站式服务台'
  }
})

const candidateRooms = computed(() => {
  if (store.activePanel !== 'booking') return []
  return store.freeRooms
})

function confirmBooking(roomId: string) {
  const ok = store.bookRoom(roomId, '14:00', '16:00')
  if (ok) {
    store.addMessage('agent', `预约成功！凭证号 BK${Date.now().toString().slice(-6)}，已同步至您的日历。`)
  }
}

function submitRepair(roomId: string, deviceType: string) {
  const device = store.devices.find(d => d.roomId === roomId && d.type === deviceType)
  store.createTicket(device?.id || 'unknown', roomId, `${deviceType}故障`)
  store.addMessage('agent', `报修单已提交，工单号 TK${Date.now().toString().slice(-6)}，后勤将尽快处理。`)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 标题区 -->
    <div class="px-5 py-3.5 flex items-center justify-between shrink-0" style="border-bottom: 1px solid rgba(148,163,184,0.12);">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-md flex items-center justify-center" style="background: rgba(184,134,11,0.08);">
          <svg class="w-4 h-4" style="color: #b8860b;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        </div>
        <span class="text-sm font-medium" style="color: #1e293b;">{{ panelTitle }}</span>
      </div>
      <div class="flex items-center rounded-lg p-0.5" style="background: #f1f5f9;">
        <button
          @click="store.setViewMode('student')"
          :class="['px-2.5 py-1 rounded-md text-[11px] font-medium transition', store.viewMode === 'student' ? 'bg-white shadow-sm text-[#0e3a67]' : 'text-[#94a3b8]']"
        >师生端</button>
        <button
          @click="store.setViewMode('admin'); store.setActivePanel('admin')"
          :class="['px-2.5 py-1 rounded-md text-[11px] font-medium transition', store.viewMode === 'admin' ? 'bg-white shadow-sm text-[#0e3a67]' : 'text-[#94a3b8]']"
        >管理端</button>
      </div>
    </div>

    <!-- 面板内容区 -->
    <div class="flex-1 overflow-y-auto px-4 py-4">
      <!-- 管理端 -->
      <template v-if="store.viewMode === 'admin'">
        <AdminDashboard @focus-building="onFocusBuilding" />
      </template>

      <!-- 师生端 -->
      <template v-else>
        <!-- 无障碍提示 -->
        <div v-if="store.accessibilityMode" class="mb-4 p-3 rounded-xl flex items-center gap-2" style="background: rgba(14,58,103,0.04); border: 1px solid rgba(14,58,103,0.08);">
          <svg class="w-4 h-4" style="color: #0e3a67;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <span class="text-[12px] font-medium" style="color: #0e3a67;">新生友好模式</span>
          <span class="text-[11px] ml-auto" style="color: #94a3b8;">字号已放大 · 操作高亮</span>
        </div>

        <!-- 空态 -->
        <div v-if="store.activePanel === 'none'" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0);">
            <svg class="w-7 h-7" style="color: #94a3b8;" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p class="text-[14px] font-medium mb-1" style="color: #475569;">在左侧对话区输入指令</p>
          <p class="text-[12px]" style="color: #94a3b8;">系统将自动切换对应服务面板</p>
        </div>

        <!-- 预约 -->
        <div v-else-if="store.activePanel === 'booking'" class="space-y-3">
          <div class="text-[12px] font-medium mb-2" style="color: #64748b;">候选房间 <span class="font-mono" style="color: #0e3a67;">{{ candidateRooms.length }}</span></div>
          <div v-for="room in candidateRooms" :key="room.id" class="p-3.5 rounded-xl transition cursor-pointer group bg-white border border-[rgba(148,163,184,0.12)] hover:border-[rgba(37,99,235,0.25)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: #059669;"></span>
                <span class="text-[13px] font-medium" style="color: #1e293b;">{{ room.name }}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full" style="background: #f1f5f9; color: #64748b;">{{ room.type === 'meeting' ? '会议室' : room.type === 'classroom' ? '教室' : room.type === 'lab' ? '实验室' : '场馆' }}</span>
            </div>
            <div class="flex items-center gap-3 text-[11px] mb-3" style="color: #94a3b8;">
              <span>容量 {{ room.capacity }} 人</span>
              <span>{{ room.equipment.join(' · ') }}</span>
            </div>
            <button @click="confirmBooking(room.id)" class="w-full py-2 rounded-lg text-[12px] font-medium text-white transition hover:scale-[1.01] active:scale-[0.99]"
              style="background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 2px 8px rgba(37,99,235,0.2);">
              确认预约
            </button>
          </div>
          <div v-if="!candidateRooms.length" class="text-center py-8 text-[13px]" style="color: #94a3b8;">暂无可用房间</div>
        </div>

        <!-- 报修 -->
        <div v-else-if="store.activePanel === 'repair'" class="space-y-3">
          <div class="text-[12px] font-medium mb-2" style="color: #64748b;">快速报修</div>
          <div v-for="room in store.allRooms.filter(r => r.status !== 'repair')" :key="room.id" class="p-3.5 rounded-xl" style="background: #ffffff; border: 1px solid rgba(148,163,184,0.12);">
            <div class="text-[13px] font-medium mb-2" style="color: #1e293b;">{{ room.name }}</div>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="eq in room.equipment" :key="eq"
                @click="submitRepair(room.id, eq === '投影' ? 'projector' : eq === '空调' ? 'ac' : eq === '灯光' ? 'light' : 'mic')"
                class="px-2.5 py-1 rounded-lg text-[11px] transition bg-[#f8fafc] border border-[rgba(148,163,184,0.12)] text-[#64748b] hover:border-[#dc2626] hover:text-[#dc2626] hover:bg-[rgba(220,38,38,0.04)]"
              >{{ eq }} 报修</button>
            </div>
          </div>
          <div class="mt-5 pt-4" style="border-top: 1px solid rgba(148,163,184,0.12);">
            <div class="text-[12px] font-medium mb-3" style="color: #64748b;">我的工单</div>
            <div v-for="tk in store.tickets" :key="tk.id" class="p-3 rounded-xl mb-2" style="background: #ffffff; border: 1px solid rgba(148,163,184,0.1);">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-mono font-medium" style="color: #475569;">{{ tk.id }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  :style="tk.status === 'new' ? 'background: rgba(220,38,38,0.06); color: #dc2626;' : tk.status === 'doing' ? 'background: rgba(184,134,11,0.06); color: #b8860b;' : 'background: rgba(5,150,105,0.06); color: #059669;'"
                >{{ tk.status === 'new' ? '待受理' : tk.status === 'doing' ? '处理中' : '已完成' }}</span>
              </div>
              <div class="text-[11px]" style="color: #94a3b8;">{{ tk.desc }} · {{ tk.assignee }}</div>
            </div>
          </div>
        </div>

        <!-- 导航 -->
        <div v-else-if="store.activePanel === 'navigate'" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0);">
            <svg class="w-7 h-7" style="color: #94a3b8;" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <p class="text-[14px] font-medium mb-1" style="color: #475569;">导航功能即将上线</p>
          <p class="text-[12px]" style="color: #94a3b8;">敬请期待</p>
        </div>
      </template>
    </div>

    <!-- 底部工具栏 -->
    <div class="shrink-0 px-4 py-2.5 flex items-center justify-between" style="border-top: 1px solid rgba(148,163,184,0.12); background: #ffffff;">
      <div class="flex items-center gap-2">
        <button
          @click="store.setAccessibilityMode(!store.accessibilityMode)"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition"
          :style="store.accessibilityMode ? 'background: rgba(14,58,103,0.06); border: 1px solid rgba(14,58,103,0.12); color: #0e3a67;' : 'background: #f1f5f9; border: 1px solid rgba(148,163,184,0.12); color: #64748b;'"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          {{ store.accessibilityMode ? '新生友好模式开' : '新生友好模式' }}
        </button>
      </div>
      <span class="text-[10px] font-serif" style="color: #cbd5e1;">诚毅勤朴 · 浙江工商大学</span>
    </div>
  </div>
</template>
