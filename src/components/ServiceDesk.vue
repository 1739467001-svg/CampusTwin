<script setup lang="ts">
import { computed } from 'vue'
import { useCampusStore } from '../stores/campus'

const store = useCampusStore()

const panelTitle = computed(() => {
  switch (store.activePanel) {
    case 'booking': return '预约服务台'
    case 'repair': return '设备报修'
    case 'admin': return '管理态势'
    case 'navigate': return '校园导航'
    default: return '服务台'
  }
})

const panelIcon = computed(() => {
  switch (store.activePanel) {
    case 'booking': return 'calendar'
    case 'repair': return 'wrench'
    case 'admin': return 'chart'
    case 'navigate': return 'map'
    default: return 'sparkles'
  }
})

// 预约面板：候选房间列表
const candidateRooms = computed(() => {
  if (store.activePanel !== 'booking') return []
  // 简单逻辑：展示所有 free 房间作为候选
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
    <!-- 标题区 -->
    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
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

    <!-- 面板内容区 -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
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
            >
              {{ eq }} 报修
            </button>
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

      <!-- 管理态势面板 -->
      <div v-else-if="store.activePanel === 'admin'" class="space-y-4">
        <!-- KPI 卡 -->
        <div class="grid grid-cols-2 gap-2">
          <div class="p-3 rounded-xl bg-brand-navy/5 border border-brand-navy/10">
            <div class="text-[10px] text-text-secondary">全校占用率</div>
            <div class="text-xl font-bold text-brand-navy mt-0.5">{{ store.occupancyRate }}%</div>
          </div>
          <div class="p-3 rounded-xl bg-brand-gold/5 border border-brand-gold/10">
            <div class="text-[10px] text-text-secondary">今日能耗</div>
            <div class="text-xl font-bold text-brand-gold mt-0.5">{{ store.energies.reduce((s, e) => s + e.kwh, 0) }} <span class="text-xs font-normal">kWh</span></div>
          </div>
          <div class="p-3 rounded-xl bg-status-free/5 border border-status-free/10">
            <div class="text-[10px] text-text-secondary">实时人流</div>
            <div class="text-xl font-bold text-status-free mt-0.5">{{ store.traffics.reduce((s, t) => s + t.count, 0) }}</div>
          </div>
          <div class="p-3 rounded-xl bg-status-repair/5 border border-status-repair/10">
            <div class="text-[10px] text-text-secondary">待处理工单</div>
            <div class="text-xl font-bold text-status-repair mt-0.5">{{ store.tickets.filter(t => t.status !== 'done').length }}</div>
          </div>
        </div>
        <!-- 能耗排行 -->
        <div>
          <div class="text-xs text-text-secondary font-medium mb-2">能耗排行</div>
          <div class="space-y-2">
            <div v-for="e in store.energies" :key="e.buildingId" class="flex items-center gap-2">
              <span class="text-xs text-text-secondary w-20 truncate">{{ store.buildings.find(b => b.id === e.buildingId)?.name || e.buildingId }}</span>
              <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full bg-brand-gold/60" :style="{ width: Math.min(100, (e.kwh / 1500) * 100) + '%' }"></div>
              </div>
              <span class="text-xs text-text-secondary w-10 text-right">{{ e.kwh }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 导航面板（占位） -->
      <div v-else-if="store.activePanel === 'navigate'" class="text-center py-12 text-text-secondary text-sm">
        导航功能将在后续版本接入
      </div>
    </div>
  </div>
</template>
