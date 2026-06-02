// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeckAssembly.sol";

/**
 * @title BattleRevenue
 * @notice ECHO: Battle of Potential — 对战分账合约（对战层，单层100%）
 * @dev 基于猫先森 v0.1 经济参数 + 架构分层（2026-06-02 12:26 确认）
 * 
 * 对战层分账（单层，100%）：
 *   创作者 45% | 编排者 25% | 审查员 8% | 公共池 8% | 系统 5% | 大使 5% | 储备 4%
 *   总和 = 45+25+8+8+5+5+4 = 100% ✓
 * 
 * 项目层分账（山门30%+升级池20%）移到 Treasury/DAO 合约，不在本合约处理。
 */
contract BattleRevenue {
    DeckAssembly public deckAssembly;
    
    // Treasury 地址（预留，可 setter 更新，仅 owner）
    address public treasury;      // 接收项目层分账的 Treasury 合约地址
    address public owner;          // 合约 owner，控制权限函数

    // ============ 权限修饰符 ============
    modifier onlyOwner() {
        require(msg.sender == owner, "E001: Not owner");
        _;
    }
    
    // ============ 分账比例（basis points, 10000 = 100%）============
    // 对战层单层分账，总和 = 100%
    uint16 public constant CREATOR_SHARE_BPS = 4500;    // 创作者 45%
    uint16 public constant EDGE_SHARE_BPS = 2500;       // 编排者 25%
    uint16 public constant REVIEWER_SHARE_BPS = 800;    // 审查员 8%
    uint16 public constant PUBLIC_POOL_BPS = 800;       // 公共池 8%
    uint16 public constant PLATFORM_FEE_BPS = 500;      // 系统 5%
    uint16 public constant AMBASSADOR_BPS = 500;       // 大使 5%
    uint16 public constant RESERVE_BPS = 400;           // 储备 4%
    // 总和 = 4500+2500+800+800+500+500+400 = 10000 = 100% ✓
    
    // ============ 投注范围 ============
    uint256 public constant MIN_BET = 0.1 ether;
    uint256 public constant MAX_BET = 10 ether;
    
    // ============ 数据结构 ============
    struct Battle {
        bytes32 battleId;
        address player1;
        address player2;
        bytes32 deck1;
        bytes32 deck2;
        uint256 betAmount;
        address winner;
        uint256 revenuePool;
        bool distributed;
        uint256 createdAt;
        uint256 endedAt;
    }
    
    struct Distribution {
        bytes32 battleId;
        bytes32 nodeId;
        address recipient;
        uint256 amount;
        uint8 shareType; // 1=creator, 2=edge, 3=reviewer, 4=public, 5=platform, 6=ambassador, 7=reserve
    }
    
    // ============ 状态 ============
    mapping(bytes32 => Battle) public battles;
    mapping(bytes32 => Distribution[]) public battleDistributions;
    mapping(address => uint256) public pendingRevenue; // 待领取收益
    uint256 public totalBattles;
    uint256 public totalRevenueDistributed;
    
    // ============ 事件 ============
    event BattleCreated(
        bytes32 indexed battleId,
        address indexed player1,
        address indexed player2,
        bytes32 deck1,
        bytes32 deck2,
        uint256 betAmount,
        uint256 revenuePool
    );
    
    event BattleEnded(
        bytes32 indexed battleId,
        address indexed winner,
        uint256 revenuePool,
        uint256 timestamp
    );
    
    event RevenueDistributed(
        bytes32 indexed battleId,
        uint8 indexed shareType,
        address indexed recipient,
        bytes32 nodeId,
        uint256 amount
    );
    
    event RevenueClaimed(
        address indexed recipient,
        uint256 amount
    );
    
    event TreasuryUpdated(address indexed newTreasury);
    
    constructor(address _deckAssembly, address _treasury) {
        deckAssembly = DeckAssembly(_deckAssembly);
        treasury = _treasury;
        owner = msg.sender;
    }
    
    // ============ 管理（仅 owner）============
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    // ============ 对战生命周期 ============
    
    function createBattle(
        bytes32 deckId,
        address opponent
    ) external payable returns (bytes32 battleId) {
        require(msg.value >= MIN_BET && msg.value <= MAX_BET, "E006: Bet out of range");
        
        // 校验牌组所有权
        address owner = deckAssembly.getDeck(deckId).owner;
        require(owner == msg.sender, "E003: Not deck owner");
        
        battleId = keccak256(abi.encodePacked(
            msg.sender,
            opponent,
            deckId,
            block.timestamp,
            totalBattles
        ));
        
        uint256 revenuePool = msg.value;
        
        battles[battleId] = Battle({
            battleId: battleId,
            player1: msg.sender,
            player2: opponent,
            deck1: deckId,
            deck2: bytes32(0),
            betAmount: msg.value,
            winner: address(0),
            revenuePool: revenuePool,
            distributed: false,
            createdAt: block.timestamp,
            endedAt: 0
        });
        
        totalBattles++;
        
        emit BattleCreated(battleId, msg.sender, opponent, deckId, bytes32(0), msg.value, revenuePool);
    }
    
    function joinBattle(bytes32 battleId, bytes32 deckId) external payable {
        Battle storage battle = battles[battleId];
        require(battle.battleId != bytes32(0), "E007: Battle not found");
        require(battle.player2 == address(0) || battle.player2 == msg.sender, "E007: Already joined");
        require(msg.value >= battle.betAmount, "E006: Insufficient bet");
        
        address owner = deckAssembly.getDeck(deckId).owner;
        require(owner == msg.sender, "E003: Not deck owner");
        
        battle.player2 = msg.sender;
        battle.deck2 = deckId;
        battle.revenuePool += msg.value;
        
        // 退款多余投注
        if (msg.value > battle.betAmount) {
            payable(msg.sender).transfer(msg.value - battle.betAmount);
        }
    }
    
    function endBattle(bytes32 battleId, address winner) external {
        Battle storage battle = battles[battleId];
        require(battle.battleId != bytes32(0), "E007: Battle not found");
        require(battle.winner == address(0), "E007: Battle already ended");
        require(
            battle.player1 == msg.sender || battle.player2 == msg.sender,
            "E003: Not player"
        );
        require(
            winner == battle.player1 || winner == battle.player2,
            "E007: Invalid winner"
        );
        
        battle.winner = winner;
        battle.endedAt = block.timestamp;
        
        emit BattleEnded(battleId, winner, battle.revenuePool, block.timestamp);
    }
    
    // ============ 分账核心逻辑（对战层，单层100%）============
    
    function distributeRevenue(bytes32 battleId) external {
        Battle storage battle = battles[battleId];
        require(battle.winner != address(0), "E007: Battle not ended");
        require(!battle.distributed, "E007: Already distributed");
        require(battle.revenuePool > 0, "E007: Empty pool");
        
        uint256 totalPool = battle.revenuePool;
        
        // 获取获胜牌组中的卡牌
        bytes32[] memory winnerCards;
        if (battle.winner == battle.player1) {
            winnerCards = deckAssembly.getDeck(battle.deck1).cardNodeIds;
        } else {
            winnerCards = deckAssembly.getDeck(battle.deck2).cardNodeIds;
        }
        
        // 计算总势位（简化版：用卡牌数量作为权重）
        uint256 totalPotential = winnerCards.length * 100; // 每张卡基础势位 100
        
        // === 创作者分配（45%，按势位加权）===
        uint256 creatorPool = totalPool * CREATOR_SHARE_BPS / 10000;
        for (uint i = 0; i < winnerCards.length; i++) {
            // TODO: 接入 PotentialOracle 获取真实势位
            uint256 cardPotential = 100; // 占位
            uint256 share = creatorPool * cardPotential / totalPotential;
            
            // 获取卡牌创作者
            address creator = deckAssembly.cardMinting().getCard(winnerCards[i]).creator;
            
            pendingRevenue[creator] += share;
            _recordDistribution(battleId, winnerCards[i], creator, share, 1);
        }
        
        // === 编排者分配（25%）===
        uint256 edgePool = totalPool * EDGE_SHARE_BPS / 10000;
        // TODO: 获取编排边信息，分配给编排者
        // MVP 占位：将编排者份额暂存合约，后续补齐
        
        // === 其他份额（一次性分配）===
        uint256 reviewerAmount = totalPool * REVIEWER_SHARE_BPS / 10000;
        uint256 publicAmount = totalPool * PUBLIC_POOL_BPS / 10000;
        uint256 platformAmount = totalPool * PLATFORM_FEE_BPS / 10000;
        uint256 ambassadorAmount = totalPool * AMBASSADOR_BPS / 10000;
        uint256 reserveAmount = totalPool * RESERVE_BPS / 10000;
        
        // 记录分配（recipient = treasury 或合约自身，待 DAO 层细化）
        _recordDistribution(battleId, bytes32(0), treasury != address(0) ? treasury : address(this), reviewerAmount, 3);
        _recordDistribution(battleId, bytes32(0), treasury != address(0) ? treasury : address(this), publicAmount, 4);
        _recordDistribution(battleId, bytes32(0), treasury != address(0) ? treasury : address(this), platformAmount, 5);
        _recordDistribution(battleId, bytes32(0), treasury != address(0) ? treasury : address(this), ambassadorAmount, 6);
        _recordDistribution(battleId, bytes32(0), treasury != address(0) ? treasury : address(this), reserveAmount, 7);
        
        battle.distributed = true;
        totalRevenueDistributed += totalPool;
    }
    
    function _recordDistribution(
        bytes32 battleId,
        bytes32 nodeId,
        address recipient,
        uint256 amount,
        uint8 shareType
    ) internal {
        battleDistributions[battleId].push(Distribution({
            battleId: battleId,
            nodeId: nodeId,
            recipient: recipient,
            amount: amount,
            shareType: shareType
        }));
        
        emit RevenueDistributed(battleId, shareType, recipient, nodeId, amount);
    }
    
    // ============ 收益领取 ============
    
    function claimRevenue() external {
        uint256 amount = pendingRevenue[msg.sender];
        require(amount > 0, "E003: No pending revenue");
        
        pendingRevenue[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit RevenueClaimed(msg.sender, amount);
    }
    
    // ============ 查询 ============
    
    function getBattle(bytes32 battleId) external view returns (Battle memory) {
        return battles[battleId];
    }
    
    function getDistributions(bytes32 battleId) external view returns (Distribution[] memory) {
        return battleDistributions[battleId];
    }
    
    function getPendingRevenue(address recipient) external view returns (uint256) {
        return pendingRevenue[recipient];
    }
    
    // ============ 应急（仅 owner）============
    
    function emergencyWithdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
