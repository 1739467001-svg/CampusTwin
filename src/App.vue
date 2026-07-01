<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCampusStore } from './stores/campus'
import HeaderBar from './components/HeaderBar.vue'
import AgentPanel from './components/AgentPanel.vue'
import Campus3D from './components/Campus3D.vue'
import ServiceDesk from './components/ServiceDesk.vue'

const store = useCampusStore()
const activeTab = ref<'left' | 'center' | 'right'>('center')

const fontSizeClass = computed(() => store.accessibilityMode ? 'text-base' : '')
</script>

<template>
  <div class="flex flex-col h-screen" :class="fontSizeClass" style="background: #eef2f7;">
    <HeaderBar />

    <!-- 桌面端 -->
    <div class="hidden lg:flex flex-1 overflow-hidden gap-0">
      <aside class="w-[380px] min-w-[380px] flex flex-col paper-texture" style="background: #f8fafc; border-right: 1px solid rgba(148,163,184,0.15);">
        <AgentPanel />
      </aside>
      <main class="flex-1 relative overflow-hidden" style="background: #0a1628;">
        <Campus3D />
      </main>
      <aside class="w-[380px] min-w-[380px] flex flex-col paper-texture" style="background: #f8fafc; border-left: 1px solid rgba(148,163,184,0.15);">
        <ServiceDesk />
      </aside>
    </div>

    <!-- 移动端 -->
    <div class="lg:hidden flex flex-col flex-1 overflow-hidden" style="background: #f8fafc;">
      <div class="flex shrink-0" style="border-bottom: 1px solid rgba(148,163,184,0.15);">
        <button v-for="tab in [{k:'left',l:'调度助手'},{k:'center',l:'3D校园'},{k:'right',l:'服务台'}]" :key="tab.k"
          @click="activeTab = tab.k as any"
          :class="['flex-1 px-4 py-3 text-[13px] font-medium transition border-b-2', activeTab === tab.k ? 'border-[#0e3a67] text-[#0e3a67]' : 'border-transparent text-[#94a3b8]']"
        >{{ tab.l }}</button>
      </div>
      <div class="flex-1 overflow-hidden relative">
        <div v-show="activeTab === 'left'" class="absolute inset-0 flex flex-col"><AgentPanel /></div>
        <div v-show="activeTab === 'center'" class="absolute inset-0" style="background:#0a1628"><Campus3D /></div>
        <div v-show="activeTab === 'right'" class="absolute inset-0 flex flex-col"><ServiceDesk /></div>
      </div>
    </div>
  </div>
</template>
