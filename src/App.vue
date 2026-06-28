<script setup lang="ts">
import HeaderBar from './components/HeaderBar.vue'
import AgentPanel from './components/AgentPanel.vue'
import Campus3D from './components/Campus3D.vue'
import ServiceDesk from './components/ServiceDesk.vue'
</script>

<template>
  <div class="flex flex-col h-screen bg-surface">
    <!-- 顶部品牌栏 -->
    <HeaderBar />
    <!-- 三栏主体 -->
    <div class="flex flex-1 overflow-hidden">
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
  </div>
</template>
