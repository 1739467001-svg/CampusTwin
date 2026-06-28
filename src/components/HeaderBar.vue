<script setup lang="ts">
import { useCampusStore } from '../stores/campus'
import { ref, onMounted } from 'vue'

const store = useCampusStore()

// 影响指标动画
const animatedCount = ref(0)
const animatedTime = ref(0)

onMounted(() => {
  // 数字递增动画
  const targetCount = store.todayCompleted
  const targetTime = store.avgTimeSeconds
  const duration = 1500
  const start = performance.now()
  function tick(now: number) {
    const p = Math.min((now - start) / duration, 1)
    animatedCount.value = Math.round(p * targetCount)
    animatedTime.value = Math.round(p * targetTime)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const values = [
  { label: 'N 系统 → 1 入口', desc: '统一服务台', icon: 'layers' },
  { label: '一句话·10 秒办', desc: '比传统流程提效 30 倍', icon: 'bolt' },
  { label: '可复制', desc: '社区 / 园区通用', icon: 'copy' },
  { label: '包容友好', desc: '新生·访客·无障碍', icon: 'heart' },
]
</script>

<template>
  <div class="shrink-0 z-50">
    <!-- 品牌栏 -->
    <header class="h-14 flex items-center justify-between px-6 bg-brand-navy text-white shadow">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375a2.625 2.625 0 010 5.25H9M9 6.75v10.5M15 6.75v10.5" />
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <h1 class="text-base font-semibold tracking-wide">CampusTwin</h1>
          <span class="text-xs text-white/60 font-light">校园数字孪生服务台</span>
        </div>
      </div>
      <div class="flex items-center gap-4 text-xs text-white/70">
        <!-- 影响指标 -->
        <div class="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10">
          <span class="text-white/50 text-[10px]">今日已办</span>
          <span class="text-white font-semibold tabular-nums">{{ animatedCount }}</span>
          <span class="text-white/40 text-[10px]">件</span>
          <span class="w-px h-3 bg-white/20 mx-0.5"></span>
          <span class="text-white/50 text-[10px]">平均</span>
          <span class="text-brand-gold font-semibold tabular-nums">{{ animatedTime }}</span>
          <span class="text-white/40 text-[10px]">秒/件</span>
        </div>
        <span class="hidden md:inline">{{ store.currentUser.name }}</span>
        <span class="px-2 py-0.5 rounded bg-white/10 text-white/80">{{ store.currentUser.role === 'student' ? '学生' : store.currentUser.role === 'teacher' ? '教师' : '访客' }}</span>
      </div>
    </header>

    <!-- 社会价值条 -->
    <div class="flex items-center gap-0 overflow-x-auto bg-brand-navy/95 border-t border-white/5 scrollbar-hide">
      <div v-for="(v, i) in values" :key="i" class="flex items-center gap-2 px-4 py-2 min-w-fit hover:bg-white/5 transition cursor-default group">
        <div class="w-5 h-5 rounded bg-brand-gold/15 flex items-center justify-center shrink-0">
          <svg v-if="v.icon === 'layers'" class="w-3 h-3 text-brand-gold/70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l5.571 3-5.571-3m-5.571-3l-5.571 3" />
          </svg>
          <svg v-else-if="v.icon === 'bolt'" class="w-3 h-3 text-brand-gold/70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <svg v-else-if="v.icon === 'copy'" class="w-3 h-3 text-brand-gold/70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
          </svg>
          <svg v-else class="w-3 h-3 text-brand-gold/70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-white/90 text-[11px] font-medium whitespace-nowrap">{{ v.label }}</span>
          <span class="text-white/40 text-[9px] whitespace-nowrap group-hover:text-white/60 transition">{{ v.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
