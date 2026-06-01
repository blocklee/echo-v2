# ECHO 模拟器接口定义文档 v1.0

> **文档状态**: 草案，待团队确认
> **日期**: 2026-05-14
> **维护者**: 雨娃（模拟机制设计小组）
> **目标**: 明确前端、后端、模拟引擎之间的数据契约，支撑团队并行开发

---

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Frontend)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  可视化面板   │  │  配置编辑器   │  │   实验控制台      │   │
│  │ (D3.js)      │  │ (React)      │  │   (模式选择/启动) │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   后端 API (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /run         │  │ /tournament  │  │ /ab              │   │
│  │ /health      │  │ /config      │  │                  │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                模拟引擎 (Mesa/Python)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Agent 行为   │  │  经济系统     │  │   势位评估        │   │
│  │  模型         │  │  (四权力)     │  │   (S-Graph)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API 端点定义

### 2.1 健康检查
```
GET /health
```
**响应**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "engine": "mesa",
  "capabilities": ["single_run", "tournament", "ab_test", "robustness"]
}
```

---

### 2.2 获取默认配置
```
GET /config
```
**响应**:
```json
{
  "default_simulation": {
    "duration_days": 30,
    "num_creators": 6,
    "num_users": 20,
    "seed": null
  },
  "creator_types": ["保守型", "开放型", "平衡型", "策略型"],
  "user_roles": ["浏览者", "引用者", "改编者", "传播者", "付费者", "争议者"],
  "four_powers": {
    "铸": "铸造权",
    "衍": "衍生权",
    "扩": "扩展权",
    "收": "收益权"
  }
}
```

---

### 2.3 单次模拟运行
```
POST /run
```
**请求体**:
```json
{
  "simulation_config": {
    "duration_days": 30,
    "num_creators": 6,
    "num_users": 20,
    "seed": 42
  },
  "creators": [
    {
      "id": "creator_1",
      "name": "林水墨",
      "type": "保守型",
      "asset_config": {
        "铸": { "enabled": true, "price": 100 },
        "衍": { "enabled": true, "max_derivatives": 3, "fee_percent": 15 },
        "扩": { "enabled": true, "platforms": ["web", "app"] },
        "收": { "enabled": true, "revenue_share": 70 }
      },
      "initial_work": {
        "title": "《晨曦》",
        "category": "视觉艺术",
        "quality_score": 8.5
      }
    }
  ],
  "users": [
    {
      "id": "user_1",
      "role": "浏览者",
      "behavior_profile": {
        "activity_level": 0.7,
        "preference_categories": ["视觉艺术", "音乐"],
        "price_sensitivity": 0.3
      }
    }
  ],
  "environment_params": {
    "platform_fee_percent": 5,
    "discovery_algorithm": "trending",
    "market_growth_rate": 0.02
  }
}
```

**响应**:
```json
{
  "run_id": "run_20260514_001",
  "status": "completed",
  "summary": {
    "total_events": 1196,
    "onchain_events": 310,
    "total_revenue": 2847.50,
    "creator_satisfaction": 6.8,
    "ecosystem_health": 0.72
  },
  "timeseries": [
    {
      "day": 1,
      "active_users": 18,
      "events": 45,
      "revenue": 12.00,
      "assets_minted": 6
    }
  ],
  "creator_results": [
    {
      "creator_id": "creator_1",
      "final_revenue": 456.00,
      "asset_count": 3,
      "final_shi_position": [2, 3, 2],
      "satisfaction": 7.2,
      "key_events": ["asset_minted", "derivative_created", "revenue_received"]
    }
  ],
  "asset_lifecycle": [
    {
      "asset_id": "asset_1",
      "creator_id": "creator_1",
      "creation_day": 1,
      "shi_timeline": [
        { "day": 1, "position": [0, 0, 0] },
        { "day": 7, "position": [1, 1, 1] },
        { "day": 30, "position": [2, 3, 2] }
      ],
      "events": [
        { "day": 5, "type": "引用", "user_id": "user_3", "revenue": 15.00 }
      ]
    }
  ],
  "s_graph_data": {
    "nodes": [...],
    "edges": [...],
    "centrality_metrics": {...}
  }
}
```

---

### 2.4 配置策略锦标赛
```
POST /tournament
```
**请求体**:
```json
{
  "strategies": ["保守型", "开放型", "平衡型", "策略型"],
  "simulation_config": {
    "duration_days": 30,
    "runs_per_strategy": 10,
    "num_users": 20
  },
  "metrics": ["revenue", "satisfaction", "ecosystem_health", "asset_growth"]
}
```

**响应**:
```json
{
  "tournament_id": "tour_20260514_001",
  "results": {
    "保守型": {
      "avg_revenue": 234.50,
      "avg_satisfaction": 6.67,
      "win_count": 2
    },
    "开放型": {
      "avg_revenue": 460.00,
      "avg_satisfaction": 6.33,
      "win_count": 5
    }
  },
  "ranking": ["开放型", "平衡型", "策略型", "保守型"],
  "statistical_significance": {
    "open_vs_conservative": { "p_value": 0.003, "significant": true }
  }
}
```

---

### 2.5 A/B 对照实验
```
POST /ab
```
**请求体**:
```json
{
  "echo_group": {
    "enabled": true,
    "platform_fee": 5,
    "rights_enabled": ["铸", "衍", "扩", "收"]
  },
  "control_group": {
    "enabled": false,
    "platform_fee": 30,
    "rights_enabled": ["收"]
  },
  "simulation_config": {
    "duration_days": 90,
    "num_runs": 100,
    "num_creators": 100,
    "num_users": 500
  },
  "metrics": [
    "total_creator_revenue",
    "creator_retention_rate",
    "ecosystem_diversity",
    "user_engagement"
  ]
}
```

**响应**:
```json
{
  "ab_test_id": "ab_20260514_001",
  "echo_group": {
    "mean_revenue": 4520.00,
    "std_revenue": 1200.00,
    "mean_retention": 0.78,
    "mean_diversity": 0.65
  },
  "control_group": {
    "mean_revenue": 2800.00,
    "std_revenue": 1500.00,
    "mean_retention": 0.45,
    "mean_diversity": 0.32
  },
  "hypothesis_test": {
    "t_statistic": 4.56,
    "p_value": 0.0001,
    "significant": true,
    "effect_size": 0.45
  },
  "conclusion": "ECHO组在创作者收入和留存率上显著优于传统平台"
}
```

---

## 3. 前端 ↔ 可视化数据格式

### 3.1 实时模拟可视化
```json
{
  "visualization_type": "realtime_simulation",
  "data": {
    "nodes": [
      {
        "id": "creator_1",
        "type": "creator",
        "x": 100,
        "y": 200,
        "properties": {
          "name": "林水墨",
          "revenue": 456.00,
          "shi_level": 2
        }
      },
      {
        "id": "asset_1",
        "type": "asset",
        "x": 300,
        "y": 200,
        "properties": {
          "title": "《晨曦》",
          "derivatives": 2,
          "shi_position": [2, 3, 2]
        }
      }
    ],
    "edges": [
      {
        "source": "creator_1",
        "target": "asset_1",
        "type": "created",
        "properties": { "day": 1 }
      }
    ],
    "metrics_panel": {
      "day": 15,
      "total_events": 600,
      "active_creators": 5,
      "total_revenue": 1500.00
    }
  }
}
```

### 3.2 锦标赛对比可视化
```json
{
  "visualization_type": "tournament_comparison",
  "data": {
    "strategies": ["保守型", "开放型", "平衡型", "策略型"],
    "dimensions": ["revenue", "satisfaction", "health", "growth"],
    "radar_data": [
      { "strategy": "保守型", "revenue": 0.5, "satisfaction": 0.8, "health": 0.6, "growth": 0.3 },
      { "strategy": "开放型", "revenue": 1.0, "satisfaction": 0.7, "health": 0.9, "growth": 0.9 }
    ],
    "bar_chart": {
      "x_axis": "strategy",
      "y_axis": "avg_revenue",
      "values": [...]
    }
  }
}
```

---

## 4. 核心数据类型定义

### 4.1 创作者配置 (CreatorConfig)
```typescript
interface CreatorConfig {
  id: string;
  name: string;
  type: "保守型" | "开放型" | "平衡型" | "策略型";
  asset_config: {
    铸: MintConfig;
    衍: DerivativeConfig;
    扩: ExpandConfig;
    收: RevenueConfig;
  };
  initial_work: AssetDefinition;
  behavior_params?: {
    adaptability: number;      // 0-1, 配置调整意愿
    quality_focus: number;    // 0-1, 质量vs数量偏好
    social_activity: number;    // 0-1, 社区参与度
  };
}
```

### 4.2 用户行为配置 (UserConfig)
```typescript
interface UserConfig {
  id: string;
  role: "浏览者" | "引用者" | "改编者" | "传播者" | "付费者" | "争议者";
  behavior_profile: {
    activity_level: number;      // 0-1, 每日活跃概率
    preference_categories: string[];
    price_sensitivity: number;   // 0-1, 价格敏感程度
    discovery_bias: "trending" | "random" | "category" | "creator";
    interaction_depth: "surface" | "deep" | "engaged";
  };
  memory_params?: {
    short_term_window: number;   // 天数
    trend_sensitivity: number;   // 0-1
  };
}
```

### 4.3 四权力配置
```typescript
interface MintConfig {
  enabled: boolean;
  price: number;              // 初始铸造价格
  currency: "ECHO" | "USD";   // 计价单位
}

interface DerivativeConfig {
  enabled: boolean;
  max_derivatives: number;    // 最大衍生层数
  fee_percent: number;        // 衍生费用百分比
  approval_required: boolean; // 是否需要创作者审批
}

interface ExpandConfig {
  enabled: boolean;
  platforms: string[];        // 允许的平台列表
  auto_approve: boolean;      // 是否自动批准扩展请求
}

interface RevenueConfig {
  enabled: boolean;
  revenue_share: number;      // 创作者分成比例 (0-100)
  instant_payout: boolean;    // 是否即时结算
}
```

### 4.4 势位评估结果 (ShiPosition)
```typescript
interface ShiPosition {
  time_dimension: number;     // 0-3, 基于事件数量
  space_dimension: number;    // 0-3, 基于平台覆盖
  relation_dimension: number; // 0-3, 基于关系事件数
  overall_level: number;      // 0-3, 综合势位
  timestamp: string;
}
```

---

## 5. 错误处理规范

### 5.1 标准错误格式
```json
{
  "error": {
    "code": "INVALID_CONFIG",
    "message": "创作者配置中铸权力价格不能为负数",
    "field": "creators[0].asset_config.铸.price",
    "suggestion": "请设置大于等于0的价格，或使用-1表示免费"
  }
}
```

### 5.2 错误码列表
| 错误码 | 说明 | HTTP状态码 |
|:---|:---|:---|
| `INVALID_CONFIG` | 配置参数错误 | 400 |
| `SIMULATION_FAILED` | 模拟运行失败 | 500 |
| `TIMEOUT` | 模拟超时（大规模运行） | 504 |
| `UNSUPPORTED_MODE` | 不支持的实验模式 | 400 |
| `RATE_LIMIT` | 请求频率限制 | 429 |

---

## 6. 版本控制与兼容性

- **当前版本**: v1.0 (草案)
- **版本策略**: 端点路径包含版本前缀 `/api/v1/`
- **向后兼容**: 小版本更新保持兼容，大版本变更通过新路径 `/api/v2/`
- **变更日志**: 记录在 `docs/api-changelog.md`

---

## 7. 待确认事项

| # | 事项 | 涉及小组 | 建议决策 |
|:---|:---|:---|:---|
| 1 | 势位评估维度是否只有3个（时间/空间/关系）？ | 架构后端 + 模拟机制 | 确认或扩展 |
| 2 | A/B实验对照组平台抽成是否固定30%？ | 产品 + 模拟机制 | 确认或可调 |
| 3 | 创作者行为参数（adaptability等）是否需要？ | 模拟机制 | 确认或简化 |
| 4 | 并发性能目标：1000创作者/5000用户 vs 100/500？ | 架构后端 + 产品 | 确认阶段目标 |
| 5 | 实时模式是否需要WebSocket推送？还是轮询？ | 前端 + 架构后端 | 技术选型 |

---

**下一步**: 本周末团队对齐会确认以上接口，确认后冻结 v1.0 并进入实现阶段。

---

*文档由雨娃整理，基于现有 `echo_simulator_api.py` 和 `visualization_mesa.html` 的已实现接口*
