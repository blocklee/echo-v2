/**
 * ECHO Indexer Prototype - P0 (Updated with deployed addresses and corrected indexing)
 * 
 * P0 Contract Addresses (QNG Mainnet, 2026-05-29):
 * - CreatorConfig: 0x41BC79f909D8e6Cd132Bf46247f9b230FE7FBc3F
 * - EdgeDeclaration: 0xC54e1B665c61b2Dc9831dc5a1C4D22670bea3C4a
 * - DeadlockInspector: 0xCA9DF1149F663892F9957d622BE5dE6Efa08115D
 * - MilestoneEscrow: 0x4DE4cFD213a528D0b387564675AdAaC969AF0721
 * 
 * Event signatures (verified):
 * 1. NodeCreated(bytes32,address,uint256,uint8,uint8,uint8,uint8)
 * 2. EdgeDeclared(bytes32,bytes32,address,uint256,uint256) - declarer indexed
 * 3. QuadrantSet(bytes32,uint8,uint8,uint8,uint8)
 * 4. AssemblyApproved(bytes32,string)
 * 5. AssemblyRejected(bytes32,string)
 * 6. MilestoneLocked(bytes32,uint256,uint8,uint256)
 * 7. MilestoneReleased(bytes32,uint256,uint8,uint256)
 * 8. EmergencyRefund(bytes32,uint256,uint256) - NEW
 */

const ethers = require('ethers');

// ============ Event Signatures ============

const NODE_CREATED_SIG = 'NodeCreated(bytes32,address,uint256,uint8,uint8,uint8,uint8)';
const NODE_CREATED_TOPIC0 = '0x14099851ab7c7f4a85719da2165bc3b1ed0aea38276b15fe41a4c36e9b741918';

const EDGE_DECLARED_SIG = 'EdgeDeclared(bytes32,bytes32,address,uint256,uint256)';
const EDGE_DECLARED_TOPIC0 = '0xcb59a69c50a816f2612c07c4a15ed7e4391269cf502635b16da465d2e2c56ceb';

const QUADRANT_SET_SIG = 'QuadrantSet(bytes32,uint8,uint8,uint8,uint8)';
const QUADRANT_SET_TOPIC0 = '0x71618eac2ec66e68b6fb2308b0e8ccd252f111fad9d66a553fa988088d44f079';

const ASSEMBLY_APPROVED_SIG = 'AssemblyApproved(bytes32,string)';
const ASSEMBLY_APPROVED_TOPIC0 = '0x9cfe0c568d950ca64bc8ccb9b17300219b4c404592d270eae2e2e4219a5cfde3';

const ASSEMBLY_REJECTED_SIG = 'AssemblyRejected(bytes32,string)';
const ASSEMBLY_REJECTED_TOPIC0 = '0x914d18498f86052257caf5ffd8f2b041258b785ac760482aa8ceab14750ca833';

const MILESTONE_LOCKED_SIG = 'MilestoneLocked(bytes32,uint256,uint8,uint256)';
const MILESTONE_LOCKED_TOPIC0 = '0x2184794e764abfa55caec1762b34144b88753545c820bb0507aee8ba18c90f38';

const MILESTONE_RELEASED_SIG = 'MilestoneReleased(bytes32,uint256,uint8,uint256)';
const MILESTONE_RELEASED_TOPIC0 = '0x0995a364c3ea69dad7910117cd82dfb73abddfe0eb3edbba486bc97f391d01c8';

const EMERGENCY_REFUND_SIG = 'EmergencyRefund(bytes32,uint256,uint256)';
const EMERGENCY_REFUND_TOPIC0 = '0x0'; // Will compute

const PHASE_TRANSITION_SIG = 'PhaseTransition(bytes32,uint8,uint8,uint256)';
const PHASE_TRANSITION_TOPIC0 = '0xb53acde7bdf2b8f52137ea99fdf300092a558df8e2833df5ba9ac57802f13bf5';

// CardNFT (ERC721) Event Signatures
const TRANSFER_SIG = 'Transfer(address,address,uint256)';
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_SIG = 'Approval(address,address,uint256)';
const APPROVAL_TOPIC0 = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

// BattleGame Event Signatures (cat-san confirmed)
// ⚠️ 待确认：BattleResolved 签名还没找到，bytecode 中另一个 PUSH32 值匹配不上常见变体
// 当前先配 BattleCreated（已确认），BattleResolved 等 ABI 补充后秒更新
const BATTLE_CREATED_SIG = 'BattleCreated(uint256,address,address,uint256,uint256,uint256)';
const BATTLE_CREATED_TOPIC0 = '0xb87f412e9b065a59a03e91c630484520b8c3af6c6f7e9bc80771c8bc2d2df241';
const BATTLE_RESOLVED_SIG = 'BattleResolved(uint256,address,uint256)'; // 假设，待确认
const BATTLE_RESOLVED_TOPIC0 = '0xc85097f9623f9aa19887350307755ffa817b32afe05876349bc770aae879e3d8'; // 假设，待确认

const PREDICTION_MARKET_ADDRESS = '0xF71432c8A1cC1d094cFC80981f9Ca4783BD82D62';

// PredictionMarket Event Signatures
const NEW_ROUND_SIG = 'NewRound(uint256,string,uint256,uint256)';
const NEW_ROUND_TOPIC0 = '0x' + ethers.id(NEW_ROUND_SIG).slice(2);

const USER_BET_SIG = 'UserBet(uint256,address,uint256,uint256)';
const USER_BET_TOPIC0 = '0x' + ethers.id(USER_BET_SIG).slice(2);

const ROUND_SETTLED_SIG = 'RoundSettled(uint256,uint256,uint256,uint256)';
const ROUND_SETTLED_TOPIC0 = '0x' + ethers.id(ROUND_SETTLED_SIG).slice(2);

function verifyTopics() {
  const sigs = [
    [NODE_CREATED_SIG, NODE_CREATED_TOPIC0],
    [EDGE_DECLARED_SIG, EDGE_DECLARED_TOPIC0],
    [QUADRANT_SET_SIG, QUADRANT_SET_TOPIC0],
    [ASSEMBLY_APPROVED_SIG, ASSEMBLY_APPROVED_TOPIC0],
    [ASSEMBLY_REJECTED_SIG, ASSEMBLY_REJECTED_TOPIC0],
    [MILESTONE_LOCKED_SIG, MILESTONE_LOCKED_TOPIC0],
    [MILESTONE_RELEASED_SIG, MILESTONE_RELEASED_TOPIC0]
  ];
  
  console.log('=== Topic0 Verification ===');
  for (const [sig, expected] of sigs) {
    const computed = ethers.id(sig);
    const match = computed === expected ? '✅' : '❌';
    console.log(`${match} ${sig}`);
  }
  
  // Compute EmergencyRefund topic0
  const emergencyTopic0 = ethers.id(EMERGENCY_REFUND_SIG);
  console.log(`🆕 EmergencyRefund topic0: ${emergencyTopic0}`);
}

class ECHOIndexer {
  constructor(providerUrl, contractAddresses, fromBlock) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contracts = contractAddresses;
    this.fromBlock = fromBlock;
    this.nodes = new Map();
    this.edges = new Map();
    this.assemblies = new Map();
    this.milestones = new Map();
    this.refunds = new Map();
    // U/D/E/B tracking (two-layer design)
    this.usageCounts = new Map(); // nodeId -> U (LicenseNFT mint count)
    this.deriveCounts = new Map(); // nodeId -> D (child node count)
    this.benefitTotals = new Map(); // creator -> B (cumulative released amount)
    // Game data (PredictionMarket)
    this.battles = new Map();
    this.rounds = new Map();
    this.bets = new Map();
    this.agentOptions = [];
  }

  async scan() {
    const latestBlock = await this.provider.getBlockNumber();
    const allAddresses = Object.values(this.contracts);
    
    const logs = await this.provider.getLogs({
      address: allAddresses,
      fromBlock: this.fromBlock,
      toBlock: latestBlock,
      topics: [[
        NODE_CREATED_TOPIC0,
        EDGE_DECLARED_TOPIC0,
        QUADRANT_SET_TOPIC0,
        ASSEMBLY_APPROVED_TOPIC0,
        ASSEMBLY_REJECTED_TOPIC0,
        MILESTONE_LOCKED_TOPIC0,
        MILESTONE_RELEASED_TOPIC0,
        PHASE_TRANSITION_TOPIC0,
        TRANSFER_TOPIC0,
        APPROVAL_TOPIC0,
        BATTLE_CREATED_TOPIC0,
        BATTLE_RESOLVED_TOPIC0,
        NEW_ROUND_TOPIC0,
        USER_BET_TOPIC0,
        ROUND_SETTLED_TOPIC0
      ]]
    });

    for (const log of logs) {
      await this.processLog(log);
    }
    
    return this.exportGraph();
  }

  async processLog(log) {
    const topic0 = log.topics[0];
    const blockNumber = log.blockNumber;
    const txHash = log.transactionHash;

    switch(topic0) {
      case NODE_CREATED_TOPIC0:
        this.processNodeCreated(log, blockNumber, txHash);
        break;
      case EDGE_DECLARED_TOPIC0:
        this.processEdgeDeclared(log, blockNumber, txHash);
        break;
      case QUADRANT_SET_TOPIC0:
        this.processQuadrantSet(log, blockNumber, txHash);
        break;
      case ASSEMBLY_APPROVED_TOPIC0:
        this.processAssemblyApproved(log, blockNumber, txHash);
        break;
      case ASSEMBLY_REJECTED_TOPIC0:
        this.processAssemblyRejected(log, blockNumber, txHash);
        break;
      case MILESTONE_LOCKED_TOPIC0:
        this.processMilestoneLocked(log, blockNumber, txHash);
        break;
      case MILESTONE_RELEASED_TOPIC0:
        this.processMilestoneReleased(log, blockNumber, txHash);
        break;
      case PHASE_TRANSITION_TOPIC0:
        this.processPhaseTransition(log, blockNumber, txHash);
        break;
      case TRANSFER_TOPIC0:
        this.processTransfer(log, blockNumber, txHash);
        break;
      case APPROVAL_TOPIC0:
        this.processApproval(log, blockNumber, txHash);
        break;
      case BATTLE_CREATED_TOPIC0:
        this.processBattleCreated(log, blockNumber, txHash);
        break;
      case BATTLE_RESOLVED_TOPIC0:
        this.processBattleResolved(log, blockNumber, txHash);
        break;
      case NEW_ROUND_TOPIC0:
        this.processNewRound(log, blockNumber, txHash);
        break;
      case USER_BET_TOPIC0:
        this.processUserBet(log, blockNumber, txHash);
        break;
      case ROUND_SETTLED_TOPIC0:
        this.processRoundSettled(log, blockNumber, txHash);
        break;
    }
  }

  processNodeCreated(log, blockNumber, txHash) {
    const nodeId = log.topics[1];
    const creator = ethers.getAddress('0x' + log.topics[2].slice(26));
    
    const data = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint256', 'uint8', 'uint8', 'uint8', 'uint8'],
      log.data
    );
    
    const node = {
      nodeId,
      creator,
      fourRights: { usage: Number(data[1]), derive: Number(data[2]), expand: Number(data[3]), benefit: Number(data[4]) },
      timestamp: Number(data[0]),
      outDegree: 0,
      inDegree: 0,
      edges: [],
      createdAtBlock: blockNumber,
      txHash
    };

    this.nodes.set(nodeId, node);
    
    // D: Track derive count for parent node (if not genesis)
    // Note: parentNode is not in the current NodeCreated event signature
    // We track this via EdgeDeclared events instead
    // D = count of edges where this node is the parent (fromNode)
    // This will be updated in processEdgeDeclared
    
    console.log(`🌱 NodeCreated: ${nodeId.slice(0, 10)}...`);
  }

  // EdgeDeclared: declarer is indexed (topic3), data = [depth, timestamp]
  processEdgeDeclared(log, blockNumber, txHash) {
    const fromNode = log.topics[1];
    const toNode = log.topics[2];
    const declarer = ethers.getAddress('0x' + log.topics[3].slice(26));
    
    const data = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint256', 'uint256'],
      log.data
    );
    
    const depth = Number(data[0]);
    const timestamp = Number(data[1]);

    const edge = {
      fromNode, toNode, declarer, depth, timestamp,
      declaredAtBlock: blockNumber, txHash
    };

    const edgeId = ethers.keccak256(ethers.concat([fromNode, toNode, ethers.toBeArray(timestamp)]));
    this.edges.set(edgeId, edge);

    const from = this.nodes.get(fromNode);
    const to = this.nodes.get(toNode);
    if (from) { from.outDegree++; from.edges.push(edge); }
    if (to) { to.inDegree++; }
    
    // D: Track derive count for fromNode (parent)
    const currentD = this.deriveCounts.get(fromNode) || 0;
    this.deriveCounts.set(fromNode, currentD + 1);
    
    console.log(`🔗 EdgeDeclared: ${fromNode.slice(0, 10)}... -> ${toNode.slice(0, 10)}... (D=${currentD + 1})`);
  }

  processQuadrantSet(log, blockNumber, txHash) {
    const nodeId = log.topics[1];
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint8', 'uint8', 'uint8', 'uint8'], log.data);
    
    const node = this.nodes.get(nodeId);
    if (node) {
      node.fourRights = { usage: data[0], derive: data[1], expand: data[2], benefit: data[3] };
      node.updatedAtBlock = blockNumber;
      console.log(`🔄 QuadrantSet: ${nodeId.slice(0, 10)}...`);
    }
  }

  processAssemblyApproved(log, blockNumber, txHash) {
    const assemblyId = log.topics[1];
    const reason = ethers.toUtf8String(log.data);
    this.assemblies.set(assemblyId, { assemblyId, status: 'approved', reason, blockNumber, txHash });
    console.log(`✅ AssemblyApproved: ${assemblyId.slice(0, 10)}...`);
  }

  processAssemblyRejected(log, blockNumber, txHash) {
    const assemblyId = log.topics[1];
    const reason = ethers.toUtf8String(log.data);
    this.assemblies.set(assemblyId, { assemblyId, status: 'rejected', reason, blockNumber, txHash });
    console.log(`❌ AssemblyRejected: ${assemblyId.slice(0, 10)}...`);
  }

  processMilestoneLocked(log, blockNumber, txHash) {
    const milestoneId = log.topics[1];
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint8', 'uint256'], log.data);
    this.milestones.set(milestoneId, {
      milestoneId, amount: ethers.formatEther(data[0]), stage: data[1], lockTime: Number(data[2]),
      status: 'locked', blockNumber, txHash
    });
    console.log(`🔒 MilestoneLocked: ${milestoneId.slice(0, 10)}... stage ${data[1]}`);
  }

  processMilestoneReleased(log, blockNumber, txHash) {
    const milestoneId = log.topics[1];
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint8', 'uint256'], log.data);
    const ms = this.milestones.get(milestoneId);
    if (ms) { 
      ms.status = 'released'; 
      ms.releaseTime = Number(data[2]); 
      
      // B: Track benefit total per creator
      // Find the creator for this milestone (from the locked milestone)
      const creator = ms.creator || 'unknown';
      const amount = parseFloat(ms.amount || 0);
      const currentB = this.benefitTotals.get(creator) || 0;
      this.benefitTotals.set(creator, currentB + amount);
      console.log(`💰 Benefit added: ${creator.slice(0, 10)}... +${amount} (B=${currentB + amount})`);
    }
    console.log(`🔓 MilestoneReleased: ${milestoneId.slice(0, 10)}... stage ${data[1]}`);
  }

  processPhaseTransition(log, blockNumber, txHash) {
    const nodeId = log.topics[1];
    const phase = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], log.topics[2])[0]);
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint8', 'uint256'], log.data);
    const reasonCode = Number(data[0]);
    const timestamp = Number(data[1]);

    const node = this.nodes.get(nodeId);
    if (node) {
      const fromPhase = node.phase || 0;
      node.phase = phase;
      node.phaseHistory = node.phaseHistory || [];
      node.phaseHistory.push({ fromPhase, toPhase: phase, timestamp, reasonCode, blockNumber, txHash });
      console.log(`🔄 PhaseTransition: ${nodeId.slice(0, 10)}... ${fromPhase} -> ${phase} (reasonCode=${reasonCode})`);
    }
  }

  // CardNFT Events (ERC721)
  processTransfer(log, blockNumber, txHash) {
    // Determine which contract emitted this Transfer
    const contractAddress = log.address.toLowerCase();
    const cardNFT = (this.contracts.cardNFT || '').toLowerCase();
    const licenseNFT = (this.contracts.licenseNFT || '').toLowerCase();
    
    const tokenId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[3])[0]);
    const from = ethers.getAddress('0x' + log.topics[1].slice(26));
    const to = ethers.getAddress('0x' + log.topics[2].slice(26));
    
    if (contractAddress === cardNFT) {
      // U: Track CardNFT mints (from 0x0) and transfers as "usage"
      // NOTE: CardNFT tokenId -> nodeId mapping requires contract call
      // For now, use recipient address as approximate key
      const currentU = this.usageCounts.get(to) || 0;
      this.usageCounts.set(to, currentU + 1);
      console.log(`🎴 CardNFT Transfer: #${tokenId} ${from.slice(0, 10)}... -> ${to.slice(0, 10)}... (U=${currentU + 1})`);
    } else if (contractAddress === licenseNFT) {
      // LicenseNFT transfers (deprecated for U tracking, use CardNFT instead)
      console.log(`🎫 LicenseNFT Transfer: #${tokenId} ${from.slice(0, 10)}... -> ${to.slice(0, 10)}...`);
    } else {
      console.log(`🔄 Transfer: #${tokenId} ${from.slice(0, 10)}... -> ${to.slice(0, 10)}...`);
    }
  }

  processApproval(log, blockNumber, txHash) {
    const tokenId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[3])[0]);
    const owner = ethers.getAddress('0x' + log.topics[1].slice(26));
    const approved = ethers.getAddress('0x' + log.topics[2].slice(26));
    
    console.log(`✅ Approval: #${tokenId} approved for ${approved.slice(0, 10)}...`);
  }

  // BattleGame Events
  // BattleCreated(uint256,address,address,uint256,uint256,uint256) - 6 params confirmed by cat-san
  processBattleCreated(log, blockNumber, txHash) {
    const battleId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[1])[0]);
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'address', 'uint256', 'uint256', 'uint256'], log.data);
    
    const battle = {
      battleId,
      player1: data[0],
      player2: data[1],
      betAmount: ethers.formatEther(data[2]),
      param4: Number(data[3]),  // 待确认含义
      param5: Number(data[4]),  // 待确认含义
      status: 'created',
      createdAtBlock: blockNumber,
      txHash
    };
    
    this.battles = this.battles || new Map();
    this.battles.set(battleId, battle);
    console.log(`⚔️ BattleCreated: #${battleId} ${data[0].slice(0, 10)}... vs ${data[1].slice(0, 10)}... bet=${ethers.formatEther(data[2])} MEER`);
  }

  processBattleResolved(log, blockNumber, txHash) {
    const battleId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[1])[0]);
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'uint256'], log.data);
    
    const winner = data[0];
    const loserTokenId = Number(data[1]);
    
    const battle = this.battles?.get(battleId);
    if (battle) {
      battle.status = 'resolved';
      battle.winner = winner;
      battle.loserTokenId = loserTokenId;
      battle.resolvedAtBlock = blockNumber;
    }
    
    console.log(`🏆 BattleResolved: #${battleId} winner=${winner.slice(0, 10)}...`);
  }

  // PredictionMarket Events
  processNewRound(log, blockNumber, txHash) {
    const roundId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[1])[0]);
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['string', 'uint256', 'uint256'], log.data);
    
    const round = {
      roundId,
      question: data[0],
      startTime: Number(data[1]),
      endTime: Number(data[2]),
      totalPool: 0,
      winningOption: 7,
      settled: false,
      createdAtBlock: blockNumber,
      txHash
    };
    
    this.rounds.set(roundId, round);
    console.log(`🎮 NewRound: #${roundId} "${data[0]}"`);
  }

  processUserBet(log, blockNumber, txHash) {
    const roundId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[1])[0]);
    const user = ethers.getAddress('0x' + log.topics[2].slice(26));
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data);
    
    const optionIndex = Number(data[0]);
    const amount = ethers.formatEther(data[1]);
    
    const bet = {
      roundId,
      user,
      optionIndex,
      amount,
      timestamp: blockNumber,
      txHash
    };
    
    const betId = `${roundId}-${user}`;
    this.bets.set(betId, bet);
    
    // Update round total pool
    const round = this.rounds.get(roundId);
    if (round) {
      round.totalPool = (round.totalPool || 0) + parseFloat(amount);
    }
    
    console.log(`💰 UserBet: Round #${roundId} ${user.slice(0, 10)}... bet ${amount} MEER on option ${optionIndex}`);
  }

  processRoundSettled(log, blockNumber, txHash) {
    const roundId = Number(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.topics[1])[0]);
    const data = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256', 'uint256'], log.data);
    
    const winningOption = Number(data[0]);
    const totalPool = ethers.formatEther(data[1]);
    const platformFee = ethers.formatEther(data[2]);
    
    const round = this.rounds.get(roundId);
    if (round) {
      round.winningOption = winningOption;
      round.settled = true;
      round.totalPool = parseFloat(totalPool);
      round.platformFee = parseFloat(platformFee);
      round.settledAtBlock = blockNumber;
    }
    
    console.log(`🏆 RoundSettled: #${roundId} winner=${winningOption} pool=${totalPool} MEER fee=${platformFee} MEER`);
  }

  exportGraph() {
    // Add U/D/E/B to nodes
    const nodesWithMetrics = Array.from(this.nodes.values()).map(node => ({
      ...node,
      u: this.usageCounts.get(node.creator) || 0,      // U: LicenseNFT usage count
      d: this.deriveCounts.get(node.nodeId) || 0,     // D: derive count (child nodes)
      e: node.outDegree || 0,                          // E: outDegree (expand)
      b: this.benefitTotals.get(node.creator) || 0     // B: cumulative benefit
    }));
    
    return {
      nodes: nodesWithMetrics,
      edges: Array.from(this.edges.values()),
      assemblies: Array.from(this.assemblies.values()),
      milestones: Array.from(this.milestones.values()),
      battles: Array.from((this.battles || new Map()).values()),
      rounds: Array.from(this.rounds.values()),
      bets: Array.from(this.bets.values()),
      summary: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size,
        totalAssemblies: this.assemblies.size,
        totalMilestones: this.milestones.size,
        totalBattles: (this.battles || new Map()).size,
        totalRounds: this.rounds.size,
        totalBets: this.bets.size,
        topNodesByOutDegree: Array.from(this.nodes.values()).sort((a, b) => b.outDegree - a.outDegree).slice(0, 5)
      }
    };
  }
}

async function main() {
  verifyTopics();
  
  const indexer = new ECHOIndexer(
    'https://qng.rpc.qitmeer.io',
    {
      creatorConfig: '0x41BC79f909D8e6Cd132Bf46247f9b230FE7FBc3F',
      edgeDeclaration: '0xC54e1B665c61b2Dc9831dc5a1C4D22670bea3C4a',
      deadlockInspector: '0xCA9DF1149F663892F9957d622BE5dE6Efa08115D',
      milestoneEscrow: '0x1C2f10Df5a07b4bfa8D189C5c65EE5748Ba2AEf2',
      predictionMarket: PREDICTION_MARKET_ADDRESS,
      cardNFT: '0x534EAfC0F94FdA8F632F99BeDA2d11c6017963d3',
      battleGame: '0xE4a161e8892aeA51f026dD4f2C7c7A3a855b5aD3'
    },
    2704379  // Deployment block for P0 contracts
  );

  console.log('\n=== Scanning ECHO P0 Events ===');
  const graph = await indexer.scan();
  
  console.log('\n=== Summary ===');
  console.log(`Nodes: ${graph.summary.totalNodes}`);
  console.log(`Edges: ${graph.summary.totalEdges}`);
  console.log(`Assemblies: ${graph.summary.totalAssemblies}`);
  console.log(`Milestones: ${graph.summary.totalMilestones}`);
  console.log(`Battles: ${graph.summary.totalBattles}`);
  console.log(`Rounds: ${graph.summary.totalRounds}`);
  console.log(`Bets: ${graph.summary.totalBets}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ECHOIndexer, verifyTopics };
