// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CardMinting.sol";

contract DeckAssembly {
    CardMinting public cardMinting;
    
    uint256 public constant ASSEMBLY_FEE = 0.01 ether;
    
    struct Deck {
        bytes32 deckId;
        address owner;
        bytes32[] cardNodeIds;
        uint256[] weights;
        uint256 totalPotential;
        uint256 createdAt;
    }
    
    struct Edge {
        bytes32 edgeId;
        bytes32 fromNodeId;
        bytes32 toNodeId;
        uint8 edgeType; // 1=use, 2=derive, 3=expand, 4=benefit
        uint256 weight;
        bytes32 contentHash;
        address declarer;
        uint256 createdAt;
    }
    
    mapping(bytes32 => Deck) public decks;
    mapping(bytes32 => Edge) public edges;
    mapping(bytes32 => bytes32[]) public nodeEdges; // nodeId => edgeIds
    
    uint256 public totalDecks;
    
    event DeckCreated(
        bytes32 indexed deckId,
        address indexed owner,
        bytes32[] cardNodeIds,
        uint256 totalPotential,
        uint256 timestamp
    );
    
    event EdgeDeclared(
        bytes32 indexed edgeId,
        bytes32 indexed fromNodeId,
        bytes32 indexed toNodeId,
        uint8 edgeType,
        uint256 weight,
        address declarer
    );
    
    constructor(address _cardMinting) {
        cardMinting = CardMinting(_cardMinting);
    }
    
    function createDeck(
        string calldata name,
        bytes32[] calldata cardNodeIds,
        uint256[] calldata weights,
        bool declareEdges
    ) external payable returns (bytes32 deckId) {
        require(msg.value >= ASSEMBLY_FEE, "E001: Insufficient assembly fee");
        require(cardNodeIds.length > 0 && cardNodeIds.length <= 30, "E001: Invalid deck size");
        require(cardNodeIds.length == weights.length, "E001: Length mismatch");
        
        deckId = keccak256(abi.encodePacked(
            msg.sender,
            name,
            block.timestamp,
            totalDecks
        ));
        
        uint256 totalPotential = 0;
        for (uint i = 0; i < cardNodeIds.length; i++) {
            CardMinting.Card memory card = cardMinting.getCard(cardNodeIds[i]);
            require(card.creator != address(0), "E001: Card not found");
            require(card.quadrant.expand >= 1, "E003: Card not expandable");
            
            totalPotential += card.potential * weights[i] / 100;
            
            if (declareEdges) {
                _declareEdge(cardNodeIds[i], deckId, 3, weights[i], card.contentHash);
            }
        }
        
        decks[deckId] = Deck({
            deckId: deckId,
            owner: msg.sender,
            cardNodeIds: cardNodeIds,
            weights: weights,
            totalPotential: totalPotential,
            createdAt: block.timestamp
        });
        
        totalDecks++;
        
        emit DeckCreated(deckId, msg.sender, cardNodeIds, totalPotential, block.timestamp);
        
        if (msg.value > ASSEMBLY_FEE) {
            payable(msg.sender).transfer(msg.value - ASSEMBLY_FEE);
        }
    }
    
    function _declareEdge(
        bytes32 fromNodeId,
        bytes32 toNodeId,
        uint8 edgeType,
        uint256 weight,
        bytes32 contentHash
    ) internal returns (bytes32 edgeId) {
        edgeId = keccak256(abi.encodePacked(
            fromNodeId,
            toNodeId,
            edgeType,
            block.timestamp
        ));
        
        edges[edgeId] = Edge({
            edgeId: edgeId,
            fromNodeId: fromNodeId,
            toNodeId: toNodeId,
            edgeType: edgeType,
            weight: weight,
            contentHash: contentHash,
            declarer: msg.sender,
            createdAt: block.timestamp
        });
        
        nodeEdges[fromNodeId].push(edgeId);
        
        emit EdgeDeclared(edgeId, fromNodeId, toNodeId, edgeType, weight, msg.sender);
    }
    
    function getDeck(bytes32 deckId) external view returns (Deck memory) {
        return decks[deckId];
    }
    
    function getNodeEdges(bytes32 nodeId) external view returns (bytes32[] memory) {
        return nodeEdges[nodeId];
    }
}
