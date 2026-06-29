# PDE 有界振荡框架 v0.3.2 — 跨层一致性增量 Addendum

**文档版本**: v0.1
**来源**: Talus 跨层一致性 review 补充
**基于**: PDE 有界振荡框架 v0.3.2 (commit f3a69ed4 → b416e107)
**日期**: 2026-06-29
**诚实标注**: 信息对齐 / 待 v0.4 复测

---

## 1. 跨层一致性结论

Talus 跨层一致性审阅在 v0.3.2 基础上正式通过，补充以下三点设计细节。

---

## 2. Gas 成本分析

### 2.1 链上直接计算

- **操作**: V = ΣΦᵢ²（O(N)，不是 O(N²)；每项 Φᵢ² 是 O(1)，N 项求和）
- **Gas**: ~10K（N=100 时）
- **可扩展性**: N=1000 时可能涨到 ~100K

### 2.2 链下预计算 + 链上验证

- **操作**: 链下算 V*，链上比较 V > V*
- **Gas**: ~5K（O(1) 常数时间，不受 N 增长影响）
- **可扩展性**: N=100→1000 时，链下仍 ~5K，差距从 2x 放大到 20x

### 2.3 设计决策

N=100 时差距"不大"（2x），但 N 扩展到数千时可扩展性优势显现。当前共识规模 N=100 下保持灵活，优先链下预计算作为扩展路径。

---

## 3. 信任模型

### 3.1 乐观预计算 + 回退

- **正常路径**: 链下计算 + EIP-712 签名验证，gas 低
- **争议路径**: 回退链上直算，gas 贵但正确性保证
- **经济惩罚**: 预计算节点质押签名，作恶有罚

### 3.2 与 Layer2 类比

类似欺诈证明/validity proof 机制，无需额外发明信任模型。

---

## 4. 接口定义

### 4.1 EnergyBound 结构（完整版）

```solidity
struct EnergyBound {
    uint256 v_star;        // 链下预计算 V*（Q32.32 定点数）
    uint256 v_actual;      // 当前 V（Q32.32）
    bytes32 signature;     // EIP-712 签名
    uint256 deadline;      // 签名过期时间
    uint256 updated_at;    // 最后更新时间
    bytes proof;           // V > V* 的 proof
}
```

### 4.2 关键参数

| 参数 | 类型 | 说明 |
|------|------|------|
| v_star | uint256 (Q32.32) | 阈值，链下预计算 |
| v_actual | uint256 (Q32.32) | 实际值，链上计算 |
| signature | bytes32 | EIP-712 签名 |
| deadline | uint256 | 防重放/过期 |
| updated_at | uint256 | 最后更新 |
| proof | bytes | 比较证明 |

### 4.3 注意项

- **Q32.32 在 int256 中**: 空间利用率不高（256 位存 64 位有效），但 Solidity 兼容性好
- **gamma_max_scaled**: 纯 uint256 定标，精度 10⁻⁴，无额外 scaling 层
- **beta 锁定后只读**: 关键安全假设，动态可调会导致有界性证明失效

---

## 5. 四点跟进项（v0.4 阶段）

| 跟进项 | 来源 | 状态 |
|--------|------|------|
| O(N²) → O(N) 笔误修正 | 哪吒 12:28 | 已修正 |
| V > V* 状态机（BoundViolation） | 哪吒 12:28 | 待明确：NONE / SOFT_REVERT / HARD_REVERT |
| gamma_max_scaled 精确定义 | 哪吒 12:28 | 已明确：纯 uint256，精度 10⁻⁴ |
| λ Pareto 验证 | 哪吒 12:37 | 待 P0 实验数据驱动 |

### 5.1 V > V* 状态机（待 v0.4 复测）

```
if V <= V*:
    正常通过
elif V > V*:
    触发？
    - 回退链上直算？
    - 拒绝交易？
    - 进入冷却期？
```

---

## 6. 跨层映射状态

| 层级 | v0.3.2 对象 | Layer4 映射 | 状态 |
|------|-----------|------------|------|
| PDE | V = ΣΦ² | energy accumulation | ✅ |
| PDE | V* = [·]^(2/3) | 链下预计算 + 链上 proof | ⚠️ 待 v0.4 复测 |
| PDE | β^(2/3) | witness 压缩策略 | ⚠️ 待 v0.4 复测 |
| PDE | γ（衰减）| PotentialDecayWarning | ✅ |
| PDE | S（源）| CreatorRevenueNotification | ✅ |
| PDE | L = A−D | 图结构约定 | ✅ 已注释 |

---

## 7. 引用

- PDE 有界振荡框架 v0.3.2: `research/pde-bounded-oscillation-v03.md`
- Layer4 接口: `echo/contracts/Layer4CouplingVerifier.sol`
- 四份交叉 review: 2026-06-29 群聊记录
- 本 addendum 飞书来源: [https://feishu.cn/docx/GyAIdkhw0o8emJx2WrpcAvWpnJb](https://feishu.cn/docx/GyAIdkhw0o8emJx2WrpcAvWpnJb)

---

*本 addendum 为跨层一致性审阅补充，v0.4 阶段需复测确认。*
