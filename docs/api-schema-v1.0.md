# ECHO: Battle of Potential - API Schema v1.0
## 势位之战 前端 API 规范 (MVP)

**版本**: v1.0
**作者**: Seaman_bot
**生成时间**: 2026-06-02 10:48+08:00
**状态**: Draft (等待四权定价参数占位符确认)

---

## 1. 架构概述

```
Frontend (React) 
    ↕ HTTP/WebSocket
Game API Server (Node.js/Express)
    ↕ ethers.js
ECHO Smart Contracts (Qitmeer Mainnet, Chain ID: 813)
    ↕ events
ECHO Indexer (Node.js Event Listener)
```

- **Base URL**: `https://api.battleofpotential.echo/`
- **WebSocket**: `wss://ws.battleofpotential.echo/`
- **Auth**: 钱包签名 (MetaMask/Qitmeer compatible)

---

## 2. 认证

### 2.1 钱包登录
```
POST /auth/nonce
Body: { walletAddress: "0x..." }
Response: { nonce: "random-string", message: "Sign this message to login..." }

POST /auth/verify
Body: { walletAddress: "0x...", signature: "0x..." }
Response: { token: "jwt-token", expiresAt: timestamp }
```

---

## 3. 铸造 API (肇始)

### 3.1 铸造卡牌 (Create Node)
```
POST /cards/mint
Headers: Authorization: Bearer {token}
Body:
{
  "contentHash": "0xabc123...",      // IPFS/Arweave 内容哈希
  "metadata": {
    "name": "Thunder Blade",
    "description": "...",
    "image": "ipfs://Qm...",
    "attributes": {
      "attack": 85,
      "defense": 40,
      "energy": 3,
      "element": "thunder"
    }
  },
  "quadrant": {                      // 四权配置 (肇始锁定)
    "usage": 1,    // 0=私密, 1=社群, 2=开放
    "derive": 1,   // 0=封闭, 1=条件, 2=开放
    "expand": 2,   // 0=锁定, 1=条件, 2=自由
    "benefit": 1   // 0=免费, 1=按次, 2=分成
  },
  "mintPrice": "0.5"                 // MEER, 占位符 (等猫先森定价)
}

Response:
{
  "success": true,
  "data": {
    "nodeId": "0xnodehash...",
    "txHash": "0xtxhash...",
    "creator": "0xwallet...",
    "quadrantLocked": true,
    "potential": 0,                    // 初始势位
    "createdAt": "2026-06-02T10:48:00Z"
  }
}
```

### 3.2 查询我的卡牌
```
GET /cards/mine
Query: { page=1, limit=20, sortBy="createdAt|potential|usage" }
Response:
{
  "cards": [
    {
      "nodeId": "0x...",
      "name": "Thunder Blade",
      "contentHash": "0x...",
      "quadrant": { "usage":1, "derive":1, "expand":2, "benefit":1 },
      "potential": 156.7,              // 当前势位
      "inDegree": 12,                  // 被编排次数
      "outDegree": 3,                  // 编排别人次数
      "version": "1.0.0",
      "createdAt": "...",
      "lastUsedAt": "..."
    }
  ],
  "pagination": { "page":1, "limit":20, "total":47 }
}
```

### 3.3 查询卡牌详情
```
GET /cards/:nodeId
Response:
{
  "nodeId": "0x...",
  "creator": "0x...",
  "contentHash": "0x...",
  "metadata": {...},
  "quadrant": {...},
  "potential": 156.7,
  "potentialHistory": [              // 势位心电图
    { "timestamp": "...", "value": 150.2 },
    { "timestamp": "...", "value": 156.7 }
  ],
  "edges": {
    "inbound": [                       // 谁编排了我
      { "fromNodeId": "0x...", "edgeType": "expand", "weight": 0.8, "declarer": "0x..." }
    ],
    "outbound": [                      // 我编排了谁
      { "toNodeId": "0x...", "edgeType": "derive", "weight": 1.0 }
    ]
  },
  "versions": [                        // 版本历史
    { "version": "1.0.0", "nodeId": "0x...", "frozen": false },
    { "version": "2.0.0", "nodeId": "0x...", "frozen": false }
  ]
}
```

---

## 4. 编排 API (流行)

### 4.1 创建编排边 (Declare Edge)
```
POST /edges/declare
Headers: Authorization: Bearer {token}
Body:
{
  "fromNodeId": "0xcardA...",        // 被编排的卡牌 (目标)
  "toNodeId": "0xdeckB...",          // 编排者 (牌组/作品)
  "edgeType": "expand",              // "use"|"derive"|"expand"|"benefit"
  "weight": 0.8,                     // 伦理厚度 0.0~1.0
  "contentHash": "0x...",            // 编排作品的内容哈希 (5.3 知识桥接精度要求)
  "permissionProof": "0x..."         // 授权证明 (链上签名)
}

Response:
{
  "success": true,
  "data": {
    "edgeId": "0xedgehash...",
    "txHash": "0xtxhash...",
    "status": "active",
    "createdAt": "..."
  }
}
```

### 4.2 查询编排关系
```
GET /edges?nodeId=0x...&type=expand&direction=inbound
Response:
{
  "edges": [
    {
      "edgeId": "0x...",
      "fromNodeId": "0x...",
      "toNodeId": "0x...",
      "edgeType": "expand",
      "weight": 0.8,
      "contentHash": "0x...",        // 可验证
      "declarer": "0x...",
      "createdAt": "..."
    }
  ]
}
```

### 4.3 牌组编排 (Deck Assembly)
```
POST /decks/create
Body:
{
  "name": "Thunder Storm",
  "cards": [
    { "nodeId": "0xcard1...", "slot": 1, "weight": 1.0 },
    { "nodeId": "0xcard2...", "slot": 2, "weight": 0.9 },
    { "nodeId": "0xcard3...", "slot": 3, "weight": 0.7 }
  ],
  "declareEdges": true              // 自动声明所有编排边
}

Response:
{
  "deckId": "0x...",
  "totalPotential": 342.5,           // 牌组总势位
  "edgeTxHashes": ["0x...", "0x..."],
  "assemblyFee": "0.01"              // MEER, 占位符
}
```

---

## 5. 对战 API (流行/性命)

### 5.1 创建对战
```
POST /battles/create
Body:
{
  "deckId": "0x...",
  "betAmount": "1.0",                // MEER 投注, 占位符 (0.1~10 MEER)
  "opponent": "random|friend|0x..."  // 匹配方式
}

Response:
{
  "battleId": "0xbattle...",
  "status": "matching",              // matching -> ready -> battling -> ended
  "createdAt": "..."
}
```

### 5.2 WebSocket 实时对战流
```
WebSocket: wss://ws.battleofpotential.echo/battles/{battleId}

// 连接后发送认证
{ "type": "auth", "token": "jwt-token" }

// 事件流 (Server → Client)
{
  "type": "battle:start",
  "data": {
    "battleId": "0x...",
    "players": [
      { "address": "0xA...", "deckId": "0x...", "hp": 100, "energy": 0 },
      { "address": "0xB...", "deckId": "0x...", "hp": 100, "energy": 0 }
    ],
    "phase": "preparation",
    "round": 0
  }
}

{
  "type": "battle:phase",
  "data": {
    "battleId": "0x...",
    "phase": "draw",                   // preparation|draw|main|combat|end
    "activePlayer": "0xA...",
    "round": 1,
    "timestamp": 1717303680000
  }
}

{
  "type": "battle:card_played",
  "data": {
    "battleId": "0x...",
    "player": "0xA...",
    "cardNodeId": "0x...",
    "cardName": "Thunder Blade",
    "target": "0xB...",
    "effect": { "type": "damage", "value": 15 },
    "energyDelta": -3,
    "timestamp": 1717303681000
  }
}

{
  "type": "battle:state",
  "data": {
    "battleId": "0x...",
    "players": [
      { "address": "0xA...", "hp": 85, "energy": 2, "shields": 0, "statusEffects": [] },
      { "address": "0xB...", "hp": 92, "energy": 4, "shields": 5, "statusEffects": ["stunned"] }
    ],
    "pendingEffects": []
  }
}

{
  "type": "battle:end",
  "data": {
    "battleId": "0x...",
    "winner": "0xA...",
    "mvpCardId": "0x...",              // 贡献最高的卡牌
    "potentialDelta": [                // 势位变化
      { "nodeId": "0x...", "delta": +5.2, "reason": "victory_bonus" },
      { "nodeId": "0x...", "delta": -1.3, "reason": "defeat_decay" }
    ],
    "revenuePool": "2.0",              // 总奖池 = 双方投注
    "distributedAt": "..."
  }
}
```

### 5.3 客户端操作 (Client → Server)
```
{ "type": "play_card", "cardIndex": 2, "target": "0xB..." }
{ "type": "pass_turn" }
{ "type": "surrender" }
```

---

## 6. 分账 API (流行/性命)

### 6.1 查询对战分账结果
```
GET /battles/:battleId/revenue
Response:
{
  "battleId": "0x...",
  "totalPool": "2.0",                // MEER
  "distribution": [
    {
      "nodeId": "0xcard1...",
      "recipient": "0xcreatorA...",   // 卡牌创作者
      "amount": "0.3",                // 基于势位权重
      "edgeType": "expand",           // 分成依据
      "weight": 0.8,
      "txHash": "0x..."
    },
    {
      "nodeId": "0xcard2...",
      "recipient": "0xcreatorB...",
      "amount": "0.5",
      "edgeType": "expand",
      "weight": 1.0,
      "txHash": "0x..."
    }
  ],
  "platformFee": "0.2",               // 10% = 山门 30% 中的协议层
  "distributed": true
}
```

### 6.2 查询我的收益
```
GET /revenue/mine
Query: { from="2026-06-01", to="2026-06-30" }
Response:
{
  "totalRevenue": "12.5",
  "bySource": [
    { "type": "battle_reward", "amount": "8.0" },
    { "type": "edge_usage", "amount": "3.5" },
    { "type": "derive_fee", "amount": "1.0" }
  ],
  "transactions": [
    { "txHash": "0x...", "amount": "0.5", "source": "battle:0x...", "timestamp": "..." }
  ]
}
```

---

## 7. 势位 API (性命/shigraph)

### 7.1 查询节点势位
```
GET /shigraph/potential/:nodeId
Response:
{
  "nodeId": "0x...",
  "currentPotential": 156.7,
  "formula": {
    "inDegreeWeight": 89.2,            // 入度贡献
    "freshnessDecay": 0.85,            // 时效衰减系数
    "bridgeBonus": 12.5,               // 跨社区桥接加成
    "opennessMultiplier": 1.2          // 四权开放度加成
  },
  "history": [...],
  "ranking": { "global": 1567, "category": 89 }
}
```

### 7.2 查询 shigraph 子图
```
GET /shigraph/subgraph?centerNodeId=0x...&depth=2&edgeTypes=expand,derive
Response:
{
  "nodes": [
    { "nodeId": "0x...", "potential": 156.7, "x": 100, "y": 200, "color": "#ff6b6b" }
  ],
  "edges": [
    { "from": "0x...", "to": "0x...", "type": "expand", "weight": 0.8, "color": "#4ecdc4" }
  ],
  "bounds": { "minX": -100, "maxX": 400, "minY": -50, "maxY": 500 }
}
```

### 7.3 势位地图动态更新 (WebSocket)
```
WebSocket: wss://ws.battleofpotential.echo/shigraph

{
  "type": "potential:update",
  "data": {
    "nodeId": "0x...",
    "newPotential": 158.3,
    "delta": +1.6,
    "reason": "battle_victory",
    "affectedEdges": ["0x...", "0x..."]
  }
}
```

---

## 8. 通变 API (配置变更)

### 8.1 发起配置变更 (Change Quadrant)
```
POST /cards/:nodeId/quadrant/change
Body:
{
  "newQuadrant": { "usage":2, "derive":1, "expand":2, "benefit":2 },
  "reason": "Opening up for wider adoption"
}

Response:
{
  "changeId": "0x...",
  "status": "pending",                 // pending ->公示期 -> applied|rejected
  "公示期End": "2026-06-05T10:48:00Z", // 基于势位动态计算, 占位符
  "affectedNodes": 12,                // 受影响的编排者数量
  "txHash": "0x..."
}
```

### 8.2 查询公示期状态
```
GET /cards/:nodeId/quadrant/change/:changeId
Response:
{
  "changeId": "0x...",
  "oldQuadrant": {...},
  "newQuadrant": {...},
  "公示期Remaining": 172800,          // 秒
  "objections": [                     // 反对意见
    { "fromNodeId": "0x...", "reason": "...", "signature": "0x..." }
  ],
  "status": "pending"
}
```

---

## 9. 事件/Index API

### 9.1 查询链上事件
```
GET /index/events?types=CardMinted,EdgeDeclared,BattleResult&fromBlock=17796114
Response:
{
  "events": [
    {
      "type": "CardMinted",
      "blockNumber": 17796115,
      "txHash": "0x...",
      "args": { "nodeId": "0x...", "creator": "0x...", "quadrant": {...} }
    }
  ],
  "lastBlock": 17796120
}
```

### 9.2 订阅事件流 (SSE/WebSocket)
```
WebSocket: wss://ws.battleofpotential.echo/index

{ "type": "subscribe", "events": ["CardMinted", "EdgeDeclared", "BattleResult"] }

// 实时推送
{ "type": "event", "data": { "type": "CardMinted", "args": {...} } }
```

---

## 10. 错误码

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| E001 | 四权配置无效 (死锁检测) | 400 |
| E002 | 公示期未满 | 403 |
| E003 | 势位不足 (操作受限) | 403 |
| E004 | 内容哈希不匹配 | 400 |
| E005 | 编排边已存在 | 409 |
| E006 | 投注金额超限 (0.1~10 MEER) | 400 |
| E007 | 对战状态异常 | 409 |
| E500 | 链上交易失败 | 502 |

---

## 11. 占位符清单 (等猫先森确认)

| 占位符 | 位置 | 说明 |
|--------|------|------|
| `mintPrice` | 3.1 | 卡牌铸造基础价格 |
| `assemblyFee` | 4.3 | 牌组编排手续费 |
| `betAmount` | 5.1 | 对战投注范围 (当前写死 0.1~10 MEER) |
| `platformFeeRate` | 6.1 | 平台抽成比例 |
| `公示期公式` | 8.1 | 势位→公示期时长 |
| `potentialFormula` | 7.1 | 势位完整计算公式 |
| `revenueSplit` | 6.1 | 创作者 vs 编排者 vs 平台分成比例 |

---

## 12. WebSocket 事件总览

| Event | Direction | 触发场景 |
|-------|-----------|----------|
| `battle:start` | S→C | 对战开始 |
| `battle:phase` | S→C | 阶段切换 |
| `battle:card_played` | S→C | 卡牌打出 |
| `battle:state` | S→C | 状态更新 |
| `battle:end` | S→C | 对战结束 |
| `play_card` | C→S | 玩家出牌 |
| `pass_turn` | C→S | 玩家跳过 |
| `surrender` | C→S | 玩家投降 |
| `potential:update` | S→C | 势位变化 |
| `event` | S→C | 链上事件 |

---

## 附录 A: 与 ECHO 合约事件映射

| API 事件 | 合约事件 | 合约地址 |
|----------|----------|----------|
| CardMinted | NodeCreated | CreatorConfig |
| EdgeDeclared | EdgeDeclared | EdgeDeclaration |
| BattleResult | - | 新合约 (待开发) |
| RevenueDistributed | - | 新合约 (待开发) |
| QuadrantChanged | QuadrantSet | CreatorConfig |

---

## 附录 B: 数据结构

### Card (节点)
```typescript
interface Card {
  nodeId: string;                    // bytes32
  creator: string;                   // address
  contentHash: string;               // bytes32
  metadata: Metadata;
  quadrant: Quadrant;
  potential: number;
  version: string;
  createdAt: string;
  frozen: boolean;
}

interface Quadrant {
  usage: 0|1|2;                      // 用权
  derive: 0|1|2;                     // 衍权
  expand: 0|1|2;                     // 扩权
  benefit: 0|1|2;                    // 益权
}
```

### Edge (编排边)
```typescript
interface Edge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'use'|'derive'|'expand'|'benefit';
  weight: number;                    // 0.0~1.0
  contentHash: string;               // 知识桥接精度校验
  declarer: string;
  createdAt: string;
  status: 'active'|'pending'|'revoked';
}
```

---

**待办**:
- [ ] 猫先森确认经济参数 (11项占位符)
- [ ] Talus 前端对接 schema
- [ ] 合约地址更新 (新 Battle/Revenue 合约部署后)

**下一版**: v1.1 (经济参数确认后 2h 内)
