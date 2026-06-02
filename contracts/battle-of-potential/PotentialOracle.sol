// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PotentialOracle
 * @notice ECHO: Battle of Potential — 势位计算合约
 * @dev 基于白话书 v4 势位公式 + 猫先森经济参数 v0.1
 * 势位 = 编排密度 × 衍生深度 × 公示期 × 使用频次（概念级，链上简化实现）
 */
contract PotentialOracle {
    
    // ============ 势位档位边界 ============
    // Tier 1: 0-50, Tier 2: 50-200, Tier 3: 200-500
    // Tier 4: 500-1000, Tier 5: 1000-2000, Tier 6: 2000+
    uint256[] public tierBoundaries = [0, 50, 200, 500, 1000, 2000];
    uint16[] public tierMultipliers = [100, 120, 150, 180, 220, 250]; // basis points
    
    // ============ 时效衰减参数 ============
    uint256 public constant DECAY_THRESHOLD_DAYS = 30 days; // 30天无编排开始衰减
    uint16 public constant DECAY_RATE_BPS = 200;              // 每天衰减 2% (basis points)
    uint256 public constant DECAY_MAX_CYCLES = 50;            // 最大衰减周期上限
    
    // ============ 首卡减免参数 ============
    uint256 public constant DISCOUNT_DURATION_DAYS = 30 days; // 新卡30天减免期
    uint16 public constant DERIVE_DISCOUNT_BPS = 5000;         // 衍权减半 50% (basis points)
    
    // ============ 公示期公式 ============
    // 公示期 = Tier × 3 天
    uint256 public constant PUBLICITY_BASE = 3 days;
    
    // ============ 数据结构 ============
    struct PotentialState {
        uint256 currentPotential;     // 当前势位值
        uint256 basePotential;        // 基础势位（由入度决定）
        uint256 lastUpdated;          // 最后更新时间
        uint8 tier;                   // 当前档位 1-6
        uint256 freshness;            // 新鲜度（上次使用至今的时间）
        uint256 useCount;             // 使用次数
        uint256 bridgeCount;          // 跨社区引用次数
    }
    
    // nodeId => PotentialState
    mapping(bytes32 => PotentialState) public potentialStates;
    
    // ============ 事件 ============
    event PotentialUpdated(
        bytes32 indexed nodeId,
        uint256 oldPotential,
        uint256 newPotential,
        uint8 oldTier,
        uint8 newTier,
        uint256 timestamp
    );
    
    event TierChanged(
        bytes32 indexed nodeId,
        uint8 oldTier,
        uint8 newTier,
        uint256 timestamp
    );
    
    // ============ 核心计算 ============
    
    /**
     * @notice 计算当前势位（含衰减）
     * @param nodeId 节点ID
     * @return currentPotential 当前势位值
     * @return tier 当前档位
     */
    function calculatePotential(bytes32 nodeId) public view returns (uint256 currentPotential, uint8 tier) {
        PotentialState memory state = potentialStates[nodeId];
        
        if (state.basePotential == 0) {
            return (0, 1);
        }
        
        // 计算衰减：连续30天无编排 → 每天衰减2%
        uint256 timeDelta = block.timestamp - state.lastUpdated;
        uint256 daysIdle = timeDelta / 1 days;
        
        uint256 decayedPotential = state.basePotential;
        
        if (daysIdle > DECAY_THRESHOLD_DAYS / 1 days) {
            uint256 excessDays = daysIdle - DECAY_THRESHOLD_DAYS / 1 days;
            // 限制最大衰减周期
            if (excessDays > DECAY_MAX_CYCLES) {
                excessDays = DECAY_MAX_CYCLES;
            }
            
            // 每日衰减 2%
            for (uint i = 0; i < excessDays && i < 100; i++) {
                decayedPotential = decayedPotential * (10000 - DECAY_RATE_BPS) / 10000;
            }
        }
        
        // 使用频次加成（每使用10次 +5%）
        uint256 useBonus = decayedPotential * (state.useCount / 10) * 500 / 10000;
        
        // 跨社区桥接加成（每次桥接 +2%）
        uint256 bridgeBonus = decayedPotential * state.bridgeCount * 200 / 10000;
        
        currentPotential = decayedPotential + useBonus + bridgeBonus;
        
        // 档位判定
        tier = getTier(currentPotential);
        
        return (currentPotential, tier);
    }
    
    /**
     * @notice 判定势位档位
     */
    function getTier(uint256 potential) public view returns (uint8) {
        if (potential >= tierBoundaries[5]) return 6;      // 大师
        if (potential >= tierBoundaries[4]) return 5;      // 钻石
        if (potential >= tierBoundaries[3]) return 4;      // 白金
        if (potential >= tierBoundaries[2]) return 3;      // 黄金
        if (potential >= tierBoundaries[1]) return 2;      // 白银
        return 1;                                           // 青铜
    }
    
    /**
     * @notice 获取档位溢价乘数
     */
    function getTierMultiplier(uint8 tier) public view returns (uint16) {
        require(tier >= 1 && tier <= 6, "E001: Invalid tier");
        return tierMultipliers[tier - 1];
    }
    
    /**
     * @notice 计算公示期时长
     */
    function calculatePublicityPeriod(uint8 tier) public pure returns (uint256) {
        require(tier >= 1 && tier <= 6, "E001: Invalid tier");
        return uint256(tier) * PUBLICITY_BASE;
    }
    
    /**
     * @notice 计算收益乘数（含胜负加成）
     */
    function revenueMultiplier(uint8 tier, bool isWin) public pure returns (uint256) {
        require(tier >= 1 && tier <= 6, "E001: Invalid tier");
        
        // 基础乘数：1 + (tier-1) × 0.25
        uint256 base = 100 + (uint256(tier) - 1) * 25; // basis points: 1.0x ~ 2.25x
        
        // 胜负加成
        if (isWin) {
            return base * 120 / 100; // ×1.2
        } else {
            return base * 80 / 100;  // ×0.8
        }
    }
    
    // ============ 状态更新（仅授权合约调用）============
    
    /**
     * @notice 初始化势位（铸造时调用）
     */
    function initPotential(bytes32 nodeId) external {
        potentialStates[nodeId] = PotentialState({
            currentPotential: 0,
            basePotential: 0,
            lastUpdated: block.timestamp,
            tier: 1,
            freshness: 0,
            useCount: 0,
            bridgeCount: 0
        });
    }
    
    /**
     * @notice 更新势位（编排边增加时调用）
     * @param nodeId 被编排的节点
     * @param edgeWeight 编排边权重 (0-100)
     */
    function addPotential(bytes32 nodeId, uint256 edgeWeight) external {
        PotentialState storage state = potentialStates[nodeId];
        
        require(state.lastUpdated > 0, "E001: Node not found");
        
        uint256 oldPotential = state.currentPotential;
        uint8 oldTier = state.tier;
        
        // 增加基础势位（权重映射到势位值）
        state.basePotential += edgeWeight * 10; // 权重 1.0 = 10 potential
        state.useCount++;
        state.lastUpdated = block.timestamp;
        
        // 重新计算
        (uint256 newPotential, uint8 newTier) = calculatePotential(nodeId);
        state.currentPotential = newPotential;
        state.tier = newTier;
        
        emit PotentialUpdated(nodeId, oldPotential, newPotential, oldTier, newTier, block.timestamp);
        
        if (oldTier != newTier) {
            emit TierChanged(nodeId, oldTier, newTier, block.timestamp);
        }
    }
    
    /**
     * @notice 标记跨社区桥接
     */
    function addBridge(bytes32 nodeId) external {
        PotentialState storage state = potentialStates[nodeId];
        require(state.lastUpdated > 0, "E001: Node not found");
        state.bridgeCount++;
    }
    
    /**
     * @notice 查询势位状态
     */
    function getPotential(bytes32 nodeId) external view returns (PotentialState memory) {
        return potentialStates[nodeId];
    }
    
    /**
     * @notice 强制刷新势位（定时任务或手动触发）
     */
    function refreshPotential(bytes32 nodeId) external {
        PotentialState storage state = potentialStates[nodeId];
        require(state.lastUpdated > 0, "E001: Node not found");
        
        uint256 oldPotential = state.currentPotential;
        uint8 oldTier = state.tier;
        
        (uint256 newPotential, uint8 newTier) = calculatePotential(nodeId);
        state.currentPotential = newPotential;
        state.tier = newTier;
        state.lastUpdated = block.timestamp;
        
        if (oldPotential != newPotential || oldTier != newTier) {
            emit PotentialUpdated(nodeId, oldPotential, newPotential, oldTier, newTier, block.timestamp);
        }
        
        if (oldTier != newTier) {
            emit TierChanged(nodeId, oldTier, newTier, block.timestamp);
        }
    }
}
