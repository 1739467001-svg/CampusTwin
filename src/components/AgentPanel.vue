<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useCampusStore } from '../stores/campus'
import { parseIntent } from '../agent/intentParser'

const store = useCampusStore()
const inputText = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)
const isTyping = ref(false)

const tipTexts = [
  '帮我订明天下午有投影的会议室',
  '现在哪有空教室',
  '三号楼302投影坏了',
  '看一下全校占用情况'
]

// 根据 simulatedHour 生成时间问候语
const timeGreeting = computed(() => {
  const hour = store.simulatedHour ?? 10
  if (hour < 6) return '凌晨'
  if (hour < 9) return '早晨'
  if (hour < 12) return '上午'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  if (hour < 22) return '晚上'
  return '深夜'
})

const timePeriod = computed(() => {
  const hour = store.simulatedHour ?? 10
  if (hour < 8) return '校园安静，大部分教室尚未开放。'
  if (hour < 12) return '大部分教室正在上课中。'
  if (hour < 14) return '午休时间，部分教室已空闲。'
  if (hour < 18) return '下午课程进行中，教室使用率较高。'
  if (hour < 21) return '晚间时段，自习室与研讨室较为热门。'
  return '已过晚自习时间，大部分教室已关闭。'
})

// 初始欢迎消息（含时间信息）
const welcomeMessage = computed(() => {
  return `你好！我是 CampusTwin 调度助手。现在是${timeGreeting.value}${store.simulatedHour ?? 10}点，${timePeriod.value}试试说「帮我订明天下午有投影的会议室」或「三号楼302投影坏了」。`
})

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  store.addMessage('user', text)
  store.incrementCompleted()
  inputText.value = ''
  isTyping.value = true

  const intent = parseIntent(text)
  const steps = [
    `调度Agent 识别意图: ${intent.intent}`,
    `置信度: ${intent.confidence}`,
    `派发至: ${intent.agent}`
  ]

  setTimeout(() => {
    isTyping.value = false
    let reply = ''
    switch (intent.intent) {
      case 'book_room': {
        reply = `已收到预约请求。${intent.slots.time ? '时间：' + intent.slots.time : ''} 正在检索符合条件的会议室...`
        store.setActivePanel('booking')
        // 如果有 building slot，设置 flyToTarget
        if (intent.slots.building) {
          const buildingId = intent.slots.building
          store.flyToTarget = buildingId
        }
        break
      }
      case 'find_free_classroom': {
        const freeRooms = store.freeRooms
        reply = `正在查找空教室... 找到 ${freeRooms.length} 间可用教室，已在中栏高亮显示。`
        store.highlightRooms(freeRooms.map(r => r.id))
        store.setActivePanel('booking')
        // 设置 flyToTarget 为第一个空教室所在的 buildingId
        if (freeRooms.length > 0) {
          const firstRoom = freeRooms[0]
          const buildingId = firstRoom.floorId.split('-')[0]
          store.flyToTarget = buildingId
        }
        break
      }
      case 'repair': {
        reply = `收到报修请求：${intent.slots.building || ''}${intent.slots.room || ''} ${intent.slots.device || '设备'}故障。已生成工单。`
        store.setActivePanel('repair')
        // 设置 flyToTarget 为报修地点对应的 buildingId
        if (intent.slots.building) {
          // 尝试从 building slot 中提取 buildingId（如 "3号楼" -> "b3"）
          const numMatch = intent.slots.building.match(/(\d+)/)
          if (numMatch) {
            const buildingId = 'b' + numMatch[1]
            store.flyToTarget = buildingId
          }
        } else if (intent.slots.room) {
          // 通过房间号尝试在所有房间中查找对应的 buildingId
          const matchedRoom = store.allRooms.find(r => r.name.includes(intent.slots.room!))
          if (matchedRoom) {
            const buildingId = matchedRoom.floorId.split('-')[0]
            store.flyToTarget = buildingId
          }
        }
        break
      }
      case 'admin_overview': {
        reply = '已切换至管理态势视图。全校占用率 ' + store.occupancyRate + '%，能耗与人流数据已更新。'
        store.setViewMode('admin')
        store.setActivePanel('admin')
        break
      }
      default:
        reply = '抱歉，我没有完全理解。试试说「帮我订明天下午有投影的会议室」或「看一下全校占用情况」。'
    }
    store.addMessage('agent', reply, steps)
  }, 600)
}

function applyTip(i: number) {
  inputText.value = tipTexts[i]
  sendMessage()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

watch(() => store.messages.length, () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 标题区 -->
    <div class="px-5 py-3.5 flex items-center gap-2.5 shrink-0" style="border-bottom: 1px solid rgba(148,163,184,0.12);">
      <div class="w-7 h-7 rounded-md flex items-center justify-center" style="background: rgba(37,99,235,0.08);">
        <svg class="w-4 h-4" style="color: #2563eb;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      </div>
      <span class="text-sm font-medium" style="color: #1e293b;">Agent 指挥中心</span>
      <span class="ml-auto flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full animate-pulse-soft" style="background: #059669;"></span>
        <span class="text-[10px]" style="color: #94a3b8;">在线</span>
      </span>
    </div>

    <!-- 消息流 -->
    <div ref="messageContainer" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <!-- 欢迎消息（含时间信息） -->
      <div class="flex flex-col gap-2 animate-fade-in-up">
        <div class="flex justify-start">
          <div class="max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-[13px] leading-relaxed" style="background: #ffffff; border: 1px solid rgba(148,163,184,0.15); color: #334155;">
            {{ welcomeMessage }}
          </div>
        </div>
      </div>

      <div v-for="(msg, idx) in store.messages" :key="idx" class="flex flex-col gap-2 animate-fade-in-up" :style="{ animationDelay: idx * 0.05 + 's' }">
        <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="[
            'max-w-[92%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed',
            msg.role === 'user'
              ? 'text-white rounded-br-sm'
              : 'rounded-bl-sm'
          ]" :style="msg.role === 'user' ? 'background: linear-gradient(135deg, #2563eb, #1d4ed8);' : 'background: #ffffff; border: 1px solid rgba(148,163,184,0.15); color: #334155;'">
            {{ msg.content }}
          </div>
        </div>
        <!-- 调度步骤卡 -->
        <div v-if="msg.steps && msg.steps.length" class="flex justify-start">
          <div class="px-3 py-2 rounded-xl max-w-[92%]" style="background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.12);">
            <div class="text-[10px] font-semibold tracking-wider uppercase mb-1.5" style="color: #b8860b;">调度过程</div>
            <div class="space-y-1">
              <div v-for="(step, sIdx) in msg.steps" :key="sIdx" class="text-[11px] flex items-center gap-2" style="color: #64748b;">
                <span class="w-1 h-1 rounded-full shrink-0" style="background: #c9a84c;"></span>
                {{ step }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入中动画 -->
      <div v-if="isTyping" class="flex justify-start animate-fade-in-up">
        <div class="px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1" style="background: #ffffff; border: 1px solid rgba(148,163,184,0.15);">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-soft" style="background: #94a3b8; animation-delay: 0s;"></span>
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-soft" style="background: #94a3b8; animation-delay: 0.15s;"></span>
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-soft" style="background: #94a3b8; animation-delay: 0.3s;"></span>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="shrink-0 p-4" style="border-top: 1px solid rgba(148,163,184,0.12);">
      <div class="flex gap-2">
        <textarea
          v-model="inputText"
          @keydown="handleKeydown"
          rows="2"
          placeholder="试试说：帮我订明天下午有投影的会议室"
          class="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none transition bg-white text-[#334155] border border-[rgba(148,163,184,0.2)] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
        ></textarea>
        <button
          @click="sendMessage"
          class="shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center transition hover:scale-105 active:scale-95"
          style="background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 2px 8px rgba(37,99,235,0.25);"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12z" />
          </svg>
        </button>
      </div>
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button v-for="(tip, i) in ['订会议室','找空教室','报修','管理态势']" :key="i"
          @click="applyTip(i)"
          class="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] transition bg-white border border-[rgba(148,163,184,0.15)] text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb]"
        >{{ tip }}</button>
      </div>
    </div>
  </div>
</template>
