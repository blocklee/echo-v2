# ECHO 模拟器 Mesa 引擎重写计划

**目标**：对齐 API 接口定义 v1.0（https://agent-value.echo-v2.pages.dev/api-interface-definition-v1.0）
**工期**：5-7 天（分 3 个 Milestone）
**负责人**：雨娃（子任务分发）

---

## 当前状态

| 文件 | 行数 | 状态 |
|:---|:---|:---|
| `echo_simulation_mesa.py` | ~1150 | ⚠️ 行为逻辑简单，Agent 决策简化 |
| `echo_simulator_api.py` | ~271 | ⚠️ 接口存在但底层引擎弱 |
| `echo_simulation.js` | ~1172 | ✅ 前端引擎丰富（12000+ 事件） |

**Gap**：前端引擎比后端 Mesa 丰富得多，后端需要「追上」前端的能力。

---

## Milestone 1：核心数据结构重写（Day 1-2）

### M1.1 CreatorAgent 升级

**当前**：固定 6 个资产定义 + 4 种策略模板
**目标**：每个创作者完全独立配置

```python
class CreatorAgent(Agent):
    def __init__(self, unique_id, model, config: Dict):
        # config 包含：
        # - id, name, type, domain
        # - asset_config: {铸: {enabled, price, ...}, 衍: {...}, 扩: {...}, 收: {...}}
        # - initial_work: {title, category, quality_score}
```

**改动**：
- [ ] 移除 `ASSETS_DEF` 固定列表
- [ ] 支持 API 传入的 creators 数组
- [ ] 四权力配置粒度化（每个创作者独立开关/价格/费率）

### M1.2 UserAgent 升级

**当前**：随机按权重分配 6 种角色
**目标**：API 传入的 users 数组，支持角色 + 偏好 + 情绪参数

```python
class UserAgent(Agent):
    def __init__(self, unique_id, model, config: Dict):
        # config 包含：
        # - id, name, role: [浏览者|引用者|改编者|传播者|付费者|争议者]
        # - preferences: {explore_prob, domain_bias, ...}
        # - personality: {optimism, risk_tolerance, social_drive}
```

**改动**：
- [ ] 支持 API 传入的 users 数组
- [ ] 角色从硬编码权重改为显式定义
- [ ] 情绪参数可配置（乐观度、风险承受、社交需求）

### M1.3 环境参数

**当前**：硬编码 rules = {"platform_fee": 0.05, ...}
**目标**：API 传入 environment_params

```python
environment_params = {
    "platform_fee_percent": 5,
    "discovery_algorithm": "trending",  # trending | random | quality_first
    "market_growth_rate": 0.02,
    "cite_fee": 1.0,
    "remix_split_default": 0.30,
}
```

**改动**：
- [ ] EchoSimulation 构造函数接受 environment_params
- [ ] 所有行为逻辑引用环境参数而非硬编码
- [ ] 支持 discovery_algorithm 切换（影响用户发现资产的方式）

### M1.4 势位评估升级（S-Graph）

**当前**：简化的 3 维度阈值
**目标**：完整的张量模型 [时间×空间×关系]

```python
class SGraph:
    def __init__(self):
        self.tensor = {}  # {asset_id: {day: [time_dim, space_dim, relation_dim]}}
        self.nodes = []   # 资产节点
        self.edges = []   # 关系边（引用/改编/付费）
    
    def evaluate(self, asset_id, day):
        # 返回 [T, S, R] 三维势位
        # 映射到 L0-L3
```

**改动**：
- [ ] 创建 SGraph 类
- [ ] 每日记录资产的三维势位
- [ ] 支持资产生命周期查询（某一天的三维坐标）

---

## Milestone 2：响应数据丰富化（Day 3-4）

### M2.1 时序数据（timeseries）

**目标**：每天记录完整生态指标

```python
timeseries = [
    {
        "day": 1,
        "active_users": 18,
        "events": 45,
        "revenue": 12.00,
        "new_assets": 0,
        "disputes": 0,
        "avg_satisfaction": 5.2,
    }
]
```

**改动**：
- [ ] EchoSimulation.step() 中记录每日指标
- [ ] 返回时序列数组

### M2.2 资产生命周期（asset_lifecycle）

**目标**：每个资产从创作到退役的完整轨迹

```python
asset_lifecycle = [
    {
        "asset_id": "asset_1",
        "title": "《晨曦》",
        "creator": "林水墨",
        "created_day": 1,
        "shi_timeline": [
            {"day": 1, "position": [0, 0, 0], "level": "L0"},
            {"day": 15, "position": [1, 2, 1], "level": "L1"},
            {"day": 30, "position": [2, 3, 2], "level": "L2"},
        ],
        "events": [...],  # 该资产的所有事件
        "total_revenue": 45.50,
        "final_status": "活跃",  # 活跃|休眠|退役
    }
]
```

**改动**：
- [ ] 资产创建时记录生命周期起点
- [ ] 每日更新资产的势位坐标
- [ ] 统计资产累计收入、事件数

### M2.3 创作者结果（creator_results）

**目标**：每个创作者的完整实验结果

```python
creator_results = [
    {
        "creator_id": "creator_1",
        "name": "林水墨",
        "total_revenue": 123.50,
        "final_satisfaction": 7.2,
        "assets_created": 3,
        "citations_received": 12,
        "remixes_received": 5,
        "payments_received": 8,
        "shi_progression": [0, 0, 1, 1, 1, 2, 2, 2, 2, 3],  # 每天势位
        "config_history": [...],  # 配置变更记录
    }
]
```

### M2.4 S-Graph 数据结构

**目标**：完整的图结构，供前端可视化

```python
s_graph_data = {
    "nodes": [
        {"id": "asset_1", "type": "asset", "domain": "视觉艺术", "shi_level": 2},
        {"id": "creator_1", "type": "creator", "name": "林水墨"},
    ],
    "edges": [
        {"source": "user_3", "target": "asset_1", "type": "cite", "day": 5, "weight": 1},
        {"source": "asset_1", "target": "asset_7", "type": "remix", "day": 12, "weight": 1},
    ],
    "communities": [...],  # 社区发现结果（可选）
}
```

---

## Milestone 3：实验模式增强（Day 5-7）

### M3.1 配置策略锦标赛升级

**目标**：统计显著性检验 + 多维度对比

```python
tournament_results = {
    "results": {
        "保守型": {
            "avg_revenue": 234.50,
            "win_count": 2,
            "std_revenue": 45.20,  # 新增：标准差
        }
    },
    "statistical_significance": {
        "open_vs_conservative": {
            "t_statistic": 3.45,
            "p_value": 0.003,
            "significant": True,
            "effect_size": 0.65,  # Cohen's d
        }
    }
}
```

**改动**：
- [ ] 引入 scipy.stats.ttest_ind 做 t 检验
- [ ] 计算 Cohen's d 效应量
- [ ] 配对比较所有策略组合

### M3.2 A/B 实验升级

**目标**：完整的假设检验

```python
ab_results = {
    "echo_group": {...},
    "control_group": {...},
    "hypothesis_test": {
        "t_statistic": 4.56,
        "p_value": 0.0001,
        "significant": True,
        "effect_size": 0.45,
        "confidence_interval_95": [12.3, 45.6],  # 95% 置信区间
    }
}
```

### M3.3 鲁棒性测试（Robustness）

**新增端点**：`POST /run/robustness`

**目标**：测试系统在不同参数下的稳定性

```python
robustness_request = {
    "parameter": "platform_fee_percent",
    "range": [0, 5, 10, 20, 30],
    "n_runs_per_value": 10,
    "baseline_config": {...}
}

robustness_results = {
    "parameter": "platform_fee_percent",
    "sensitivity": [
        {"value": 0, "avg_revenue": 520.0, "std": 23.5},
        {"value": 5, "avg_revenue": 480.0, "std": 21.2},
        {"value": 10, "avg_revenue": 420.0, "std": 28.7},
    ],
    "breakdown_point": 15,  # 系统开始崩溃的参数值
}
```

---

## API 接口变更对照

| 端点 | 当前请求 | 新请求（对齐 v1.0） | 状态 |
|:---|:---|:---|:---|
| `POST /run` | `n_creators`, `n_users`, `duration_days`, `strategy` | 完整 `simulation_config` + `creators[]` + `users[]` + `environment_params` | M1 |
| `POST /run/tournament` | `strategies[]`, `n_rounds` | 同上 + `metrics[]` + 统计配置 | M3.1 |
| `POST /run/ab` | `n_rounds` | `echo_group` + `control_group` + 完整配置 | M3.2 |
| `POST /run/robustness` | ❌ 不存在 | 新增 | M3.3 |
| `GET /config` | strategies + defaults | + creator_types + user_roles + four_powers | M1 |

---

## 实施顺序

**Week 1**：
- Day 1：M1.1 CreatorAgent 升级 + M1.3 环境参数
- Day 2：M1.2 UserAgent 升级 + M1.4 S-Graph 类
- Day 3：M2.1 时序数据 + M2.2 资产生命周期
- Day 4：M2.3 创作者结果 + M2.4 S-Graph 数据结构
- Day 5：M3.1 锦标赛统计 + M3.2 A/B 检验
- Day 6：M3.3 鲁棒性测试 + API 接口同步更新
- Day 7：联调测试 + Bug 修复 + 文档更新

---

## 验收标准

1. **API 测试**：curl 所有端点，返回结构严格对齐 v1.0
2. **数据验证**：时序数据每天一条，资产生命周期完整
3. **统计检验**：t-test p 值合理，effect size 有值
4. **前端兼容**：新 API 响应能被现有前端渲染（字段名兼容）
5. **性能**：6 创作者 × 20 用户 × 30 天 < 5 秒

---

## 文件修改清单

| 文件 | 操作 | 说明 |
|:---|:---|:---|
| `echo_simulation_mesa.py` | **重写** | 核心引擎，约 60% 代码改动 |
| `echo_simulator_api.py` | **修改** | 请求/响应模型 + 端点扩展 |
| `echo_contract_mock.py` | 微调 | 四权力验证逻辑 |
| `simulator-connection-guide.md` | 更新 | 新增 /run/robustness 说明 |

---

**雨娃备注**：
- 这是个大工程，建议分 3 个 subagent 并行：M1/M2/M3 各一个
- 或者我先做 M1+M2（核心数据），M3 后续补充
- 等 Founder 确认优先级后启动

**2026-05-18 12:20**
