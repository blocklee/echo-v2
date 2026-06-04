# 信息论与Shi-Graph场论映射研究
**Agent:** X7 | **Date:** 2026-06-04 | **Status:** v0.2

---

## 1️⃣ 最小必要概念

### 1.1 熵（Entropy）
- **定义：** 随机变量不确定性的度量，H(X) = -Σ p(x) log p(x)
- **物理含义：** 系统无序程度；在网络中表示信息分布的均匀性
- **Shi-Graph关联：** 势位场中熵高 = 粒子分布均匀（无明显聚集）；熵低 = 粒子聚集在低势位区域

### 1.2 互信息（Mutual Information）
- **定义：** 两个变量共享信息量，I(X;Y) = H(X) + H(Y) - H(X,Y)
- **物理含义：** 一个变量已知时对另一个变量不确定性的减少量
- **Shi-Graph关联：** 节点间互信息高 → 场的影响能力强 → 跨节点协同效应显著

### 1.3 信息瓶颈（Information Bottleneck）
- **定义：** 压缩信息保留关键相关特征，min_{p} I(X;Z) - β I(Z;Y)
- **物理含义：** 在压缩与预测之间找到最优平衡
- **Shi-Graph关联：** 合约层信息压缩类似势位计算中的降维映射——保留关键势位特征，过滤噪声

---

## 2️⃣ 与Shi-Graph场论的直接关联

### 2.1 场势 → 信息密度
势位φ映射为信息密度I：
- φ高区域 ≡ 高互信息区（节点强协同）
- φ低区域 ≡ 低互信息区（粒子均匀分布）

### 2.2 场传播 → 条件熵传递
场的影响传播可以用条件熵描述：
- H(Particle|Field) 表示在已知场位形下粒子的剩余不确定性
- 强场对应低条件熵（确定性高）

### 2.3 合约层映射
| 信息论概念 | Shi-Graph场论对应 |
|:---|:---|
| 熵 | 粒子分布无序度 |
| 互信息 | 节点间协同强度 |
| 信息瓶颈 | 合约层降维压缩 |

---

## 3️⃣ 合约层映射（Seaman_bot 补充）

### 3.1 链下计算 + 预言机回写
- 互信息/势位计算在链下（PotentialOracle）
- 结果通过预言机或链下计算后写回合约层
- 合约层纯事件驱动，不直接处理 MI 阈值

### 3.2 合约层硬性约束
| 约束类型 | 限制 |
|:---|:---|
| nodeId | bytes32（32字节固定） |
| 金额 | uint256 |
| shareType | uint8（0-255） |
| Gas/卡 | ~50k gas/张卡 |
| 区块上限 | 8M gas → ≤160张卡/交易 |
| 存储上限 | 1000次分配 ≈ 5000 slot ≈ 12.5M gas |
| 事件索引 | 最多4个indexed参数 |

### 3.3 Gas 优化策略
**存储打包：**
- Distribution struct 当前 5 slot → 可压缩至 3 slot（节省 40%）
  - recipient(20B) + amount(uint96, 12B) + shareType(1B) = 32B → 1 slot
  - battleId + nodeId → 各 1 slot
- calldata 已优化，无需改
- 批量操作：单次 battle 最多 20 张卡，gas ~1M
- pendingRevenue 用 mapping，不记录历史，链下重建

**MVP 阶段建议：**
- 保持当前 5 slot 方案
- 单次 battle 最多 50 张卡（gas ~2.5M）
- 事件不拆分，全量记录
- 后续迭代再优化（参考 Merkle proof 批量方案）

### 3.4 事件拆分方案
- RevenueDistributed 事件：3 indexed + 2 data = 5 参数
- 每事件约 1.5k gas；7 事件 ≈ 10.5k gas
- 大数据拆分：100张卡 → 事件gas ~150k + 遍历 ~500k = 650k
- 1000张卡接近 8M 上限，建议单次 battle ≤100 张卡或分多笔 distributeRevenue

### 3.5 数据压缩方案
| 优化项 | 当前 | 优化后 | 节省 |
|:---|:---|:---|:---|
| nodeId | keccak256 → bytes32 | 递增 uint256 | 节省 hash gas |
| 金额 | uint256（32B） | uint96（12B） | 62.5% |
| shareType | uint8 | uint8（已最优） | - |
| 批量分配 | 5000 slot | Merkle root（1 slot） | 99.98% |

*Merkle proof 方案复杂度高，MVP 阶段不推荐*

---

## 4️⃣ 待确认项
- **β参数量化：** 信息瓶颈β参数与势位衰减系数量化关系 → 需雨娃确认
- **MI阈值预言机机制：** 互信息阈值 → 合约触发条件的链下预言机设计 → 需与 Seaman_bot 协作设计

---

## 5️⃣ 参考文献
- Cover & Thomas, Elements of Information Theory
- Tishby et al., The Information Bottleneck Method (1999)
- Seaman_bot, ECHO合约层硬性约束 + Gas优化 + 事件拆分 + 数据压缩（群聊补充, 2026-06-04）

---

*本文档持续更新中，Phase 1 完成后出最终版本。*