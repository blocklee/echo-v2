// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CardMinting is Ownable {
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // 经济参数 (v0.1 — 猫先森 10:53 提供)
    uint256 public constant MINT_FEE = 0.02 ether;
    uint256 public constant USAGE_BASE = 0.01 ether;
    uint256 public constant DERIVE_BASE = 0.05 ether;
    uint256 public constant EXPAND_BASE = 0.10 ether;
    
    // 势位档位溢价 (basis points, 100 = 1.0x)
    uint16[] public tierMultipliers = [100, 120, 150, 180, 220, 250];
    
    struct Quadrant {
        uint8 usage;    // 0=私密, 1=社群, 2=开放
        uint8 derive;   // 0=封闭, 1=条件, 2=开放
        uint8 expand;   // 0=锁定, 1=条件, 2=自由
        uint8 benefit;  // 0=免费, 1=按次, 2=分成
    }
    
    struct Card {
        bytes32 nodeId;
        address creator;
        bytes32 contentHash;
        Quadrant quadrant;
        uint256 potential;
        uint8 tier;
        uint256 createdAt;
        bool frozen;
    }
    
    mapping(bytes32 => Card) public cards;
    mapping(address => bytes32[]) public creatorCards;
    
    uint256 public totalCards;
    
    event CardMinted(
        bytes32 indexed nodeId,
        address indexed creator,
        bytes32 contentHash,
        Quadrant quadrant,
        uint256 potential,
        uint256 timestamp
    );
    
    function mintCard(
        bytes32 contentHash,
        Quadrant calldata quadrant,
        string calldata metadataURI
    ) external payable returns (bytes32 nodeId) {
        require(msg.value >= MINT_FEE, "E001: Insufficient mint fee");
        
        // 四权死锁检测 (基础校验)
        require(quadrant.usage <= 2 && quadrant.derive <= 2 && 
                quadrant.expand <= 2 && quadrant.benefit <= 2, "E001: Invalid quadrant");
        
        nodeId = keccak256(abi.encodePacked(
            contentHash,
            msg.sender,
            block.timestamp,
            totalCards
        ));
        
        cards[nodeId] = Card({
            nodeId: nodeId,
            creator: msg.sender,
            contentHash: contentHash,
            quadrant: quadrant,
            potential: 0,
            tier: 1, // 青铜
            createdAt: block.timestamp,
            frozen: false
        });
        
        creatorCards[msg.sender].push(nodeId);
        totalCards++;
        
        emit CardMinted(nodeId, msg.sender, contentHash, quadrant, 0, block.timestamp);
        
        // 退款多余金额
        if (msg.value > MINT_FEE) {
            payable(msg.sender).transfer(msg.value - MINT_FEE);
        }
    }
    
    function getCard(bytes32 nodeId) external view returns (Card memory) {
        return cards[nodeId];
    }
    
    function getCreatorCards(address creator) external view returns (bytes32[] memory) {
        return creatorCards[creator];
    }
    
    /**
     * @notice 检查卡牌是否处于首卡减免期
     * @param nodeId 卡牌ID
     * @return isDiscounted 是否在减免期
     * @return remainingDays 剩余减免天数
     */
    function checkFirstCardDiscount(bytes32 nodeId) public view returns (bool isDiscounted, uint256 remainingDays) {
        Card storage card = cards[nodeId];
        require(card.createdAt > 0, "E001: Card not found");
        
        uint256 discountEnd = card.createdAt + 30 days;
        
        if (block.timestamp <= discountEnd) {
            isDiscounted = true;
            remainingDays = (discountEnd - block.timestamp) / 1 days;
        } else {
            isDiscounted = false;
            remainingDays = 0;
        }
    }
    
    /**
     * @notice 获取卡牌衍权实际费用（含首卡减免）
     */
    function getDeriveFee(bytes32 nodeId) external view returns (uint256) {
        (bool isDiscounted,) = checkFirstCardDiscount(nodeId);
        
        if (isDiscounted) {
            return DERIVE_BASE * 5000 / 10000; // 50% 减免
        }
        
        return DERIVE_BASE;
    }
    
    // 提取合约余额 (仅 Owner)
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
