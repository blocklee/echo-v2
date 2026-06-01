# ECHO 模拟器 · 真正实现路线图

**日期**：2026-05-14
**目标**：将当前"前端演示原型"升级为"完整实验平台"
**核心问题**：前端用纯JS引擎，后端Mesa引擎行为逻辑薄弱，两者未连接

---

## 一、现状诊断

### 已有资产

| 文件 | 行数 | 状态 | 问题 |
|:---|:---|:---|:---|
| `echo_simulation.js` | 1172 | ✅ 功能丰富 | 纯前端，规模上限低（浏览器内存） |
| `echo_simulation_mesa.py` | 754 | ⚠️ 可运行 | Agent行为逻辑过于简单（25事件 vs 前端12000+） |
| `echo_simulator_api.py` | 271 | ✅ 结构完整 | A/B、锦标赛端点存在，但底层引擎弱 |
| `visualization_mesa.html` | ~1500 | ✅ 可视化好 | **未连接后端API**，所有按钮调用前端JS |

### 核心差距

```
┌─────────────────────────────────────────────┐
│  前端 visualization_mesa.html                 │
│  ┌─────────────────────────────────────┐     │
│  │  按钮：运行 / 锦标赛 / A/B实验      │     │
│  │  ↓                                  │     │
│  │  new EchoModel()  ← 前端JS引擎      │     │
│  │  （模拟数据，非真实实验）              │     │
│  └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
                      ❌ 未连接
┌─────────────────────────────────────────────┐
│  后端 localhost:8000                          │
│  ┌─────────────────────────────────────┐     │
│  │  /run /run/tournament /run/ab       │     │
│  │  ↓                                  │     │
│  │  EchoSimulation() ← Mesa引擎        │     │
│  │  （行为简单，25事件/5天）             │     │
│  └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 二、技术路线决策

### 方案对比

| 方案 | 后端引擎 | 优点 | 缺点 | 推荐 |
|:---|:---|:---|:---|:---|
| A. 纯前端增强 | JS引擎 | 无需部署、即时反馈 | 规模受限、无法持久化 | ❌ |
| **B. 前后端分离** | **Mesa Python + FastAPI** | **规模可扩展、实验可复现** | **需部署后端** | **✅ 推荐** |
| C. 混合架构 | JS前端 + Mesa后端 | 兼具两者优点 | 架构复杂、维护成本高 | 🟡 备选 |

### 决策：方案 B（前后端分离）

**理由**：
1. Seaman 需求规格明确要求 Mesa Python 后端
2. A/B/锦标赛需要跑100轮蒙特卡洛，浏览器无法承受
3. 实验报告需要持久化存储，纯前端做不到
4. 未来需要1000+创作者规模，只有后端能做到

---

## 三、Phase 路线图

### Phase 1：连接前后端（本周，2-3天）

**目标**：让前端按钮真正调用后端API

| 任务 | 具体工作 | 验证标准 |
|:---|:---|:---|
| 1.1 启动后端 | `python3 echo_simulator_api.py` | `curl localhost:8000/health` 返回 ok |
| 1.2 前端连接 | 修改 `runSimulation()` 为 `fetch('http://localhost:8000/run')` | 点击"运行"，Network面板看到API请求 |
| 1.3 前端连接 | 修改 `runTournament()` 为 `fetch('/run/tournament')` | 点击"锦标赛"，看到真实多轮模拟 |
| 1.4 前端连接 | 修改 `runABTest()` 为 `fetch('/run/ab')` | 点击"A/B实验"，看到对照组数据 |
| 1.5 数据格式对齐 | 确保后端返回的JSON与前端渲染逻辑兼容 | 事件列表/排名/网络图正常显示 |
| 1.6 Loading状态 | 后端计算时显示进度条/加载动画 | 100轮实验不会让用户以为卡死 |

**风险**：Mesa引擎当前行为简单，连接后数据可能"太平淡"
**对策**：Phase 1 先用简单数据跑通链路，Phase 2 再丰富行为

---

### Phase 2：丰富 Mesa 引擎行为逻辑（本周~下周，3-4天）

**目标**：将前端JS的丰富Agent行为移植到Mesa Python

| 任务 | 来源 | 移植内容 | 验证标准 |
|:---|:---|:---|:---|
| 2.1 大五人格 | `echo_simulation.js` UserAgent | 5维度人格 + 角色默认配置 | Agent行为呈现差异化 |
| 2.2 感知系统 | `perceive()` 方法 | 相关性/信任度/新鲜度/疲劳度评分 | 不同Agent对同一资产评分不同 |
| 2.3 情绪系统 | `mood` + 记忆更新 | 收入/被拒/引用影响mood | 连续被拒后mood下降→行为改变 |
| 2.4 记忆系统 | `memory` 对象 | eventLog/incomeHistory/spendingLog | 有交互历史的Agent更信任资产 |
| 2.5 决策系统 | `evaluate()` 方法 | 效用计算 + 行为选择 | Agent不是随机行动，有明确原因 |
| 2.6 创作者涌现 | `maybeCreate()` | 用户→创作者转换机制 | 模拟中出现"用户X的新作品" |
| 2.7 势位评估 | `shiLevel` 计算 | 时间/空间/关系三维度 | 资产势位随事件增长 |
| 2.8 发现轮播 | `discoveryMode` | 30%概率推新 | 尾部创作者被发现概率>40% |
| 2.9 事件丰富化 | 11种事件类型 | browse/cite/remix/pay/spread/dispute/config_change/rest/reject/create | 事件列表类型多样 |
| 2.10 经济结算 | 收入/支出逻辑 | 引用费/改编分成/平台费 | 创作者钱包有真实变化 |

**关键里程碑**：
- Mesa引擎单轮30天/6创作者/20用户 → 事件数 > 1000（接近前端水平）
- 创作者收入不为0（当前Mesa版收入=0）
- 势位有真实变化（L0→L1→L2）

---

### Phase 3：完整实验框架（下周，2-3天）

**目标**：实现需求规格中所有4种实验模式

| 实验模式 | 当前状态 | 需实现 | 验证标准 |
|:---|:---|:---|:---|
| **A/B对照实验** | ⚠️ 有API但引擎弱 | 对照组逻辑完善 + 统计检验 | 100轮后p值<0.05可判定显著 |
| **配置策略锦标赛** | ⚠️ 有API但引擎弱 | 4策略 × 100轮 + 排名可视化 | 开放型收入>保守型 |
| **纵向比较实验** | ❌ 完全缺失 | 5模块API + 参数扫描 | 可对比元规则版本/势图算法/经济参数 |
| **鲁棒性测试** | ❌ 完全缺失 | 极端配置 + 攻击模拟 + 头部退出 | 极端配置下生态不崩溃 |

**新增API端点**：
```python
@app.post("/run/longitudinal")  # 纵向比较
@app.post("/run/robustness")     # 鲁棒性测试
@app.get("/experiments")        # 查看历史实验
@app.get("/experiments/{id}/report")  # 下载Markdown报告
```

---

### Phase 4：规模扩展与性能优化（下下周，2-3天）

**目标**：从"6创作者/20用户"扩展到"1000创作者/5000用户"

| 任务 | 方法 | 验证标准 |
|:---|:---|:---|
| 4.1 性能基准 | `PerformanceMonitor` 类 | 记录每步耗时、内存峰值 |
| 4.2 并行计算 | `multiprocessing` 多进程 | 1000创作者模拟 < 5分钟 |
| 4.3 内存优化 | 事件采样（非全量存储） | 内存占用 < 4GB |
| 4.4 前端优化 | 虚拟滚动 + 数据分页 | 1000创作者列表不卡顿 |
| 4.5 部署方案 | Docker + 云服务器 | 非 localhost 可访问 |

---

### Phase 5：缺失功能补齐（后续，按需）

| 功能 | 需求规格章节 | 优先级 |
|:---|:---|:---|
| 创作者配置动态调整 | 流转即生命 | P1 |
| 协商机制（改编请求队列） | 规则层 | P1 |
| Embedding语义匹配 | 七、AI混合 | P2 |
| ShiGraph社交网络 | 四、架构 | P2 |
| 多模态资产（视觉/音频/代码） | 八、感知 | P2 |
| 势位升级仪式动画 | 十、交互 | P3 |
| 资产详情页（生命周期回放） | 十、交互 | P3 |
| 实验报告自动生成 | 二、模式 | P1 |

---

## 四、本周具体执行计划（Phase 1 + Phase 2 起步）

### Day 1（今天）：连接前后端

```bash
# 1. 启动后端
cd /root/.openclaw/workspace/echo-v2/simulation
python3 echo_simulator_api.py

# 2. 验证后端运行
curl http://localhost:8000/health
curl http://localhost:8000/config

# 3. 修改前端 visualization_mesa.html
#    - runSimulation() → fetch POST /run
#    - runTournament() → fetch POST /run/tournament
#    - runABTest() → fetch POST /run/ab

# 4. 验证前端调用
#    浏览器打开页面 → F12 Network → 点击"运行模拟" → 看到API请求
```

### Day 2：数据格式对齐

- 确保后端 `/run` 返回的 JSON 包含前端需要的所有字段
- 关键字段：`snapshots` / `events` / `creatorStates` / `userStates`
- 如果后端缺少字段，修改 Mesa 引擎补充

### Day 3：移植大五人格 + 感知系统

- 将 `echo_simulation.js` 中的 `UserAgent.perceive()` 移植到 Mesa
- 将人格默认值移植到 Mesa
- 验证：不同角色的Agent行为不同

### Day 4：移植情绪系统 + 记忆系统

- mood更新逻辑
- eventLog / incomeHistory / spendingLog
- 验证：连续被拒后行为改变

### Day 5：移植创作者涌现 + 发现轮播

- 用户→创作者转换
- discoveryMode 推新机制
- 验证：尾部创作者被发现概率

---

## 五、技术决策细节

### 前端API调用模式

```javascript
// 当前：纯前端
const model = new EchoModel(cfg);
simData = model.run();

// 目标：后端API
const response = await fetch('http://localhost:8000/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        n_creators: cfg.nCreators,
        n_users: cfg.nUsers,
        duration_days: cfg.durationDays,
        seed: cfg.seed,
    })
});
simData = await response.json();
```

### 后端部署选项

| 环境 | 启动方式 | 适用场景 |
|:---|:---|:---|
| 本地开发 | `python3 echo_simulator_api.py` | Founder本地测试 |
| Docker | `docker run echo-simulator` | 团队共享 |
| 云服务器 | systemd / supervisor | 24/7在线 |
| Serverless | Cloudflare Workers / Vercel | 按需付费 |

**推荐**：现阶段本地开发 + 未来Docker部署

---

## 六、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|:---|:---|:---|:---|
| Mesa引擎移植复杂 | 中 | 高 | 分批移植，先核心后边缘 |
| 后端启动麻烦 | 高 | 中 | 提供一键启动脚本 |
| 前端等待时间长 | 中 | 中 | 加Loading动画 + 进度条 |
| CORS跨域问题 | 低 | 中 | 后端已配置allow_origins=["*"] |
| 100轮实验超时 | 中 | 中 | 加timeout + 分批返回 |

---

## 七、成功标准

### Phase 1 完成标志
- [ ] 点击"运行模拟" → Network面板看到 `POST /run` 请求
- [ ] 点击"锦标赛" → Network面板看到 `POST /run/tournament` 请求
- [ ] 点击"A/B实验" → Network面板看到 `POST /run/ab` 请求
- [ ] 所有返回数据正确渲染到界面

### Phase 2 完成标志
- [ ] Mesa引擎单轮事件数 > 1000（6创作者/20用户/30天）
- [ ] 创作者收入均值 > 0
- [ ] 势位有L0→L1→L2变化
- [ ] 用户→创作者涌现出现

### Phase 3 完成标志
- [ ] 4种实验模式全部可运行
- [ ] 生成Markdown格式实验报告
- [ ] 实验结果可下载/分享

---

*规划：雨娃（Yuwa）*
*我们一起种树 🌱*
