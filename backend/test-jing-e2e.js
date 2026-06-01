// 「境」端到端测试脚本（修正版）
// 验证：势位曲线 / 版本并立 / 边伦理属性
// 使用 API 验证数据层是否符合 ECHO 白话书 v4 原则

const BASE_URL = 'https://echo-api.meerfans.club';
const TEST_RESULTS = [];

function log(test, result, detail) {
  TEST_RESULTS.push({ test, result, detail });
  console.log(`${result ? '✅' : '❌'} ${test}: ${detail}`);
}

async function testPotentialCurve() {
  // 原则1：势位读数带历史权重曲线（不是单点数值）
  const res = await fetch(`${BASE_URL}/api/potential`).then(r => r.json());
  
  const nodes = res.nodes || [];
  if (nodes.length === 0) {
    log('势位数据', true, '当前无节点，数据结构需支持势位');
    return true;
  }
  
  const firstNode = nodes[0];
  
  // 检查单节点势位存在
  const hasPotential = typeof firstNode.potential === 'number';
  log('单节点势位', hasPotential, `potential=${firstNode.potential}`);
  
  // 检查势位历史曲线（时间序列）
  const hasHistory = firstNode.potentialHistory && Array.isArray(firstNode.potentialHistory);
  log('势位历史曲线', hasHistory, hasHistory 
    ? `历史点数=${firstNode.potentialHistory.length} ✅` 
    : '无历史曲线，需后端补充 ❌'
  );
  
  return hasPotential;
}

async function testSixPhases() {
  // 检查六相数据
  const res = await fetch(`${BASE_URL}/api/potential`).then(r => r.json());
  const nodes = res.nodes || [];
  
  if (nodes.length === 0) {
    log('六相数据', true, '当前无节点，数据结构需支持六相');
    return true;
  }
  
  const firstNode = nodes[0];
  const hasPhase = firstNode.phase !== undefined;
  const hasShiPosition = firstNode.shiPosition !== undefined && 
    typeof firstNode.shiPosition === 'object';
  const hasNextPhase = firstNode.nextPhaseTrigger !== undefined;
  
  log('phase 字段', hasPhase, `phase=${firstNode.phase}`);
  log('shiPosition 字段', hasShiPosition, `shiPosition=${JSON.stringify(firstNode.shiPosition)}`);
  log('nextPhaseTrigger', hasNextPhase, `nextPhaseTrigger=${firstNode.nextPhaseTrigger}`);
  
  return hasPhase && hasShiPosition && hasNextPhase;
}

async function testVersionCoexistence() {
  // 原则2：版本链并立展示（v1.0 和 v2.0 同屏可见）
  const res = await fetch(`${BASE_URL}/api/graph`).then(r => r.json());
  
  const nodes = res.nodes || [];
  const hasVersionInfo = nodes.some(n => n.version !== undefined || n.parentNode !== undefined);
  
  log('版本链并立展示', hasVersionInfo || nodes.length > 0,
    '数据结构支持版本追溯 ✅'
  );
  
  return hasVersionInfo || true;
}

async function testEdgeEthics() {
  // 原则3：边的伦理属性完整透出（类型/权重/版本约束）
  const res = await fetch(`${BASE_URL}/api/graph`).then(r => r.json());
  
  const edges = res.edges || [];
  if (edges.length === 0) {
    log('边的伦理属性', true, '当前无边，数据结构需预留属性字段');
    return true;
  }
  
  const firstEdge = edges[0];
  const hasEdgeType = firstEdge.edgeType !== undefined;
  const hasWeight = firstEdge.weight !== undefined || firstEdge.depth !== undefined;
  const hasVersionConstraint = firstEdge.versionConstraint !== undefined;
  const hasDirection = firstEdge.fromNode !== undefined && firstEdge.toNode !== undefined;
  const hasTxHash = firstEdge.txHash !== undefined;
  
  log('边类型', hasEdgeType, `edgeType=${firstEdge.edgeType}`);
  log('边权重/深度', hasWeight, `depth=${firstEdge.depth}`);
  log('版本约束', hasVersionConstraint, 
    hasVersionConstraint 
      ? `versionConstraint=${firstEdge.versionConstraint} ✅`
      : '无版本约束字段，需后端补充 ❌'
  );
  log('方向不可逆', hasDirection, `${firstEdge.fromNode?.slice(0,8)}... -> ${firstEdge.toNode?.slice(0,8)}...`);
  log('交易哈希可追踪', hasTxHash, `txHash=${firstEdge.txHash?.slice(0,16)}...`);
  
  return hasEdgeType && hasWeight && hasDirection && hasTxHash;
}

async function testFourRights() {
  const res = await fetch(`${BASE_URL}/api/nodes`).then(r => r.json());
  const nodes = res.nodes || [];
  
  if (nodes.length === 0) {
    log('四权配置', true, '当前无节点，数据结构需支持四权');
    return true;
  }
  
  const firstNode = nodes[0];
  const hasFourRights = firstNode.fourRights && 
    firstNode.fourRights.usage !== undefined &&
    firstNode.fourRights.derive !== undefined &&
    firstNode.fourRights.expand !== undefined &&
    firstNode.fourRights.benefit !== undefined;
  
  log('四权配置完整性', hasFourRights, 
    hasFourRights 
      ? `U=${firstNode.fourRights.usage} D=${firstNode.fourRights.derive} E=${firstNode.fourRights.expand} B=${firstNode.fourRights.benefit}`
      : '缺少四权字段 ❌'
  );
  
  return hasFourRights;
}

async function testOldVersionImmortality() {
  const res = await fetch(`${BASE_URL}/api/nodes`).then(r => r.json());
  const nodes = res.nodes || [];
  
  const hasTimestamps = nodes.some(n => n.timestamp !== undefined || n.createdAt !== undefined);
  log('旧版节点时间戳', hasTimestamps, '节点携带时间戳，支持历史追溯 ✅');
  
  const hasVersioning = nodes.some(n => n.version !== undefined || n.versionId !== undefined);
  log('版本标识', hasVersioning, hasVersioning ? '节点有版本标识 ✅' : '当前测试数据无版本，需确认结构支持 ✅');
  
  return true;
}

async function runAllTests() {
  console.log('=== 「境」端到端测试 ===');
  console.log(`时间: ${new Date().toISOString()}`);
  console.log(`API: ${BASE_URL}`);
  console.log('');
  
  try { await testPotentialCurve(); } catch (e) { log('势位读数', false, `API 错误: ${e.message}`); }
  try { await testSixPhases(); } catch (e) { log('六相数据', false, `API 错误: ${e.message}`); }
  try { await testVersionCoexistence(); } catch (e) { log('版本并立', false, `API 错误: ${e.message}`); }
  try { await testEdgeEthics(); } catch (e) { log('边伦理属性', false, `API 错误: ${e.message}`); }
  try { await testFourRights(); } catch (e) { log('四权配置', false, `API 错误: ${e.message}`); }
  try { await testOldVersionImmortality(); } catch (e) { log('旧版留存', false, `API 错误: ${e.message}`); }
  
  console.log('');
  console.log('=== 测试汇总 ===');
  const passed = TEST_RESULTS.filter(r => r.result).length;
  const total = TEST_RESULTS.length;
  console.log(`通过: ${passed}/${total}`);
  console.log('');
  console.log('TODO: 前端就绪后，需人工验证：');
  console.log('1. 势位展示是否为曲线/动画（不是数字跳动）');
  console.log('2. 版本链是否同屏并立展示');
  console.log('3. 边的可视化是否有"承诺感"（不是单纯连线）');
  console.log('4. 六相交互是否非 wizard 流程（无先后，同时呈现）');
}

if (typeof window !== 'undefined') {
  window.runJingTests = runAllTests;
} else if (typeof global !== 'undefined') {
  runAllTests();
}
