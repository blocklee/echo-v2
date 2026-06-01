const { ECHOIndexer } = require('./echo-indexer-p0.js');
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// BigInt serialization helper
const serializeJSON = (obj) => JSON.stringify(obj, (key, value) => {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
});

const sendJSON = (res, data) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(serializeJSON(data));
};

const RPC = 'https://qng.rpc.qitmeer.io';
const CONTRACTS = {
  creatorConfig: '0x41BC79f909D8e6Cd132Bf46247f9b230FE7FBc3F',
  edgeDeclaration: '0xC54e1B665c61b2Dc9831dc5a1C4D22670bea3C4a',
  deadlockInspector: '0xCA9DF1149F663892F9957d622BE5dE6Efa08115D',
  milestoneEscrow: '0x1C2f10Df5a07b4bfa8D189C5c65EE5748Ba2AEf2', // P1 final deployed 2026-05-29
  predictionMarket: '0xF71432c8A1cC1d094cFC80981f9Ca4783BD82D62', // PredictionMarket deployed 2026-05-30
  cardNFT: '0x534EAfC0F94FdA8F632F99BeDA2d11c6017963d3', // CardNFT deployed 2026-05-30
  battleGame: '0xE4a161e8892aeA51f026dD4f2C7c7A3a855b5aD3', // BattleGame deployed 2026-05-30
  licenseNFT: '0x34980A52885F78F75840F36AA6Cd6F06a8FEBA28' // LicenseNFT v0.4 deployed
};

// Download endpoint for backend code
app.get('/download', (req, res) => {
  const filePath = '/root/.openclaw/workspace/echo/echo-backend-v3.tar.gz';
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename=echo-backend-v3.tar.gz');
    res.send(fs.readFileSync(filePath));
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Reviewer and Ambassador config (in-memory, will be persisted to PostgreSQL in v0.4)
let reviewerConfig = {
  baseReward: 0.1,           // MEER per review
  bonusThreshold: 50,        // reviews per day for bonus
  bonusRate: 3,              // 3x multiplier
  accuracyThreshold: 95,       // % required for bonus
  penaltyFreezeHours: 24,    // suspension on appeal success
  appealWindowHours: 48      // appeal window
};

let ambassadorConfig = {
  levels: [
    { name: 'bronze', inviteMin: 3, discount: 5, monthlyMin: 1 },
    { name: 'silver', inviteMin: 10, discount: 10, monthlyMin: 3 },
    { name: 'gold', inviteMin: 50, discount: 15, quarterlyMin: 1 }
  ],
  downgradeMonths: 3
};

// Reviewer daily stats (in-memory mock)
let reviewerStats = new Map(); // address -> { date, count, accuracy, appeals }

// Ambassador progress (in-memory mock)
let ambassadorProgress = new Map(); // address -> { invites, monthlyActive, quarterlyActive, level }

// GET /api/reviewer/config - Reviewer incentive config
app.get('/api/reviewer/config', (req, res) => {
  sendJSON(res, { config: reviewerConfig });
});

// POST /api/reviewer/config - Update reviewer config (admin)
app.post('/api/reviewer/config', (req, res) => {
  const updates = req.body;
  Object.assign(reviewerConfig, updates);
  sendJSON(res, { success: true, config: reviewerConfig });
});

// GET /api/reviewer/stats/:address - Reviewer daily stats
app.get('/api/reviewer/stats/:address', (req, res) => {
  const stats = reviewerStats.get(req.params.address) || {
    date: new Date().toISOString().split('T')[0],
    count: 0,
    accuracy: 100,
    appeals: 0,
    reward: 0
  };
  sendJSON(res, { address: req.params.address, stats });
});

// POST /api/reviewer/calculate - Calculate daily reward
app.post('/api/reviewer/calculate', (req, res) => {
  const { address, count, accuracy } = req.body;
  let reward = 0;
  let tier = 'none';
  
  if (count >= reviewerConfig.bonusThreshold && accuracy >= reviewerConfig.accuracyThreshold) {
    reward = count * reviewerConfig.baseReward * reviewerConfig.bonusRate;
    tier = 'bonus';
  } else if (count >= 10) {
    reward = count * reviewerConfig.baseReward;
    tier = 'base';
  }
  
  reviewerStats.set(address, {
    date: new Date().toISOString().split('T')[0],
    count,
    accuracy,
    reward,
    tier
  });
  
  sendJSON(res, { address, reward, tier, count, accuracy });
});

// GET /api/ambassador/config - Ambassador level config
app.get('/api/ambassador/config', (req, res) => {
  sendJSON(res, { config: ambassadorConfig });
});

// POST /api/ambassador/config - Update ambassador config (admin)
app.post('/api/ambassador/config', (req, res) => {
  const updates = req.body;
  Object.assign(ambassadorConfig, updates);
  sendJSON(res, { success: true, config: ambassadorConfig });
});

// GET /api/ambassador/progress/:address - Ambassador progress
app.get('/api/ambassador/progress/:address', (req, res) => {
  const progress = ambassadorProgress.get(req.params.address) || {
    invites: 0,
    monthlyActive: 0,
    quarterlyActive: 0,
    level: 'none',
    discount: 0
  };
  sendJSON(res, { address: req.params.address, progress });
});

// POST /api/ambassador/update - Update ambassador progress
app.post('/api/ambassador/update', (req, res) => {
  const { address, invites, monthlyActive, quarterlyActive } = req.body;
  let level = 'none';
  let discount = 0;
  
  const cfg = ambassadorConfig;
  if (invites >= cfg.levels[2].inviteMin && quarterlyActive >= cfg.levels[2].quarterlyMin) {
    level = 'gold';
    discount = cfg.levels[2].discount;
  } else if (invites >= cfg.levels[1].inviteMin && monthlyActive >= cfg.levels[1].monthlyMin) {
    level = 'silver';
    discount = cfg.levels[1].discount;
  } else if (invites >= cfg.levels[0].inviteMin && monthlyActive >= cfg.levels[0].monthlyMin) {
    level = 'bronze';
    discount = cfg.levels[0].discount;
  }
  
  ambassadorProgress.set(address, {
    invites,
    monthlyActive,
    quarterlyActive,
    level,
    discount
  });
  
  sendJSON(res, { address, level, discount, invites, monthlyActive });
});

// API endpoints:
// GET /api/health     - Health check
// GET /api/nodes      - Node list
// GET /api/edges      - Edge list
// GET /api/graph      - Full graph data
// GET /api/potential  - Potential calculation (D3 ready)
// GET /api/milestones - Milestone data
const FROM_BLOCK = 2704379;

let indexer = new ECHOIndexer(RPC, CONTRACTS, FROM_BLOCK);
let graphData = null;
let lastUpdate = 0;

async function refreshGraph() {
  try {
    graphData = await indexer.scan();
    lastUpdate = Date.now();
    console.log(`Graph refreshed: ${graphData.summary.totalNodes} nodes, ${graphData.summary.totalEdges} edges`);
    return graphData;
  } catch (e) {
    console.error('Refresh error:', e.message);
    throw e;
  }
}

// Clean BigInt from graph data for JSON serialization
function cleanBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(cleanBigInt);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = cleanBigInt(value);
    }
    return result;
  }
  return obj;
}

// fourRights proxy mapping (discrete 0/1/2 → continuous) - DEPRECATED
// Use real U/D/E/B from indexer instead
function mapFourRights(fourRights) {
  const mapping = { 0: 1, 1: 10, 2: 100 };
  return {
    U: mapping[fourRights.usage] || 1,
    D: mapping[fourRights.derive] || 1,
    E: mapping[fourRights.expand] || 1,
    B: mapping[fourRights.benefit] || 1
  };
}

// Store potential history for each node (time series)
const potentialHistory = new Map(); // nodeId -> [{timestamp, potential, phase}, ...]

// Calculate shigraph potential (six-phase spec v0.1)
function calculatePotential(node, allNodes, edges) {
  const inEdges = edges.filter(e => e.toNode === node.nodeId);
  const outEdges = edges.filter(e => e.fromNode === node.nodeId);
  
  // Real U/D/E/B from indexer with temp mapping fallback (two-layer design)
  const useTempMapping = !(node.u || node.d || node.e || node.b);
  const U = (node.u || 0) > 0 ? node.u : ((node.fourRights?.usage || 0) * 50 + 10);
  const D = (node.d || 0) > 0 ? node.d : ((node.fourRights?.derive || 0) * 25 + 5);
  const E = (node.e || 0) > 0 ? node.e : ((node.fourRights?.expand || 0) * 50 + 10);
  const B = (node.b || 0) > 0 ? node.b : ((node.fourRights?.benefit || 0) * 250 + 50);
  
  // fourRightsScore = ln(1+U) + ln(1+D) + ln(1+E) + ln(1+B)
  const fourRightsScore = Math.log(1 + U) + Math.log(1 + D) + Math.log(1 + E) + Math.log(1 + B);
  
  // Edge weight decay (HALF_LIFE = 100000 blocks ≈ 1 week)
  const HALF_LIFE = 100000;
  const currentBlock = Math.max(...allNodes.map(n => n.createdAtBlock || 0), 0);
  const edgeDecay = outEdges.reduce((sum, e) => {
    const age = Math.max(0, currentBlock - (e.declaredAtBlock || currentBlock));
    const decay = Math.pow(0.5, age / HALF_LIFE);
    return sum + (Number(e.depth || 0) * decay);
  }, 0);
  
  // Potential = 1.0·ln(1+out) + 2.0·ln(1+in) + 0.5·Σ(edge·decay) + 0.01·fourRightsScore
  const outDegree = outEdges.length;
  const inDegree = inEdges.length;
  const potential = 1.0 * Math.log(1 + outDegree) + 2.0 * Math.log(1 + inDegree) + 0.5 * edgeDecay + 0.01 * fourRightsScore;
  
  // Phase determination with hysteresis
  // Network-normalized: thresholds scale with network size to prevent early-stage stagnation
  const allPotentials = allNodes.map(n => {
    const nInEdges = edges.filter(e => e.toNode === n.nodeId);
    const nOutEdges = edges.filter(e => e.fromNode === n.nodeId);
    const nU = n.u || 0, nD = n.d || 0, nE = n.e || 0, nB = n.b || 0;
    const nScore = Math.log(1 + nU) + Math.log(1 + nD) + Math.log(1 + nE) + Math.log(1 + nB);
    return 1.0 * Math.log(1 + nOutEdges.length) + 2.0 * Math.log(1 + nInEdges.length) + 0.01 * nScore;
  });
  const maxPotential = Math.max(...allPotentials, 1);
  const networkSize = allNodes.length;
  
  // Network scaling factor: early nodes get easier thresholds
  // network_scale = ln(1 + total_nodes) / ln(101) 
  // 100 nodes = 1.0, 10 nodes ≈ 0.48, capped at 0.5 minimum
  const networkScale = Math.max(0.5, Math.log(1 + networkSize) / Math.log(101));
  
  const phaseThresholds = [
    { enter: 0, exit: 0, name: '潜龙' },    // 0
    { enter: 10, exit: 8, name: '见龙' },    // 1
    { enter: 50, exit: 40, name: '惕龙' },   // 2
    { enter: 150, exit: 120, name: '跃龙' },  // 3
    { enter: 400, exit: 320, name: '飞龙' },  // 4
    { enter: 1000, exit: 800, name: '亢龙' }  // 5
  ];
  
  // Scale thresholds by network scale (early nodes get lower thresholds)
  const scaledThresholds = phaseThresholds.map(t => ({
    enter: t.enter * networkScale,
    exit: t.exit * networkScale,
    name: t.name
  }));
  
  let phase = 0;
  const currentPhase = node.phase || 0;
  
  // Hysteresis: check if we should move up or down
  for (let i = phaseThresholds.length - 1; i >= 0; i--) {
    if (i === currentPhase) {
      // Stay in current phase if above exit threshold
      if (potential >= scaledThresholds[i].exit) {
        phase = i;
        break;
      }
    } else if (i > currentPhase) {
      // Move up if above enter threshold
      if (potential >= scaledThresholds[i].enter) {
        phase = i;
        break;
      }
    } else {
      // Move down if below exit threshold of current
      if (potential < scaledThresholds[currentPhase].exit) {
        phase = i;
        break;
      }
    }
  }
  
  // If no change, keep current phase
  if (phase === 0 && potential >= scaledThresholds[currentPhase].exit) {
    phase = currentPhase;
  }
  
  // shiPosition (centrality/momentum 2D coordinates)
  const totalDegree = outDegree + inDegree;
  const centrality = totalDegree > 0 ? inDegree / totalDegree : 0; // 0-1
  const momentum = totalDegree > 0 ? Math.log(1 + totalDegree) / 10 : 0; // 0-1 approx
  
  // nextPhaseTrigger: estimated potential needed for next phase
  let nextPhaseTrigger = null;
  if (phase < 5) {
    nextPhaseTrigger = scaledThresholds[phase + 1].enter;
  }
  
  // Track potential history for "势位是心电图" principle
  const history = potentialHistory.get(node.nodeId) || [];
  const now = Date.now();
  history.push({
    timestamp: now,
    potential: Math.round(potential * 100) / 100,
    phase: phase,
    block: node.createdAtBlock || currentBlock
  });
  // Keep last 50 data points to avoid unbounded growth
  if (history.length > 50) history.shift();
  potentialHistory.set(node.nodeId, history);
  
  return {
    nodeId: node.nodeId,
    creator: node.creator,
    fourRights: node.fourRights,
    quadrants: node.fourRights,
    potential: Math.round(potential * 100) / 100, // 2 decimal places
    potentialHistory: history, // 势位心电图 - time series data
    networkScale: Math.round(networkScale * 100) / 100,
    useTempMapping: useTempMapping, // true when real U/D/E/B not available yet
    phase: phase,
    shiPosition: {
      x: Math.round(centrality * 100) / 100,  // centrality
      y: Math.round(momentum * 100) / 100     // momentum
    },
    nextPhaseTrigger: nextPhaseTrigger !== null ? Math.round(nextPhaseTrigger * 100) / 100 : null,
    remaining: nextPhaseTrigger !== null ? Math.round(Math.max(0, nextPhaseTrigger - potential) * 100) / 100 : 0,
    fourRightsScore: Math.round(fourRightsScore * 100) / 100,
    inDegree: inDegree,
    outDegree: outDegree,
    edges: outEdges.map(e => ({
      toNode: e.toNode,
      depth: Number(e.depth),
      declarer: e.declarer,
      edgeType: 0
    }))
  };
}

// API Routes

app.get('/api/graph', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    // Add D3-compatible fields to graph data
    const enrichedGraph = {
      ...graphData,
      nodes: graphData.nodes.map(node => {
        const potential = calculatePotential(node, graphData.nodes, graphData.edges);
        return {
          ...node,
          ...potential,
          id: node.nodeId, // D3 alias
          x: null, // D3 will calculate
          y: null  // D3 will calculate
        };
      }),
      edges: graphData.edges.map(edge => ({
        ...edge,
        source: edge.fromNode, // D3 alias
        target: edge.toNode,   // D3 alias
        edgeType: 0, // 0=inherit/solid, 1=derive/dashed, 2=extend/dotted
        versionConstraint: edge.depth > 1 ? 'descendant-capped' : 'direct-derivation' // 边伦理：版本约束
      }))
    };
    sendJSON(res, cleanBigInt(enrichedGraph));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/potential', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    
    const potentials = graphData.nodes.map(node => 
      calculatePotential(node, graphData.nodes, graphData.edges)
    );
    
    console.log('Potential data:', JSON.stringify(potentials[0], (k, v) => typeof v === 'bigint' ? 'BIGINT:' + v.toString() : v));
    
    sendJSON(res, cleanBigInt({
      nodes: potentials,
      updatedAt: lastUpdate
    }));
  } catch (e) {
    console.error('Potential error:', e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

app.get('/api/nodes', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    // Unify node structure with graph endpoint - include potential calculation
    const nodesWithPotential = graphData.nodes.map(node => {
      const potential = calculatePotential(node, graphData.nodes, graphData.edges);
      return {
        ...node,
        ...potential,
        id: node.nodeId, // D3 alias for consistency
        // name/role not on-chain; frontend uses nodeId truncated for display
        name: null,
        role: null
      };
    });
    sendJSON(res, cleanBigInt({ nodes: nodesWithPotential, total: graphData.summary.totalNodes }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/nodes/:id/metrics', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const nodeId = req.params.id;
    const node = graphData.nodes.find(n => n.nodeId === nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const potential = calculatePotential(node, graphData.nodes, graphData.edges);
    
    // Real values from event aggregation
    const realU = node.u || 0;
    const realD = node.d || 0;
    const realE = node.e || 0;
    const realB = node.b || 0;
    
    // Temp mapping values (fallback)
    const tempU = (node.fourRights?.usage || 0) * 50 + 10;
    const tempD = (node.fourRights?.derive || 0) * 25 + 5;
    const tempE = (node.fourRights?.expand || 0) * 50 + 10;
    const tempB = (node.fourRights?.benefit || 0) * 250 + 50;
    
    sendJSON(res, cleanBigInt({
      nodeId: node.nodeId,
      creator: node.creator,
      fourRights: node.fourRights,
      metrics: {
        U: { real: realU, temp: tempU, active: realU > 0 ? 'real' : 'temp' },
        D: { real: realD, temp: tempD, active: realD > 0 ? 'real' : 'temp' },
        E: { real: realE, temp: tempE, active: realE > 0 ? 'real' : 'temp' },
        B: { real: realB, temp: tempB, active: realB > 0 ? 'real' : 'temp' }
      },
      potential: potential.potential,
      phase: potential.phase,
      useTempMapping: potential.useTempMapping,
      updatedAt: lastUpdate
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/edges', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const edgesWithEthics = graphData.edges.map(edge => ({
      ...edge,
      versionConstraint: edge.depth > 1 ? 'descendant-capped' : 'direct-derivation' // 边伦理：版本约束
    }));
    sendJSON(res, cleanBigInt({ edges: edgesWithEthics, total: graphData.summary.totalEdges }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    // Check deployer balance
    const provider = new ethers.JsonRpcProvider(RPC);
    const deployerAddress = '0xd300C861cD5B16b01270Dd53899Fd1d71a87223a';
    const balance = await provider.getBalance(deployerAddress);
    const balanceMEER = parseFloat(ethers.formatEther(balance));
    const balanceAlert = balanceMEER < 0.5;
    
    sendJSON(res, { 
      status: 'ok', 
      lastUpdate, 
      nodes: graphData?.summary?.totalNodes || 0,
      edges: graphData?.summary?.totalEdges || 0,
      battles: graphData?.summary?.totalBattles || 0,
      rounds: graphData?.summary?.totalRounds || 0,
      bets: graphData?.summary?.totalBets || 0,
      balance: {
        address: deployerAddress,
        amount: balanceMEER,
        alert: balanceAlert,
        threshold: 0.5
      }
    });
  } catch (e) {
    sendJSON(res, { 
      status: 'error', 
      error: e.message,
      lastUpdate,
      nodes: graphData?.summary?.totalNodes || 0,
      edges: graphData?.summary?.totalEdges || 0
    });
  }
});

app.get('/api/milestones', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    
    const nodeId = req.query.nodeId;
    const creator = req.query.creator;
    
    // Get real milestone data from indexer
    let milestones = Array.from(indexer.milestones?.values() || []);
    
    // Enrich with node info
    milestones = milestones.map(ms => {
      // Try to find associated node (milestoneId might be nodeId or derived)
      const node = graphData?.nodes?.find(n => n.nodeId === ms.milestoneId) || {};
      
      return {
        milestoneId: ms.milestoneId,
        nodeId: ms.milestoneId, // Usually milestoneId == nodeId
        creator: node.creator || 'unknown',
        lockedAmount: ms.amount || 0,           // 锁定金额（MEER）
        phase: node.phase || 0,                   // 六相相位
        status: ms.status || 'unknown',            // locked / released / emergencyRefunded
        unlockable: ms.status === 'locked' && Date.now() / 1000 > (ms.lockTime || 0) + 86400, // 24h后可解锁
        lockTime: ms.lockTime || 0,              // 锁定区块号/时间
        releaseTime: ms.releaseTime || null,     // 释放时间
        unlockTime: (ms.lockTime || 0) + 86400,  // 预计解锁时间（锁定+24h）
        reasonCode: ms.reasonCode || 0,          // PhaseTransition reason: 0=undefined,1=lock,2=release,3=deadlock_cleared,4=sunrise,5=sunset
        emergencyRefunded: ms.status === 'emergencyRefunded',
        fourRights: node.fourRights || { usage: 0, derive: 0, expand: 0, benefit: 0 },
        txHash: ms.txHash
      };
    });
    
    // Filter by nodeId if provided
    if (nodeId) {
      milestones = milestones.filter(ms => ms.nodeId === nodeId);
    }
    
    // Filter by creator if provided
    if (creator) {
      milestones = milestones.filter(ms => ms.creator.toLowerCase() === creator.toLowerCase());
    }
    
    sendJSON(res, cleanBigInt({ 
      milestones, 
      total: milestones.length,
      filters: { nodeId, creator },
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Audit History API (P1 simplified - memory only, last 20 entries per node)
app.get('/api/nodes/:nodeId/audit-history', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    
    // Get audit logs for this node
    const logs = auditLogs.get(nodeId) || [];
    
    // Enrich with node info if available
    const node = graphData?.nodes?.find(n => n.nodeId === nodeId);
    
    sendJSON(res, cleanBigInt({
      nodeId,
      nodeTitle: node?.title || 'Unknown',
      total: logs.length,
      logs: logs.slice(-20), // Last 20 entries
      updatedAt: Date.now()
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Game API Routes (PredictionMarket)

app.get('/api/game/rounds', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    console.log('API /game/rounds - indexer.rounds size:', indexer.rounds.size);
    console.log('API /game/rounds - graphData rounds:', graphData?.summary?.totalRounds);
    const rounds = Array.from(indexer.rounds.values());
    sendJSON(res, cleanBigInt({ 
      rounds, 
      total: rounds.length,
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/game/bets', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const bets = Array.from(indexer.bets.values());
    sendJSON(res, cleanBigInt({ 
      bets, 
      total: bets.length,
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/game/round/:id', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const roundId = parseInt(req.params.id);
    const round = Array.from(indexer.rounds.values()).find(r => r.roundId === roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    const roundBets = Array.from(indexer.bets.values()).filter(b => b.roundId === roundId);
    sendJSON(res, cleanBigInt({ 
      round, 
      bets: roundBets,
      betCount: roundBets.length,
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/game/stats', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const rounds = Array.from(indexer.rounds.values());
    const bets = Array.from(indexer.bets.values());
    
    const totalPool = rounds.reduce((sum, r) => sum + (parseFloat(r.totalPool) || 0), 0);
    const totalBets = bets.length;
    const totalVolume = bets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const settledRounds = rounds.filter(r => r.settled).length;
    const activeRounds = rounds.filter(r => !r.settled && Date.now() / 1000 < r.endTime).length;
    
    sendJSON(res, cleanBigInt({ 
      stats: {
        totalRounds: rounds.length,
        activeRounds,
        settledRounds,
        totalBets,
        totalPool,
        totalVolume,
        platformFees: rounds.reduce((sum, r) => sum + (parseFloat(r.platformFee) || 0), 0)
      },
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// In-memory audit log storage (P1 simplified - memory only, 20 entries per node)
const auditLogs = new Map(); // nodeId -> [{timestamp, operator, field, oldValue, newValue}]

// Linkdown Submission API (Chain-off Declaration)
// Supports: createNode (declarationType: "node") / declareEdge (declarationType: "edge")
app.post('/api/submit-linkdown', express.json(), async (req, res) => {
  try {
    const { 
      action, declarationType,
      nodeId, parentNode, parentNodeId,
      nodeType, title, content,
      fourRights, initialStake,
      fromNodeId, toNodeId, sourceNodeId, targetNodeId,
      edgeType, depth, label, weight
    } = req.body;
    
    // Support both 'action' and 'declarationType' fields
    const act = action || declarationType;
    
    if (!act || !['createNode', 'declareEdge', 'node', 'edge'].includes(act)) {
      return res.status(400).json({ error: 'action/declarationType must be createNode, declareEdge, node, or edge' });
    }
    
    // Normalize action
    const isNode = act === 'createNode' || act === 'node';
    const isEdge = act === 'declareEdge' || act === 'edge';
    
    // Validate fourRights if provided
    if (fourRights) {
      const { usage, derive, expand, benefit } = fourRights;
      if ([usage, derive, expand, benefit].some(v => v === undefined || v < 0 || v > 2)) {
        return res.status(400).json({ error: 'fourRights values must be 0, 1, or 2' });
      }
    }
    
    // In MVP: Store in memory and return success (actual chain interaction would require wallet signing)
    // For now: return mock success with estimated confirmation
    const result = {
      success: true,
      declarationType: isNode ? 'node' : 'edge',
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      estimatedConfirmTime: 30,
      timestamp: Date.now(),
      data: req.body
    };
    
    if (isNode) {
      result.nodeId = nodeId || '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      result.parentNode = parentNode || parentNodeId || null;
      result.message = `Node creation queued. Parent: ${result.parentNode || 'none'}`;
      
      // P1: Record audit log for fourRights (node creation)
      if (fourRights) {
        const nodeAuditLog = auditLogs.get(result.nodeId) || [];
        nodeAuditLog.push({
          timestamp: Date.now(),
          operator: req.body.creator || 'system',
          action: 'CREATE',
          field: 'fourRights',
          oldValue: null,
          newValue: fourRights
        });
        // Keep only last 20 entries
        if (nodeAuditLog.length > 20) nodeAuditLog.shift();
        auditLogs.set(result.nodeId, nodeAuditLog);
        console.log(`📝 Audit log: Node ${result.nodeId.slice(0, 10)}... fourRights recorded`);
      }
    } else {
      result.edgeId = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      result.fromNodeId = fromNodeId || sourceNodeId;
      result.toNodeId = toNodeId || targetNodeId;
      result.edgeType = edgeType || (label ? 1 : undefined);
      result.depth = depth || weight || 1;
      result.message = `Edge declaration queued. ${result.fromNodeId} -> ${result.toNodeId}`;
    }
    
    console.log(`📨 Linkdown submitted: ${result.action}`, result.txHash.slice(0, 10));
    sendJSON(res, result);
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Card & Battle API Endpoints (using real indexer data)

app.get('/api/cards', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    // Try to get totalSupply from CardNFT contract
    let totalSupply = 0;
    let cardList = [];
    try {
      const cardContract = new ethers.Contract(CONTRACTS.cardNFT, [
        'function totalSupply() view returns (uint256)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function ownerOf(uint256 tokenId) view returns (address)'
      ], provider);
      totalSupply = Number(await cardContract.totalSupply());
      // Get first 10 cards
      const limit = Math.min(totalSupply, 10);
      for (let i = 0; i < limit; i++) {
        try {
          const owner = await cardContract.ownerOf(i);
          const uri = await cardContract.tokenURI(i);
          cardList.push({ tokenId: i, owner, uri: uri.substring(0, 100) });
        } catch (e) {
          // token may not exist
        }
      }
    } catch (e) {
      console.log('CardNFT contract call failed:', e.message);
    }
    sendJSON(res, cleanBigInt({ 
      cards: cardList, 
      total: totalSupply,
      contract: CONTRACTS.cardNFT,
      note: totalSupply > 0 ? 'Live contract data' : 'No cards minted yet',
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/battles', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    const battles = Array.from((indexer.battles || new Map()).values());
    sendJSON(res, cleanBigInt({ 
      battles, 
      total: battles.length,
      contract: CONTRACTS.battleGame,
      updatedAt: lastUpdate 
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Calculate Power API (Card Battle Attributes) - POST/GET hybrid
app.all('/api/calculate-power', async (req, res) => {
  try {
    if (!graphData || Date.now() - lastUpdate > 30000) {
      await refreshGraph();
    }
    
    // Support both GET query and POST body
    const nodeId = req.query.nodeId || req.body?.nodeId;
    const cardId = req.query.cardId || req.body?.cardId;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }
    
    const node = graphData?.nodes?.find(n => n.nodeId === nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Calculate potential to get phase and fourRightsScore
    const potential = calculatePotential(node, graphData.nodes, graphData.edges);
    
    // φ multipliers by phase (RPG progression)
    const phiMultipliers = [1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
    const phi = phiMultipliers[potential.phase] || 1.0;
    
    // U/D/E/B (real or temp mapping)
    const U = node.u || 0;
    const D = node.d || 0;
    const E = node.e || 0;
    const B = node.b || 0;
    
    // Use temp mapping if real values are 0
    const useTemp = !(U || D || E || B);
    const uVal = U > 0 ? U : ((node.fourRights?.usage || 0) * 50 + 10);
    const dVal = D > 0 ? D : ((node.fourRights?.derive || 0) * 25 + 5);
    const eVal = E > 0 ? E : ((node.fourRights?.expand || 0) * 50 + 10);
    const bVal = B > 0 ? B : ((node.fourRights?.benefit || 0) * 250 + 50);
    
    // Network effect for ATK (centrality boost)
    const networkEffect = 1 + (potential.shiPosition?.x || 0) * 0.5;
    
    // Calculate card attributes
    const ATK = Math.log(1 + uVal) * phi * networkEffect;
    const HP = Math.log(1 + eVal) * phi;
    const SKILL = Math.log(1 + dVal) * phi;
    const MULT = Math.min(3, Math.log(1 + bVal) / Math.log(2));
    
    // Base stats (level 1 baseline)
    const baseATK = 10;
    const baseHP = 20;
    const baseSKILL = 5;
    
    sendJSON(res, cleanBigInt({
      ATK: Math.round((baseATK + ATK) * 10) / 10,
      HP: Math.round((baseHP + HP) * 10) / 10,
      SKILL: Math.round((baseSKILL + SKILL) * 10) / 10,
      MULT: Math.round(MULT * 100) / 100,
      phase: potential.phase,
      φ_mult: phi,
      fourRightsScore: potential.fourRightsScore,
      raw: {
        U: uVal,
        D: dVal,
        E: eVal,
        B: bVal
      },
      formulas: {
        ATK: `base(10) + ln(1+${uVal}) × φ(${phi}) × network(${Math.round(networkEffect*100)/100})`,
        HP: `base(20) + ln(1+${eVal}) × φ(${phi})`,
        SKILL: `base(5) + ln(1+${dVal}) × φ(${phi})`,
        MULT: `min(3, ln(1+${bVal})/ln(2))`
      },
      _meta: {
        cardId: cardId || null,
        nodeId: nodeId,
        useTempMapping: useTemp,
        updatedAt: lastUpdate
      }
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;

// PredictionMarket ABI (minimal for reading rounds)
const PREDICTION_MARKET_ABI = [
  'function getCurrentRoundId() external view returns (uint256)',
  'function getAgentOptions() external view returns (string[] memory)',
  'function rounds(uint256) external view returns (uint256 id, string memory question, uint256 startTime, uint256 endTime, uint256 totalPool, uint256 winningOption, bool settled, address creator)',
  'function agentOptions(uint256) external view returns (string memory)'
];

// Initialize game data from chain state
async function initGameData() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const pm = new ethers.Contract(CONTRACTS.predictionMarket, PREDICTION_MARKET_ABI, provider);
    const currentId = await pm.getCurrentRoundId();
    console.log('PredictionMarket current round ID:', currentId.toString());

    if (currentId > 0) {
      for (let i = 1; i <= Number(currentId); i++) {
        const round = await pm.rounds(i);
        const roundData = {
          roundId: Number(round.id),
          question: round.question,
          options: [],
          startTime: Number(round.startTime),
          endTime: Number(round.endTime),
          totalPool: ethers.formatEther(round.totalPool),
          winningOption: Number(round.winningOption),
          settled: round.settled,
          creator: round.creator
        };
        
        // Load agent options
        try {
          const opts = await pm.getAgentOptions();
          roundData.options = opts;
        } catch (e) {
          console.log('Could not load agent options:', e.message);
        }
        
        indexer.rounds.set(i, roundData);
        console.log(`Loaded Round #${i}: "${roundData.question}"`);
      }
    }

    console.log('Game data initialized:', indexer.rounds.size, 'rounds');
  } catch (e) {
    console.error('Init game data error:', e.message);
  }
}

async function start() {
  console.log('Starting ECHO Data API...');
  await refreshGraph();
  await initGameData(); // Load game data from chain state
  
  // 404 handler - return JSON instead of HTML
  app.use((req, res) => {
    sendJSON(res, { error: 'Not Found', path: req.path });
  });

  app.listen(PORT, () => {
    console.log(`ECHO Data API running on port ${PORT}`);
    console.log('Endpoints:');
    console.log('  GET/POST /api/calculate-power   - Card battle attributes (ATK/HP/SKILL/MULT)');
    console.log('  GET /api/health                  - Health check');
    console.log('  GET /api/graph                   - Full graph data');
    console.log('  GET /api/nodes                   - Node list');
    console.log('  GET /api/edges                   - Edge list');
    console.log('  GET /api/potential               - Potential calculation (D3 ready)');
    console.log('  GET /api/milestones              - Milestone data');
    console.log('  GET /api/game/rounds             - Game rounds');
    console.log('  GET /api/game/bets               - Game bets');
    console.log('  GET /api/game/round/:id        - Round details');
    console.log('  GET/POST /api/reviewer/config    - Reviewer incentive config');
    console.log('  GET /api/reviewer/stats/:addr     - Reviewer daily stats');
    console.log('  POST /api/reviewer/calculate       - Calculate daily reward');
    console.log('  GET/POST /api/ambassador/config  - Ambassador level config');
    console.log('  GET /api/ambassador/progress/:addr - Ambassador progress');
    console.log('  POST /api/ambassador/update        - Update ambassador progress');
    console.log('  GET /api/cards                   - CardNFT data');
    console.log('  GET /api/battles                 - BattleGame data');
  });
  
  // Auto-refresh every 30 seconds
  setInterval(async () => {
    try {
      await refreshGraph();
    } catch (e) {
      console.error('Auto-refresh error:', e.message);
    }
  }, 30000);
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = { app, refreshGraph, calculatePotential, cleanBigInt };
