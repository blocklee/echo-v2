# ZK/PDE 前端组件接口草案
**作者**：Talus  
**日期**：2026-06-20  
**状态**：草稿，等 ZK 小组确认接口格式后修订  

---

## 1. ZkProofStatus 组件

展示单个 ZK 证明的状态。

### Props
```typescript
interface ZkProofStatusProps {
  proofId: string;
  status: 'generating' | 'submitted' | 'verified' | 'failed';
  proofSizeKb?: number;       // 证明大小
  gasUsed?: number;           // 链上验证 Gas
  submittedAt?: number;        // 提交时间戳
  verifiedAt?: number;        // 验证时间戳
  errorMessage?: string;      // 失败原因
}
```

### 展示样式
- `generating`：加载动画 + "ZK 证明生成中..."
- `submitted`：黄色 Badge + "已提交，等待验证"
- `verified`：绿色 Badge + "已验证" + Gas 消耗
- `failed`：红色 Badge + 错误原因

### 示例
```
┌─────────────────────────────┐
│ ✓ 已验证                    │
│ Gas: 245,320 | 2.3 KB     │
│ 区块: #12,345,678          │
└─────────────────────────────┘
```

---

## 2. ZkProofHistory 组件

展示历史证明记录列表。

### Props
```typescript
interface ZkProofHistoryProps {
  nodeId: string;
  maxItems?: number;  // 默认 10
}
```

### 数据源
```
GET /api/zk/history/:nodeId
→ { proofs: [{ proofId, status, proofSizeKb, gasUsed, submittedAt, verifiedAt }] }
```

### 展示样式
- 每行：时间 + 状态Badge + 区块号 + Gas
- 按时间倒序

---

## 3. ZkDebugPanel 组件

调试面板：展示量化误差分析（cross-check 结果）。

### Props
```typescript
interface ZkDebugPanelProps {
  nodeId?: string;        // 单节点 or 全网
  phiFloat: number;       // 引擎 float 值
  phiQ32: bigint;         // Q32.32 定点值
  deltaAbs: number;       // 绝对误差
  deltaRelPct: number;    // 相对误差 %
  cumulativeErrorM1000?: number;  // M=1000 累积误差上界
}
```

### 展示样式
```
┌─ ZK 调试面板 ──────────────────────────┐
│ 引擎 float:  0.515746                 │
│ Q32.32:      0x8407E887               │
│ 量化误差:    2.00e-10                 │
│ 相对误差:    0.038%                    │
│ M=1000累积:  2.00e-7  ✓ 在范围内      │
│ M=10⁶累积:   2.00e-4  ✓ 在范围内      │
└────────────────────────────────────────┘
```

---

## 4. PhiVisualization 组件（扩展现有）

展示势位场的 PDE 演化。

### Props
```typescript
interface PhiVisualizationProps {
  nodeId: string;
  phiHistory: { t: number; phi: number }[];  // 时间序列
  phiTheoretical?: number;   // ZK 验证的理论值（如果有）
  showPDEParams?: boolean;   // 是否显示 D, γ, α, κ
}
```

### M(ξ) 映射层展示
```
┌─ 映射函数 M(ξ) ───────────────────────┐
│ 四权配置: 用=约/衍=亲/扩=己/益=溪       │
│ ↓ M(ξ)                                 │
│ D=0.5 γ=0.1 α=0.05 κ=1.2              │
│ ↓ PDE                                  │
│ 势位演化: φ(t+Δt) ≈ 0.527             │
└────────────────────────────────────────┘
```

---

## 5. API 接口需求（待 Seaman_bot 实现）

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| `/api/zk/status/:proofId` | GET | 查询证明状态 |
| `/api/zk/history/:nodeId` | GET | 节点证明历史 |
| `/api/zk/submit` | POST | 提交新证明 |
| `/api/phi/params/:nodeId` | GET | 获取当前 PDE 参数 |
| `/ws/zk_events` | WS | 实时推送（燎原/寂灭/虹吸/证明状态） |

---

## 6. Open Issues

| # | 问题 | 负责 | 状态 |
|:--:|:---|:---|:---:|
| 1 | WS 通道谁实现？ | Seaman | ⏳ |
| 2 | `/api/phi/params` 返回格式？ | Seaman+云子 | ⏳ |
| 3 | M(ξ) 映射函数形式？ | 治理拍板 | ⏳ |

---

*v0.1 草稿，等 ZK 小组确认接口格式后更新*
