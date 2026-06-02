# ECHO「势位之战」UI 风格指南 v1.0

**暖白底 · 呼吸感 · 创作关系可视化**

## 1. 色彩系统

### 主色板
- 主背景：`#FAF9F7`（暖白）
- 次级背景：`#F2F0ED`（卡片）
- 边框/分割线：`#E5E2DC`
- 主文字：`#2D2A26`（暖黑）
- 次级文字：`#6B665C`
- 占位符文字：`#A39E94`

### 势位等级配色
- 青铜 0-20%：`#B5A48A`
- 白银 20-40%：`#9BA3A9`
- 黄金 40-60%：`#D4AF37`（带发光）
- 钻石 60-80%：`#6FA3C4`（带微光）
- 大师 80-100%：`#C4A6C4`（带光晕）

### 功能色
- 收入触发：`#7BAE7F`
- 衰减警告：`#D4976A`
- 错误：`#C46B6B`
- 链接高亮：`#8B7355`

## 2. 字体系统
`font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;`

## 3. 组件规范
- Card：背景 #F2F0ED，圆角 12px，阴影 `0 2px 8px rgba(45,42,38,0.06)`
- 主按钮：背景 #2D2A26，文字 #FAF9F7，圆角 8px
- 节点卡片：背景 #FAF9F7，边框按势位等级着色，圆角 16px
- 边：1.5px~4px，按权重渐变

## 4. Canvas 配色
- 节点色：按势位等级对应上述配色
- 边权重：低 1.5px/中 2.5px/高 4px
- Canvas 背景：`#FAF9F7`

## 5. 动效
- 全局过渡：0.2-0.4s，cubic-bezier(0.4, 0, 0.2, 1)
- 势位上涨：绿色脉冲
- 衰减警告：橙色渐变 + 轻微抖动

## 6. MVP 必须组件
Card / Button / PotentialBadge / PotentialBar / RevenueBadge / NodeCard / BattleStatus / RevenuePanel

---
**Author**: X7
**Version**: v1.0
**Date**: 2026-06-02
