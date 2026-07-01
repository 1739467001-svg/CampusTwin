<script setup lang="ts">
import { useCampusStore } from '../stores/campus'
import { ref, onMounted } from 'vue'

const store = useCampusStore()
const animatedCount = ref(0)
const animatedTime = ref(0)

onMounted(() => {
  const targetCount = store.todayCompleted
  const targetTime = store.avgTimeSeconds
  const start = performance.now()
  function tick(now: number) {
    const p = Math.min((now - start) / 1500, 1)
    animatedCount.value = Math.round(p * targetCount)
    animatedTime.value = Math.round(p * targetTime)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const values = [
  { label: '统一入口', desc: 'N 系统 → 1 入口' },
  { label: '10 秒办成', desc: '比传统流程提效 30×' },
  { label: '平滑复制', desc: '社区 / 园区通用' },
  { label: '包容友好', desc: '新生 · 访客 · 无障碍' },
]
</script>

<template>
  <div class="shrink-0">
    <!-- 品牌栏 -->
    <header class="h-14 flex items-center justify-between px-6 text-white shrink-0" style="background: linear-gradient(135deg, #0e3a67 0%, #1a4a7a 100%);">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(201,168,76,0.2);">
          <svg class="w-5 h-5" style="color: #c9a84c;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375a2.625 2.625 0 010 5.25H9M9 6.75v10.5M15 6.75v10.5" />
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <h1 class="text-base font-semibold tracking-wide font-serif">CampusTwin</h1>
          <span class="text-xs opacity-50 font-light">校园数字孪生服务台</span>
        </div>
      </div>
      <div class="flex items-center gap-4 text-xs" style="color: rgba(255,255,255,0.65);">
        <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md" style="background: rgba(255,255,255,0.08);">
          <span class="text-[10px]">今日已办</span>
          <span class="font-semibold tabular-nums text-white">{{ animatedCount }}</span>
          <span class="text-[10px]">件 · 平均</span>
          <span class="font-semibold tabular-nums" style="color: #c9a84c;">{{ animatedTime }}</span>
          <span class="text-[10px]">秒/件</span>
        </div>
        <span class="hidden md:inline">{{ store.currentUser.name }}</span>
        <span class="px-2 py-0.5 rounded text-[11px]" style="background: rgba(255,255,255,0.1);">{{ store.currentUser.role === 'student' ? '学生' : store.currentUser.role === 'teacher' ? '教师' : '访客' }}</span>
      </div>
    </header>

    <!-- 价值条 -->
    <div class="flex items-center gap-0 overflow-x-auto" style="background: rgba(14,58,103,0.95); border-top: 1px solid rgba(255,255,255,0.06);">
      <div v-for="(v, i) in values" :key="i" class="flex items-center gap-2 px-4 py-2 min-w-fit transition cursor-default group" style="border-right: 1px solid rgba(255,255,255,0.04);">
        <div class="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style="background: rgba(201,168,76,0.15);">
          <span class="text-[9px] font-bold" style="color: #c9a84c;">{{ i + 1 }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-white/80 text-[11px] font-medium whitespace-nowrap">{{ v.label }}</span>
          <span class="text-white/35 text-[9px] whitespace-nowrap group-hover:text-white/50 transition">{{ v.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
