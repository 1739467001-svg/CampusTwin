import type { Intent } from '../stores/campus'

/**
 * 规则式意图解析器（离线兜底）
 * 覆盖 5 类意图：book_room / find_free_classroom / repair / navigate / admin_overview
 */
export function parseIntent(text: string): Intent {
  const t = text.toLowerCase()

  // 1. 管理态势
  if (t.includes('占用') || t.includes('态势') || t.includes('管理') || t.includes('全校') || t.includes('能耗') || t.includes('人流')) {
    return {
      intent: 'admin_overview',
      slots: {},
      agent: '态势Agent',
      confidence: 0.92
    }
  }

  // 2. 报修
  const repairKeywords = ['坏了', '故障', '报修', '维修', '修', '不亮', '无法', '投影', '空调', '灯']
  if (repairKeywords.some(k => t.includes(k))) {
    const slots: Intent['slots'] = {}
    // 提取楼号
    const buildingMatch = t.match(/(\d+)号楼?/)
    if (buildingMatch) slots.building = buildingMatch[1] + '号楼'
    // 提取房间号
    const roomMatch = t.match(/(\d{3,4})/)
    if (roomMatch) slots.room = roomMatch[1]
    // 提取设备
    if (t.includes('投影')) slots.device = 'projector'
    if (t.includes('空调')) slots.device = 'ac'
    if (t.includes('灯')) slots.device = 'light'
    if (t.includes('麦克') || t.includes('话筒')) slots.device = 'mic'
    return {
      intent: 'repair',
      slots,
      agent: '报修Agent',
      confidence: 0.88
    }
  }

  // 3. 找空教室
  if (t.includes('空教室') || t.includes('空房间') || t.includes('哪有') || t.includes('哪里')) {
    const slots: Intent['slots'] = {}
    const timeMatch = t.match(/(明天|今天|后天|下午|上午|晚上)/)
    if (timeMatch) slots.time = timeMatch[1]
    return {
      intent: 'find_free_classroom',
      slots,
      agent: '预约Agent',
      confidence: 0.85
    }
  }

  // 4. 预约会议室
  const bookKeywords = ['订', '预约', '预订', '定', '借']
  if (bookKeywords.some(k => t.includes(k))) {
    const slots: Intent['slots'] = {}
    const timeMatch = t.match(/(明天|今天|后天|下午|上午|晚上|\d+点)/)
    if (timeMatch) slots.time = timeMatch[1]
    const equipKeywords = ['投影', '白板', '音响', '空调', '电脑']
    slots.equipment = equipKeywords.filter(k => t.includes(k))
    return {
      intent: 'book_room',
      slots,
      agent: '预约Agent',
      confidence: 0.9
    }
  }

  // 5. 导航
  if (t.includes('去') || t.includes('怎么走') || t.includes('导航') || t.includes('带路') || t.includes('路线')) {
    const slots: Intent['slots'] = {}
    const targets = ['图书馆', '教学楼', '食堂', '宿舍', '操场', '活动中心']
    const target = targets.find(target => t.includes(target))
    if (target) slots.target = target
    return {
      intent: 'navigate',
      slots,
      agent: '导航Agent',
      confidence: 0.8
    }
  }

  // 兜底
  return {
    intent: 'unknown',
    slots: {},
    agent: '调度Agent',
    confidence: 0.3
  }
}
