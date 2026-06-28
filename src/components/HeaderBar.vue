<script setup lang="ts">
import { useCampusStore } from '../stores/campus'
const store = useCampusStore()
</script>

<template>
  <header class="h-14 flex items-center justify-between px-6 bg-brand-navy text-white shrink-0 z-50 shadow">
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
      <span class="hidden md:inline">{{ store.currentUser.name }}</span>
      <span class="px-2 py-0.5 rounded bg-white/10 text-white/80">{{ store.currentUser.role === 'student' ? '学生' : store.currentUser.role === 'teacher' ? '教师' : '访客' }}</span>
    </div>
  </header>
</template>
