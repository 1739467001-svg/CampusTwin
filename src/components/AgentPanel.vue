<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useCampusStore } from '../stores/campus'
import { parseIntent } from '../agent/intentParser'

const store = useCampusStore()
const inputText = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  store.addMessage('user', text)
  inputText.value = ''

  // 解析意图
  const intent = parseIntent(text)
  const steps = [
    `调度Agent 识别意图: ${intent.intent}`,
    `置信度: ${intent.confidence}`,
    `派发至: ${intent.agent}`
  ]

  // 模拟子 Agent 回复
  setTimeout(() => {
    let reply = ''
    switch (intent.intent) {
      case 'book_room':
        reply = `已收到预约请求。${intent.slots.time ? '时间：' + intent.slots.time : ''} 正在检索符合条件的会议室...`
        store.setActivePanel('booking')
        break
      case 'find_free_classroom':
        reply = `正在查找空教室... 找到 ${store.freeRooms.length} 间可用教室，已在中栏高亮显示。`
        store.highlightRooms(store.freeRooms.map(r => r.id))
        store.setActivePanel('booking')
        break
      case 'repair':
        reply = `收到报修请求：${intent.slots.building || ''}${intent.slots.room || ''} ${intent.slots.device || '设备'}故障。已生成工单。`
        store.setActivePanel('repair')
        break
      case 'admin_overview':
        reply = '已切换至管理态势视图。全校占用率 ' + store.occupancyRate + '%，能耗与人流数据已更新。'
        store.setActivePanel('admin')
        break
      default:
        reply = '抱歉，我没有完全理解。试试说「帮我订明天下午有投影的会议室」或「看一下全校占用情况」。'
    }
    store.addMessage('agent', reply, steps)
  }, 400)
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
    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
      <div class="w-6 h-6 rounded bg-brand-blue/10 flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-brand-blue" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>
      <span class="text-sm font-medium text-brand-navy">Agent 指挥中心</span>
    </div>

    <!-- 消息流 -->
    <div ref="messageContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      <div v-for="(msg, idx) in store.messages" :key="idx" class="flex flex-col gap-1.5">
        <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="[
            'max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed',
            msg.role === 'user'
              ? 'bg-brand-blue text-white rounded-br-md'
              : 'bg-gray-100 text-text-primary rounded-bl-md'
          ]">
            {{ msg.content }}
          </div>
        </div>
        <!-- 调度步骤卡 -->
        <div v-if="msg.steps && msg.steps.length" class="flex justify-start">
          <div class="bg-brand-gold/5 border border-brand-gold/20 rounded-lg px-3 py-2 max-w-[90%]">
            <div class="text-[10px] font-medium text-brand-gold mb-1 tracking-wide">调度过程</div>
            <div class="space-y-0.5">
              <div v-for="(step, sIdx) in msg.steps" :key="sIdx" class="text-xs text-text-secondary flex items-center gap-1.5">
                <span class="w-1 h-1 rounded-full bg-brand-gold shrink-0"></span>
                {{ step }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="shrink-0 p-3 border-t border-gray-100">
      <div class="flex gap-2">
        <textarea
          v-model="inputText"
          @keydown="handleKeydown"
          rows="2"
          placeholder="试试说：帮我订明天下午有投影的会议室"
          class="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition"
        ></textarea>
        <button
          @click="sendMessage"
          class="shrink-0 w-10 h-10 rounded-lg bg-brand-blue text-white flex items-center justify-center hover:bg-brand-blue/90 active:scale-95 transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12z" />
          </svg>
        </button>
      </div>
      <div class="mt-2 flex gap-2 overflow-x-auto pb-1">
        <button @click="inputText = '帮我订明天下午有投影的会议室'; sendMessage()" class="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 text-xs text-text-secondary hover:bg-gray-200 transition">订会议室</button>
        <button @click="inputText = '现在哪有空教室'; sendMessage()" class="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 text-xs text-text-secondary hover:bg-gray-200 transition">找空教室</button>
        <button @click="inputText = '三号楼302投影坏了'; sendMessage()" class="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 text-xs text-text-secondary hover:bg-gray-200 transition">报修</button>
        <button @click="inputText = '看一下全校占用情况'; sendMessage()" class="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 text-xs text-text-secondary hover:bg-gray-200 transition">管理态势</button>
      </div>
    </div>
  </div>
</template>
