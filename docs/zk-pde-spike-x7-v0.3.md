# ZK/PDE Spike — X7：PDE 数学链路 + Witness Layout v0.3
**日期：** 2026-06-22
**状态：** ✅ 定稿
**前置版本：** v0.2（发现乘性动态），v0.3 WIP（供 Talus 接口规范）

---

## 一、核心发现（v0.2 确认）

**ECHO 模拟器是乘性反馈，不是加性扩散：**

| | v0.3 PDE（旧假设）| 模拟器实际 |
|--|--|--|
| 更新类型 | 加性 Euler（线性） | 乘性反馈（指数） |
| 每步增长 | ~0.35/step | 1.03-1.49x/step |
| 物理含义 | 扩散+源-衰减 | 富者更富（图拓扑强化） |

**约束类型变更：** 从"加法相等"→"乘性界约束"（PLONK 界约束，门数 ~3000-5000/步）

---

## 二、PDE 离散方程（乘性动态版）

```
Φ_{t+1} = Φ_t ⊙ (1 + G(L, ξ, Φ_t))
```

展开：
```
Φ_{t+1}[i] = Φ_t[i] × (1 + α·(L @ Φ_t)[i] + β·ξ/5)
```

- `α` = 拓扑反馈系数（私有）
- `β` = 源项强度系数（私有）
- `ξ/5` = S_base（公开，ξ=(D+A+K+P)/4 ∈[0,5]）

---

## 三、ZK 约束设计

**推荐方案：界约束（方案 C）**

```
Φ_t[i] × (1 + g_min[i]) ≤ Φ_{t+1}[i] ≤ Φ_t[i] × (1 + g_max[i])
```

- `g_min/g_max` 由图拓扑预计算，属公开参数
- 只需比较约束，不需要精确乘法/倒数
- PLONK-friendly

**可选精确约束（方案 B）：** PLONK 支持 `a × b^{-1} = c`，可验证增长因子比值。

---

## 四、Witness Layout ✅（已拍板）

### Private Inputs（Prover 私有）

| 变量 | 维度 | 类型 | 说明 |
|------|------|------|------|
| `phi_t` | n | 向量 | 当前势位 |
| `phi_next` | n | 向量 | 下一势位 |
| `L` | 边列表 | 稀疏 | 归一化图拉普拉斯 |
| `L_phi` | n | 中间值 | L @ phi_t 结果 |
| `growth_factor` | n | 中间值 | 1 + α·L_phi + β·ξ/5 |
| `alpha` | 1 | 标量 | 拓扑反馈系数 |
| `beta` | 1 | 标量 | 源项强度系数 |

### Public Inputs（公开可验证）

| 变量 | 类型 | 说明 |
|------|------|------|
| `phi_0` | 标量 | 初始势位锚定 |
| `xi` | 标量 | 源项档位 [0,5]，四权平均 |
| `g_min` | 向量 | 每节点最小增长因子下界 |
| `g_max` | 向量 | 每节点最大增长因子上界 |
| `state_root` | bytes32 | phi_t 的 Merkle 根（**待哪吒裁决**——目前无 bot 拍板，24h 内人类决策） |

### L 表示：边列表（稀疏图，Gas 最优）✅

### 约束数量（单步，n=1000，m~4000）

| 约束类型 | 数量 |
|---------|------|
| 界约束（上下界） | 2n ≈ 2000 |
| 自倒数（L_phi 定义） | n ≈ 1000 |
| Pedersen 哈希（state_root） | ~3 |
| **单步总计** | **~3000-5000 门** |

---

## 五、Gas 估算（云子数据流图 v0.3 标注）

| 操作 | Gas | 说明 |
|------|-----|------|
| SLOAD（warm） | 100 | 读取 stateRoot |
| SLOAD（cold） | 2,100 | 首次读取 config |
| SSTORE（Phase2 merkle root） | 5,000 | 与节点数无关 ✅ |
| SSTORE（全量，Phase1） | 5,000×N | 不可承受 |
| LOG（emit） | ~1,500 | 记录步进事件 |
| ZK verify（PLONK） | ~200,000 | 单次验证 |
| **单次步进总计** | **~210,000** | **$0.084（20 Gwei）** |

**Phase2 merkle root 方案：** 旧 Φ 值链下保留（IPFS/DA 层），链上只存 root。

**Φ₀ 存证阈值：** 2,000-5,000 creators（Gas 可承受）

---

## 六、接口规范（对接 Seaman_bot S格式）

```
输入：
  - ξ（公开，四权平均，0-5）
  - phi_t 快照（私有，证人）
  - 图结构 L（私有，边列表）

输出：
  - phi_next（私有，证人）
  - growth_factor（私有，证人）
  - g_min/g_max（公开，链下批量预计算）

验证方式：
  1. Prover 本地计算 phi_next、growth_factor
  2. 提交 ZK 证明：phi_next 满足界约束
  3. Verifier 只检查公开 g_min/g_max 与 phi_next 一致性
```

### PDEZKVerifier 接口

```solidity
struct PublicInputs {
    uint256 xi;           // 源项档位 [0,5]
    uint256 phi_0;        // 初始势位锚定
    bytes32 state_root;   // phi_t Merkle 根（Pedersen）
    uint256[] g_min;      // 每节点最小增长因子
    uint256[] g_max;      // 每节点最大增长因子
}

struct Witness {
    uint256[] phi_t;      // 当前势位向量（私有）
    uint256[] phi_next;   // 下一势位向量（私有）
    uint256[] L_phi;      // L @ phi_t 结果（私有）
    uint256[] growth;     // 增长因子向量（私有）
    // 边列表 L（私有）
}

function verifyPDEProof(
    PublicInputs calldata pub,
    bytes calldata proof,
    Witness memory wit
) external view returns (bool);
```

### ZK 证明边界（云子数据流图确认）

- ✅ 覆盖：PDE(Φ(t), params, S) → Φ(t+Δt) 计算正确性
- ❌ 不覆盖：Φ(t) 真实性（StateCommitment 保证）
- ❌ 不覆盖：S 合法性（签名/治理保证）
- ❌ 不覆盖：params 合法性（部署/治理保证）

**证明语句：** ZK proves correctness of a single PDE state transition.

### 多步策略：单步 + 递归封装 ✅

- 单步证明（~3000-5000 门）+ 递归封装
- plonk-friendly（**待哪吒裁决**——目前无 bot 拍板，24h 内人类决策）
- 不在单次证明内打包多步，控制门数复杂度

---

## 七、设计审计点

1. **Φ₀ 存证 Gas 阈值合理性** — Phase2 merkle root 方案下，2,000-5,000 creators 阈值的 Gas 上限验证（~210k/step vs 区块 Gas 上限）
2. **g_min/g_max 预计算时机** — 链下批量预计算 + 定期刷新 vs 链上实时计算，对 ZK 证明时效性的影响
3. **state_root Pedersen 哈希** — 与以太坊原生 Keccak 的 ZK-friendly 权衡，v0.6+ STARK 迁移路径兼容性

---

## 八、变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.1 | 2026-06-20 | 初始版本，加性 PDE |
| v0.2 | 2026-06-20 | 发现乘性动态，约束类型变更 |
| v0.3 WIP | 2026-06-22 | witness layout 框架输出 |
| **v0.3** | **2026-06-22** | **定稿：L表示边列表、Pedersen哈希、单步+递归封装、Gas数据整合** |

---

*供 6/24 内容包截稿使用 | 对接 ECHO 理论基础 v0.5（云子著）*
