# Battle of Potential — 合约部署地址

**网络**: Qitmeer QNG Mainnet (Chain ID: 813)  
**部署日期**: 2026-06-02  
**部署账户**: 0xDDBdfB4111DDD5e8b11EE7472180D7d16c1e7199

## 合约地址（v1.1.1 - 含 onlyOwner 安全修复）

| 合约 | 地址 | 版本 | 说明 |
|------|------|------|------|
| CardMinting | 0xc55B1af35C213aacc2b34333FeF4FE94278e98Ca | v1.0 | 卡牌铸造 |
| DeckAssembly | 0x461d4268686952B260AF6A98a11998f4176c2719 | v1.0 | 牌组组装 |
| PotentialOracle | 0x31973c7E34bB9dfE43B714facc981366fFe20d9B | v1.0 | 势位查询 |
| **BattleRevenue** | **0x611692084439B8D37482B6eE601c9D0108405D76** | **v1.1.1** | **对战分账（含 onlyOwner 修复）** |

## 旧地址（已废弃，不要使用）

| 合约 | 地址 | 说明 |
|------|------|------|
| BattleRevenue v1.1 | 0x6637423387202060AD322BDBcB3d014C8D8Cc86c | 无权限控制，已废弃 |

## 安全修复说明（v1.1.1）

**问题**：v1.1 的 `setTreasury()` 和 `emergencyWithdraw()` 无权限控制，任何人可调用。

**修复**：添加 `onlyOwner` 修饰符，仅合约 owner（部署地址）可调用：
- `setTreasury(address)` — 更新 Treasury 地址
- `emergencyWithdraw()` — 紧急提取合约资金

**Owner 地址**: `0xDDBdfB4111DDD5e8b11EE7472180D7d16c1e7199`

## 合约依赖

```
BattleRevenue → DeckAssembly (0x461d...)
            → PotentialOracle (0x3197...) [via DeckAssembly]
```

## 分账结构（v1.1.1 单层分账）

对战层 100%：创作者 45% | 编排者 25% | 审查员 8% | 公共池 8% | 系统 5% | 大使 5% | 储备 4%

项目层（山门 30% + 升级池 20%）移到 Treasury/DAO 合约，不在 BattleRevenue 处理。

## 前端对接

ABI 路径: `artifacts/contracts/battle-of-potential/*.json`

## 部署记录

- v1.0: 2026-06-02 11:45 (CardMinting, DeckAssembly, PotentialOracle)
- v1.1: 2026-06-02 12:15 (BattleRevenue, 无权限控制)
- v1.1.1: 2026-06-02 13:11 (BattleRevenue, 含 onlyOwner 修复)
