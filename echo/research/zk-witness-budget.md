# Layer4 ZK Witness Budget 文档

## 基于 PDE 有界振荡框架 v0.3.2 的约束

**文档版本**: v0.1
**基于**: PDE 有界振荡框架 v0.3.2 (commit f3a69ed4)
**来源**: 四份交叉 review (猫先森/雨娃/云子/哪吒数学 + Seaman_bot 信息论 + Talus 跨层)
**日期**: 2026-06-29

---

## 1. 核心发现：Witness 压缩率硬约束

### 1.1 β 的 (2/3) 次方效应

从 PDE 有界振荡框架 v0.3.2 推导出的关键不等式：

```
V* = [S(1+k)·N√N/β]^(2/3)
```

其中：
- V = ΣΦᵢ²（L² 能量函数）
- β = 阻尼系数（信道容量 proxy）
- S = 信源强度
- k = 耦合系数
- N = 网络节点数

### 1.2 Witness 压缩率 scaling

| β 变化 | 旧直觉（线性 1/β） | 实际（β^(-2/3)） | 差距 |
|--------|-------------------|-----------------|------|
| β 2x | witness ↓ 50% | witness ↓ 37% | -13% |
| β 4x | witness ↓ 25% | witness ↓ 16% | -9% |
| β 8x | witness ↓ 12.5% | witness ↓ 6.25% | -6.25% |

**关键结论**：zk 优化空间比直觉估计窄，安全 margin 需重新计算。

---

## 2. Layer4 目标函数调整

### 2.1 λ 权重系数 — Pareto 分析提案

Layer4 目标函数：
```
min Gini + λ·证明成本
```

其中证明成本 = α·H(Φ) + β（线性近似）

**⚠️ 重要修正（2026-06-29 哪吒追问）**：

λ 不由技术推导直接决定，由 **决策者偏好** 决定。技术推导只能给出 Pareto frontier：

| λ 值 | 倾向 | Gini 影响 | 证明成本影响 |
|------|------|----------|------------|
| λ 高 | 系统更在乎证明成本 | Gini 恶化（接受更高不平等） | 成本降低 |
| λ 低 | 系统更在乎公平性 | Gini 改善 | 成本更高 |
| λ 中间 | 平衡 | 中等 | 中等 |

**Seaman_bot 原表述修正**：
- ❌ 旧表述："λ 应该上调到 0.5 来补偿收益递减"
- ✅ 修正："β^(2/3) scaling 使证明成本优化空间收窄（37% vs 50%），建议 P0 实验画出 Pareto frontier，λ 最终值由决策者偏好拍板"

**P0 实验要求**：
1. 画出不同 λ 下的 Gini vs 证明成本 trade-off 曲线
2. 评估 λ=0.5 的 Gini 恶化是否可接受
3. 区分理论 bound（37%）和实际优化（取决于算法）
4. 最终 λ 由 P0 实验数据 + 决策者偏好决定

**状态**：λ 值 → "待 Pareto 分析 + 决策者偏好拍板"

### 2.2 Rényi-2 熵 bound

```
H₂* = log(N) + (2/3)·log(β) − (2/3)·log(S(1+k))
```

- β 增大 → H₂ 增加 → 信息量降低 → witness 压缩率增加
- 但增速是 (2/3) 次方，不是线性

---

## 3. 接口设计约束

### 3.1 energy_bound 字段

```solidity
struct EnergyBound {
    uint256 v_star;        // 链下预计算 V* = [S(1+k)·N√N/β]^(2/3)
    uint256 v_actual;      // 当前 V = phi_graph² + phi_event²
    bytes proof;           // V > V* 的 proof
}
```

**约束**：(2/3) 次方链上不支持，必须链下预计算。

### 3.2 beta 参数更新策略

- β 翻倍 → witness 降 37%（不是 50%）
- 收益递减：β 越大，增量优化收益越小
- 建议：β 优化到甜点区后不再追加投入

### 3.3 gammaMax 占位

- 当前占位：γ_max = 0.4
- 状态：待能量耗散估计推导后锁定
- 不阻塞 Layer4 接口，但需预留更新机制

---

## 4. 安全 margin 计算

### 4.1 Witness 预算公式

```
witness_budget = base_witness · β^(-2/3) · safety_margin
```

建议 safety_margin = 1.5（补偿 (2/3) 次方不确定性）

### 4.2 Gas 预算

| 操作 | Gas 预估 | 备注 |
|------|---------|------|
| verifyCouplingStep | 320k-400k | 基础验证 |
| energy_bound 验证 | +50k-80k | 链下预计算后的 proof |
| beta 更新 | 20k | 参数调整 |

---

## 5. 后续跟进项

| 项目 | 负责人 | 状态 |
|------|--------|------|
| P0 实验验证 | 猫先森 | 待启动 |
| witness 压缩分析 | Seaman_bot | ✅ 已完成（本文档） |
| 跨层一致性验证 | Talus | ✅ 已完成（Talus 独立交付，含 gas 5K/10K、EIP-712 签名、接口字段类型） |
| γ_max 能量耗散推导 | X7 | 长期，不阻塞 |

## 6. 引用

- PDE 有界振荡框架 v0.3.2: `research/pde-bounded-oscillation-v03.md`
- GitHub: `feat/battle-of-potential-contracts` (commit f3a69ed4)
- Layer4 接口: `echo/contracts/Layer4CouplingVerifier.sol`
- 四份交叉 review: 2026-06-29 群聊记录

---

*信息论 bound 是硬 bound，不是工程 fudge factor。*
