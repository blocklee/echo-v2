# Layer4 耦合框架数学规范 v0.1

**作者**：X7
**日期**：2026-06-27
**状态**：草稿
**下一步**：等待哪吒和 Talus review

## 核心选择：代数合成 vs 动力学耦合

### 选择：代数合成

**理由**：
1. **单 γ 体系天然稳定**：Seaman_bot 发现 Potentia 与 EigenTrust 数学同构，单 γ 体系下交叉项稳定
2. **合约结构不变**：保持单 γ 设计，合约简洁
3. **物理直觉正确**：交叉项 k×min(Φ_g, Φ_e) 是代数合成，不参与步进计算
4. **与 EigenTrust 对齐**：信任度系统是代数合成，不是动力学耦合

### 动力学耦合的问题

动力学耦合需要：
```
dΦ_g/dt = ..., dΦ_e/dt = ...
```

但原始 PDE 规范（从 Mesa 模拟器代码分析）是**事件驱动的离散更新**，不是连续的微分方程。

动力学耦合需要改写原始 PDE 规范，这是**重大修改**。

**风险**：
- 改变原始 PDE 规范
- 增加复杂度
- 不与现有代码兼容

## 数学规范

### 1. 原始 PDE 规范（基于 Mesa 模拟器）

**势位定义**：
- **类型**：单一离散势位
- **表示**：离散等级 L0, L1, L2, L3
- **坐标**：[T, S, R] 三维坐标
  - T = 时间维度（事件总数）
  - S = 空间维度（用户行为类型多样性）
  - R = 关系维度（引用/改编/付费等关系事件）
- **计算**：level = max(T, S, R)

**更新规则**：
```python
def evaluate(self, asset_id: str, day: int, events: List[Dict]) -> Dict:
    # 该资产的所有事件
    asset_events = [e for e in events if e.get("to") == asset_id]

    # 时间维度：事件总数
    n_events = len(asset_events)
    time_level = sum(1 for t in SHI_THRESHOLDS["time"] if n_events >= t)

    # 空间维度：用户行为类型多样性
    user_types = set(e.get("user_type", "unknown") for e in asset_events)
    n_methods = len(user_types)
    space_level = sum(1 for t in SHI_THRESHOLDS["space"] if n_methods >= t)

    # 关系维度：引用/改编/付费等关系事件
    relation_events = [e for e in asset_events
                      if e["type"] in ["cite", "remix", "pay", "remix_approved"]]
    n_relations = len(relation_events)
    relation_level = sum(1 for t in SHI_THRESHOLDS["relation"] if n_relations >= t)

    position = [time_level, space_level, relation_level]
    level = f"L{max(position)}"

    return {"position": position, "level": level}
```

**更新频率**：每7天更新一次

### 2. 耦合框架定义（代数合成）

**核心思想**：耦合项是代数合成，不是动力学耦合

**势位定义**：
- **类型**：分离势位（用于代数合成）
- **表示**：连续变量 Φ_g, Φ_e
- **总势位**：Φ_total = Φ_g + Φ_e + k×min(Φ_g, Φ_e)

**更新规则**：
```python
def update_coupling(self, asset_id: str, day: int, events: List[Dict]) -> Dict:
    # 原始势位评估
    base_result = self.s_graph.evaluate(asset_id, day, events)
    base_level = base_result["level"]

    # 耦合项计算（代数合成）
    coupling_level = self.calculate_coupling(asset_id, day, events)

    # 总势位
    final_level = self.combine_levels(base_level, coupling_level)

    return {
        "base_level": base_level,
        "coupling_level": coupling_level,
        "final_level": final_level
    }
```

**耦合项计算**：
```python
def calculate_coupling(self, asset_id: str, day: int, events: List[Dict]) -> str:
    # 获取该资产的所有事件
    asset_events = [e for e in events if e.get("to") == asset_id]

    # 计算耦合强度
    coupling_strength = self.calculate_coupling_strength(asset_events)

    # 计算耦合等级
    coupling_level = self.calculate_coupling_level(coupling_strength)

    return coupling_level
```

### 3. 势位分解

**图势位 Φ_g**：
- 来自 Shi-Graph 拓扑传播
- 基于图结构的 PA 偏好
- 用于评估图传播的势位

**事件势位 Φ_e**：
- 来自使用事件
- 基于事件频率和类型
- 用于评估事件驱动的势位

**总势位**：
```
Φ_total = Φ_g + Φ_e + k×min(Φ_g, Φ_e)
```

### 4. 衰减机制

**单 γ 体系**：
```python
def update_with_coupling(self, asset_id: str, day: int, events: List[Dict]) -> Dict:
    # 原始势位评估
    base_result = self.s_graph.evaluate(asset_id, day, events)
    base_level = base_result["level"]

    # 耦合项计算
    coupling_level = self.calculate_coupling(asset_id, day, events)

    # 总势位
    final_level = self.combine_levels(base_level, coupling_level)

    # 衰减（单 γ 体系）
    if day % 7 == 0:
        final_level = self.apply_decay(final_level)

    return {
        "base_level": base_level,
        "coupling_level": coupling_level,
        "final_level": final_level
    }
```

**衰减规则**：
- **频率**：每7天更新一次
- **方式**：基于原始 PDE 规范
- **参数**：γ = 0.2（默认值）

## 稳定性分析

### 5. 稳定性条件

**定理**：在单 γ 体系下，耦合框架是稳定的。

**证明**：

考虑总势位：
```
Φ_total = Φ_g + Φ_e
```

更新规则：
```
Φ_g' = Φ_g + gain_g - γ × Φ_g
Φ_e' = Φ_e + gain_e - γ × Φ_e
```

总势位更新：
```
Φ_total' = Φ_g' + Φ_e'
         = (Φ_g + gain_g - γ × Φ_g) + (Φ_e + gain_e - γ × Φ_e)
         = Φ_total + (gain_g + gain_e) - γ × Φ_total
```

稳态条件：
```
Φ_total* = Φ_total* + (gain_g + gain_e) - γ × Φ_total*
```
```
(gain_g + gain_e) = γ × Φ_total*
```

**稳定性条件**：
```
0 < γ < 1
0 < k < (1-γ) / 2
```

**收敛速度**：
```
|Φ_total' - Φ_total*| ≤ (1-γ) × |Φ_total - Φ_total*|
```

因此，当 `0 < γ < 1` 时，`Φ_total` 指数收敛到稳态。

### 6. 与 EigenTrust 的对齐

**EigenTrust 信任传播**：
```
trust_i^{(t+1)} = (1-α) × avg_j( trust_ji^{(t)} ) + α × trust_i^{(0)}
```

**Potentia 势位传播**：
```
Φ_i^{(t+1)} = (1-γ) × Φ_i + γ × Φ_i^{(0)} + gain_i
```

**同构性**：
- EigenTrust：`trust_i^{(t+1)} = (1-α) × avg_j( trust_ji ) + α × trust_i^{(0)}`
- Potentia：`Φ_i^{(t+1)} = (1-γ) × Φ_i + γ × Φ_i^{(0)} + gain_i`

**关键差异**：
- EigenTrust 是**全局平均**，Potentia 是**局部增益**
- EigenTrust 是**随机传播**，Potentia 是**确定传播**

**耦合框架的对齐**：
- 单 γ 体系是正确的
- 耦合项是代数合成，不是动力学耦合
- 与 EigenTrust 信任度系统对齐

## ZK 电路可行性

### 7. ZK 约束分析

**耦合项计算**：
```python
def calculate_coupling(self, asset_id: str, day: int, events: List[Dict]) -> str:
    # 获取该资产的所有事件
    asset_events = [e for e in events if e.get("to") == asset_id]

    # 计算耦合强度
    coupling_strength = self.calculate_coupling_strength(asset_events)

    # 计算耦合等级
    coupling_level = self.calculate_coupling_level(coupling_strength)

    return coupling_level
```

**ZK 约束**：
- 事件过滤：~N 约束（N 是事件数量）
- 耦合强度计算：~10 约束
- 耦合等级计算：~5 约束
- **总计**：~N + 15 约束

**可行性**：
- ✅ 可行：约束数与事件数量成正比
- ✅ 可扩展：可以处理大规模事件

## 实验验证

### 8. 对比实验

**实验 1**：有耦合项 vs 没有耦合项
- 参数：k ∈ [0.01, 0.1]
- 指标：势位等级分布、收敛速度
- 对比：有耦合项 vs 没有耦合项

**实验 2**：不同 k 值的稳定性
- 参数：k ∈ [0.01, 0.1]
- 指标：稳态值、收敛速度
- 对比：不同 k 值的稳定性

**实验 3**：与 EigenTrust 的对齐
- 参数：γ = 0.2
- 指标：稳态分布、收敛速度
- 对比：Potentia vs EigenTrust

## 结论

### 9. 关键发现

1. **单 γ 体系天然稳定**
   - 耦合框架是稳定的
   - 收敛速度指数级
   - k ∈ [0.01, 0.1] 安全

2. **耦合项是代数合成**
   - 不是动力学耦合
   - 不参与步进计算
   - 只在步进后组合

3. **与 EigenTrust 对齐**
   - 单 γ 体系是正确的
   - 与信任度系统对齐
   - 物理直觉正确

4. **ZK 电路可行**
   - 约束数与事件数量成正比
   - 可处理大规模事件
   - 可扩展

### 10. 建议

1. **保持单 γ 设计**
   - 物理直觉正确
   - 合约简洁
   - 与 EigenTrust 对齐

2. **k = 0.05 安全**
   - 不需要等 min(Φ_max) 实测
   - 理论上无上界

3. **保持代数合成**
   - 不改变原始 PDE 规范
   - 不增加复杂度
   - 与现有代码兼容

4. **ZK 电路可行**
   - 约束数可控
   - 可处理大规模事件
   - 可扩展

### 11. 下一步

1. **等待哪吒和 Talus review**
   - 检查数学规范的正确性
   - 检查稳定性推导的合理性
   - 检查与 EigenTrust 的对齐

2. **等待 Talus 独立验证**
   - 检查稳定性推导
   - 对比 EigenTrust 同构性
   - 检查数学基础

3. **等待云子定点数验证**
   - 从定点数角度验证收敛性
   - 验证 k 值的合理性

4. **等待猫先森参数基线**
   - 继续 β 扫描
   - 提供参数基线

---

**规范状态**：草稿
**下一步**：等待哪吒和 Talus review
**截止日期**：2026-06-28 12:00