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
  <div class="flex flex-col h-screen bg-surface" :class="fontSizeClass">
    <!-- 顶部品牌栏 + 价值条 -->
    <HeaderBar />

    <!-- 桌面端三栏布局 -->
    <div class="hidden lg:flex flex-1 overflow-hidden">
      <!-- 左栏 · Agent 指挥中心 -->
      <aside class="w-[360px] min-w-[360px] flex flex-col border-r border-gray-200 bg-white">
        <AgentPanel />
      </aside>
      <!-- 中栏 · 3D 校园孪生 -->
      <main class="flex-1 relative bg-surface-dark overflow-hidden">
        <Campus3D />
      </main>
      <!-- 右栏 · 一站式服务台 -->
      <aside class="w-[360px] min-w-[360px] flex flex-col border-l border-gray-200 bg-white">
        <ServiceDesk />
      </aside>
    </div>

    <!-- 移动端 Tab 布局 -->
    <div class="lg:hidden flex flex-col flex-1 overflow-hidden">
      <!-- Tab 栏 -->
      <div class="flex border-b border-gray-200 bg-white shrink-0">
        <button
          @click="activeTab = 'left'"
          :class="['flex-1 px-4 py-2.5 text-xs font-medium transition border-b-2', activeTab === 'left' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-text-secondary']"
        >
          调度助手
        </button>
        <button
          @click="activeTab = 'center'"
          :class="['flex-1 px-4 py-2.5 text-xs font-medium transition border-b-2', activeTab === 'center' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-text-secondary']"
        >
          3D 校园
        </button>
        <button
          @click="activeTab = 'right'"
          :class="['flex-1 px-4 py-2.5 text-xs font-medium transition border-b-2', activeTab === 'right' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-text-secondary']"
        >
          服务台
        </button>
      </div>
      <!-- 内容 -->
      <div class="flex-1 overflow-hidden relative">
        <div v-show="activeTab === 'left'" class="absolute inset-0 flex flex-col bg-white">
          <AgentPanel />
        </div>
        <div v-show="activeTab === 'center'" class="absolute inset-0 bg-surface-dark">
          <Campus3D />
        </div>
        <div v-show="activeTab === 'right'" class="absolute inset-0 flex flex-col bg-white">
          <ServiceDesk />
        </div>
      </div>
    </div>
  </div>
</template>
