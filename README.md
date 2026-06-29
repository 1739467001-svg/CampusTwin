# CampusTwin · 校园数字孪生服务台

> **TRAE AI 创意大赛 · 社会服务赛道**  
> 一句话完成校园事务，让服务像点外卖一样简单。

---

## 项目简介

CampusTwin 是一个**全前端零后端**的校园数字孪生服务台，基于 3D 校园地图 + AI Agent 调度，让师生通过自然语言一句话完成会议室预约、空教室查找、设备报修、管理态势查看等高频事务。

**核心社会价值：**

- **N 个系统 → 1 个入口**：统一服务台替代分散的教务/后勤/物业系统
- **一句话 · 10 秒办成**：比传统会议室预约流程提效 30 倍
- **可复制**：同一套架构可平滑部署到社区、园区、商圈
- **包容友好**：支持新生模式（字号放大、操作高亮）、访客快速入口

---

## 功能亮点

| 功能 | 说明 |
|---|---|
| **一句话预约** | "帮我订明天下午有投影的会议室" → Agent 解析意图 → 检索候选 → 3D 高亮 → 一键确认 |
| **找空教室** | "现在哪有空教室" → 实时查询所有 free 状态教室 → 3D 地图蓝色高亮 |
| **设备报修** | "三号楼 302 投影坏了" → 自动生成工单 → 3D 标红 → 状态流转可见 |
| **管理态势** | 师生/管理端切换 → KPI 卡 + ECharts 图表（占用率/能耗/人流）→ 3D 热力层叠加 |
| **3D 数字孪生** | Three.js low-poly 楼宇 + 道路 + 绿化 + 光照 + OrbitControls 旋转缩放 |
| **图表→3D 联动** | 点击 ECharts 柱状图/饼图 → 相机飞行动画聚焦对应楼宇 |

---

## 技术栈

- **构建工具**：Vite 8
- **框架**：Vue 3 + TypeScript
- **样式**：Tailwind CSS v4
- **状态管理**：Pinia
- **3D 渲染**：Three.js + OrbitControls
- **数据可视化**：ECharts 5
- **部署**：静态托管（GitHub Pages / Vercel / Zeabur）

---

## 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/1739467001-svg/CampusTwin.git
cd CampusTwin

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:5173/

# 4. 生产构建
npm run build
# 产物输出到 dist/ 目录
```

---

## 在线体验

> **待部署** — 部署后将替换为实际链接

---

## TRAE 开发说明

本项目全程使用 **TRAE IDE** 开发，核心流程如下：

1. **需求分析**：基于《CampusTwin 校园数字孪生服务台·需求规格书》拆解为 A→B→C→D→E→F→G→H→U2 九个模块
2. **架构搭建**：TRAE 生成 Vite + Vue3 + TS + Tailwind + Pinia 骨架
3. **3D 场景**：TRAE 编写 Three.js CampusScene 类，数据驱动生成 low-poly 楼宇
4. **Agent 调度**：TRAE 实现规则式意图解析器 + 调度步骤卡
5. **数据可视化**：TRAE 集成 ECharts 管理态势仪表盘
6. **视觉收尾**：TRAE 打磨社会价值条、无障碍模式、响应式布局

**关键 Session ID**（可信证明）：
- `6a37ccb32c3fc26c51a1facd`（2026-06-26 ~ 2026-06-27）
- `6a40f0378dd100880fe564cb`（2026-06-28 ~ 2026-06-29）

---

## 截图

> **待补充** — 部署后替换为实际截图

---

## 部署方式

### 方式一：GitHub → Zeabur/Vercel 自动部署（推荐）

1. 将本仓库 push 到 GitHub
2. 登录 [Zeabur](https://zeabur.com) 或 [Vercel](https://vercel.com)
3. 新建 Project → Import GitHub Repository → 选择 `CampusTwin`
4. Framework Preset 选择 **Vite** 或留空（静态站点）
5. Build Command: `npm run build`，Output Directory: `dist`
6. 点击 Deploy，约 1 分钟后获得 `https://xxx.vercel.app` 或 `https://xxx.zeabur.app`

### 方式二：本地构建后上传静态托管

```bash
# 1. 构建
npm run build

# 2. dist/ 目录即为静态站点，可直接上传到：
#    - GitHub Pages（Settings → Pages → Deploy from branch → 选 dist 分支或 gh-pages）
#    - 腾讯云 COS / 阿里云 OSS
#    - 七牛云 / 又拍云
#    - 任意 Nginx / Apache 服务器
```

---

## 替换真实校园数据

`src/stores/campus.ts` 中 `initMockData()` 为数据入口。替换时只需修改：

- `buildings[]`：楼名、`position` 坐标、楼层、房间信息
- `energies[]`、`traffics[]`：实时能耗与人流数据

3D 场景和所有图表会自动重建，无需改动任何 3D/ECharts 代码。

---

## License

MIT