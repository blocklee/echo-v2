# ZK/PDE Spike — X7：PDE v0.4 数学链路
**日期：** 2026-06-24
**状态：** v0.4 — 最终拍板版（参数待会议微调）
**前置版本：** v0.3（乘性动态，界约束）

---

> **注：** 参数值（gamma_base=0.2, alpha=0.5, infrastructureFee=1.5%, P=0.15）为实验占位值，基于此前模拟结果设定。框架（道·术）已锁定，数值待模拟实验后确认。接口层与具体数值解耦——改数值 = 改文档 + 测试用例，不改合约代码。

---

## 一、核心方程（最终版）

### 1.1 势位演化方程

```
Φ_{t+1}[i] = Φ_t[i] × (1 + γ_i)

其中 γ_i = γ_base × (1 + α × imbalance_ratio_i)
imbalance_ratio_i = out_flow_i / in_flow_i
```

**参数（实验占位，待模拟确认）：**
| 参数 | 值 | 说明 |
|------|-----|------|
| gamma_base | 0.2 | 基础衰减系数（实验占位） |
| alpha | 0.5 | 不平衡敏感度（实验占位） |
| 取值范围 | 0.3 ~ 0.7 | gamma_base × (1 ± alpha) 推导 |

**γ 行为分析：**
| 状态 | imbalance_ratio | γ 值 | 含义 |
|------|-----------------|------|------|
| 互引均衡 | ≈ 1 | γ_base × (1+α) = 0.3 | 正常衰减 |
| 只进不出 | → ∞ | γ → ∞（饱和截断） | 势位加速衰减 |
| 净输出 | < 1 | γ < 0.3 | 势位保留更久 |

**物理含义：** 互惠均衡者（互相引用）活得久；只进不出者（只引用不被引用）衰减快。这与 ECHO "势位自然形成/消散"的道统一致。

### 1.2 PDE 参数（P=0.15）

P 是来源权重（Source Weight），控制创作者初始势位的来源构成：

```
P = 0.15（6/23 拍板）
写入位置：Witness.growth
含义：15% 来自直接创建，85% 来自使用关系的拓扑积累
```

---

## 二、Witness 结构（最终版）

### 2.1 Private Inputs（证人，仅 Prover 可知）

| 变量 | 类型 | 维度 | 说明 |
|------|------|------|------|
| `phi_t` | uint256/Q32.32 | n | 当前势位向量 |
| `phi_next` | uint256/Q32.32 | n | 下一势位向量 |
| `gamma` | uint256/Q32.32 | n | 每节点衰减因子（动态） |
| `L_phi` | uint256/Q32.32 | n | L @ phi_t 结果 |
| `alpha` | uint256/Q32.32 | 标量 | 不平衡敏感度（固定 0.5） |
| `in_cum_root` | bytes32 | 标量 | 入度累积 Merkle 根 |
| `out_cum_root` | bytes32 | 标量 | 出度累积 Merkle 根 |
| `phi_root` | bytes32 | 标量 | 势位向量 Merkle 根 |

### 2.2 Public Inputs（公开，Verifier 验证）

| 变量 | 类型 | 说明 |
|------|------|------|
| `potentialWeight` | uint256/Q32.32 | P=0.15 来源权重 |
| `gamma_base` | uint256/Q32.32 | 基础衰减（固定 0.2） |
| `alpha` | uint256/Q32.32 | 不平衡敏感度（固定 0.5） |
| `phi_root` | bytes32 | phi_t 的 Merkle 根 |
| `in_cum_root` | bytes32 | 入度累积根（链下计算 imbalance_ratio） |
| `out_cum_root` | bytes32 | 出度累积根（链下计算 imbalance_ratio） |
| `infrastructureFeeBps` | uint16 | 基础设施费（实验占位：150 bps = 1.5%） |

**PublicInputs 字段共 11 个（Seaman_bot v0.4.2 接口规范）。**

---

## 三、Q32.32 定点数约定

为避免浮点不确定性，所有势位和系数使用 Q32.32 定点数：

```
Q32.32 格式：整数部分 32 位，小数部分 32 位
表示范围：0 ~ 2^32 - 1 ≈ 0 ~ 4.29
精度：2^-32 ≈ 2.33e-10
```

**定点运算规则：**
- 乘法：先乘后右移 32 位（保留小数）
- 除法：被除数左移 32 位再除
- 比较：直接比较（均为整数）

---

## 四、哈希方案

**哈希方案（分层）：**

| 层级 | 哈希函数 | 用途 |
|------|----------|------|
| 电路内 | Poseidon | ZK-friendly，Plonk/Halo2 约束数低，~55K Gas |
| 链上存储/事件 | Keccak256 | EVM 原生，零额外成本 |

- 用于生成 phi_root、in_cum_root、out_cum_root
- **Pedersen 不用**（无 Ed25519 跨链需求）

> ⚠️ 修正：v0.3 文档误写为"Pedersen"，应为 Poseidon（Talus 6/23 拍板）

---

## 五、合约接口（IECHOEconomy）

```solidity
interface IECHOEconomy {
    /// @dev 基础设施费率（basis points）
    function infrastructureFeeBps() external view returns (uint16);

    /// @dev 结算单次使用费（直接：使用者 → 创作者）
    /// @param usageAmount 使用量
    /// @param creator 创作者地址
    function settleUsageFee(uint256 usageAmount, address creator) external payable;
}
```

**要点：**
- 无 distributeFee()（6/23 拍板删除验证者经济角色）
- 现金流：使用者 → 创作者（扣 1.5% 基础设施费）
- 验证者零经济角色，验证是使用行为的副产品

---

## 六、ZK 约束设计

### 6.1 界约束（推荐方案）

```
Φ_t[i] × (1 + γ_min[i]) ≤ Φ_{t+1}[i] ≤ Φ_t[i] × (1 + γ_max[i])
```

其中 γ_min/γ_max 由 gamma_base 和 alpha 预计算，属公开参数。

### 6.2 约束数量估算（n=1000 节点）

| 约束类型 | 数量 |
|---------|------|
| 界约束（上下界） | 2n ≈ 2000 |
| gamma 计算验证 | n ≈ 1000 |
| Merkle 包含证明 | ~3（phi_root, in_cum_root, out_cum_root） |
| 基础设施费验证 | ~2 |
| **单步总计** | **~3000-5000 门** |

---

## 七、与 Seaman_bot 接口规范对齐

| 本文档字段 | Seaman_bot v0.4.2 字段 | 状态 |
|-----------|----------------------|------|
| potentialWeight (P=0.15) | potentialWeight | ✅ 对齐 |
| gamma_base = 0.2 | gamma_base | ✅ 对齐 |
| alpha = 0.5 | alpha | ✅ 对齐 |
| phi_root | phi_root | ✅ 对齐 |
| in_cum_root | in_cum_root | ✅ 对齐 |
| out_cum_root | out_cum_root | ✅ 对齐 |
| infrastructureFeeBps = 150 | infrastructureFeeBps | ✅ 对齐 |

---

## 八、待确认项（数值实验占位，框架已锁定）

- [x] gamma_base = 0.2 / alpha = 0.5 — **实验占位**，框架锁定，数值待模拟确认
- [x] infrastructureFee = 1.5% — **实验占位**，框架锁定，数值待模拟确认
- [x] P = 0.15 — **实验占位**，框架锁定，数值待模拟确认
- [ ] 递归封装优先级（P1，不阻塞 P0）
- [ ] φ_max 存储方式（链上维护 vs 链下快照）

---

## 九、冷启动说明

**初始状态：**
- Φ_0 由创作者创建时的初始使用量决定
- P=0.15 写入 Witness.growth，首次创建后生效
- 无需国库或治理代币

**增长阶段：**
- 使用关系积累 → 图拓扑强化 → Φ 自然增长
- γ 动态调整：不平衡者衰减快，互惠者衰减慢

---

*v0.4 — 2026-06-24*
*参数注：所有数值为实验占位，框架锁定，数值待模拟实验后确认*
