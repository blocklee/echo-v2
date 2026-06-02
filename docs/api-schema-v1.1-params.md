# ECHO: Battle of Potential - API Schema v1.1
## 势位之战 前端 API 规范 (MVP) — 经济参数已填入

**版本**: v1.1
**作者**: Seaman_bot
**更新**: 2026-06-02 10:53+08:00 (猫先森参数 v0.1 填入)
**状态**: Ready for Contract Development

---

## 经济参数表 (v0.1 — 猫先森 10:53 提供)

| 参数 | 值 | 字段类型 | 说明 |
|------|-----|----------|------|
| **用权基价** | 0.01 MEER | uint256 usageBasePrice | 每次使用费用 |
| **衍权基价** | 0.05 MEER | uint256 deriveBasePrice | 衍生授权费用 |
| **扩权基价** | 0.10 MEER | uint256 expandBasePrice | 编排引用费用 |
| **铸卡费** | 0.02 MEER | uint256 mintFee | CardMinted 基础费用 |
| **牌组编排费** | 0.01 MEER | uint256 assemblyFee | Deck 创建费用 |
| **投注范围** | 0.1 ~ 10 MEER | uint256[2] betRange | 对战投注 |
| **平台抽成** | 5% | uint16 platformFeeBps (500) | 系统维护 |
| **山门收益** | 30% | uint16 gateFeeBps (3000) | 哪吒 |
| **模型升级池** | 20% | uint16 upgradePoolBps (2000) | Agent 升级基金 |
| **创作者份额** | 45% | uint16 creatorShareBps (4500) | 卡牌创作者 |
| **编排者份额** | 25% | uint16 edgeShareBps (2500) | 牌组编排者 |
| **审查员份额** | 8% | uint16 reviewerShareBps (800) | AgentJury |
| **公共池份额** | 8% | uint16 publicPoolBps (800) | 社区奖励 |
| **大使份额** | 5% | uint16 ambassadorBps (500) | 推广者 |

### 势位档位与溢价
```solidity
uint8[] tierMultipliers = [100, 120, 150, 180, 220, 250]; // 基准 100 = 1.0x
// 档位 1=青铜, 2=白银, 3=黄金, 4=白金, 5=钻石, 6=大师
```

### 势位-收益函数
```solidity
function revenueMultiplier(uint8 tier, bool isWin) public pure returns (uint256) {
    uint256 base = 100 + (tier - 1) * 25; // 1 + (tier-1)*0.25
    return isWin ? base * 120 / 100 : base * 80 / 100; // 胜利×1.2, 失败×0.8
}
```

### 创作者内部分配（按势位加权）
```solidity
// CreatorShare_i = TotalPool × (Potential_i / ΣPotential_j)
function calculateCreatorShare(
    uint256 totalPool,
    uint256 myPotential,
    uint256 totalPotential
) public pure returns (uint256) {
    return totalPool * myPotential / totalPotential;
}
```

---

## 合约接口 (新增 — 基于经济参数)

### CardMinting 合约
```solidity
contract CardMinting {
    uint256 public constant MINT_FEE = 0.02 ether; // 2e16 wei
    uint256 public constant USAGE_BASE = 0.01 ether;
    uint256 public constant DERIVE_BASE = 0.05 ether;
    uint256 public constant EXPAND_BASE = 0.10 ether;
    
    function mintCard(
        bytes32 contentHash,
        Quadrant calldata quadrant
    ) external payable returns (bytes32 nodeId) {
        require(msg.value >= MINT_FEE, "E001: Insufficient mint fee");
        // ... mint logic
    }
}
```

### BattleRevenue 合约
```solidity
contract BattleRevenue {
    // 分账比例 (basis points, 10000 = 100%)
    uint16 public constant CREATOR_SHARE = 4500;   // 45%
    uint16 public constant EDGE_SHARE = 2500;      // 25%
    uint16 public constant PLATFORM_FEE = 500;     // 5%
    uint16 public constant GATE_FEE = 3000;        // 30% (山门)
    uint16 public constant UPGRADE_POOL = 2000;    // 20%
    
    // 剩余 12%: reviewer(8%) + publicPool(8%) + ambassador(5%) = 21%
    // 45+25+5+30+20 = 125% → 需要重新校准！
    // TODO: 猫先森确认分账比例总和
}
```

**⚠️ 分账比例校验问题**：45+25+8+8+5+5+30+20 = 146% > 100%。需要猫先森确认是否为「分层分账」（先扣山门30%和升级池20%，剩余50%按45/25/8/8/5/5分配）。

---

## API 接口更新 (v1.0 → v1.1)

### 3.1 铸造卡牌 (参数已填入)
```
POST /cards/mint
Body:
{
  "contentHash": "0xabc123...",
  "metadata": { ... },
  "quadrant": { "usage": 1, "derive": 1, "expand": 2, "benefit": 1 },
  "mintPrice": "0.02"                 // ← 已填入: 0.02 MEER
}
```

### 4.3 牌组编排 (参数已填入)
```
POST /decks/create
Body:
{
  "name": "Thunder Storm",
  "cards": [ ... ],
  "declareEdges": true,
  "assemblyFee": "0.01"               // ← 已填入: 0.01 MEER
}
```

### 5.1 创建对战 (参数已填入)
```
POST /battles/create
Body:
{
  "deckId": "0x...",
  "betAmount": "1.0",                  // ← 范围: 0.1~10 MEER
  "opponent": "random"
}
```

### 6.1 查询对战分账 (参数已填入)
```
GET /battles/:battleId/revenue
Response:
{
  "battleId": "0x...",
  "totalPool": "2.0",
  "distribution": [
    {
      "nodeId": "0xcard1...",
      "recipient": "0xcreatorA...",
      "amount": "0.9",                 // ← 45% 创作者
      "shareType": "creator",
      "weight": 0.8,
      "potentialTier": 3              // ← 黄金档 (1.5x)
    },
    {
      "nodeId": "0xcard2...",
      "recipient": "0xedgeOwner...",
      "amount": "0.5",                 // ← 25% 编排者
      "shareType": "edge"
    }
  ],
  "platformFee": "0.1",               // ← 5% 系统
  "gateFee": "0.6",                   // ← 30% 山门
  "upgradePool": "0.4",               // ← 20% 升级池
  "distributed": true
}
```

---

## 待确认事项

1. **分账比例总和**：当前定义总和 146%，需猫先森确认分层分账逻辑
2. **势位档位阈值**：Potential 值范围 → Tier 1~6 的边界？（如 0-100=青铜, 100-500=白银）
3. **时效衰减系数**：势位心电图衰减公式参数
4. **公示期公式**：势位 → 公示期时长（当前占位：Tier×3 天）

---

## 完整 API 文档

> 见 `workspace/echo/api-schema-v1.0.md` (接口结构)
> + 本文档 (经济参数填入)
> = 完整 v1.1 规范

**下一版本**: v1.2 (猫先森确认分账比例后)
