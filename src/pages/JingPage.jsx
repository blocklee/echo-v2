import { useRef, useEffect, useState } from 'react';
import { checkVersionCompatibility, ALPHA_7_CONSTRAINT } from '../utils/versionCompat';

const CURRENT_ECHO_VERSION = '1.1.0';
const API_BASE = 'https://echo-api.meerfans.club';

const PHASE_NAMES = ['纳相', '展相', '照相', '议相', '决相', '映相'];
const PHASES = PHASE_NAMES.map((name, shiPosition) => ({
  name,
  desc: ['争议受理', '证据展示', '观点对照', '群体审议', '共识裁决', '结果映现'][shiPosition],
  shiPosition,
}));

function PotentialChart({ history }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const values = history.map(h => h.potential || h.potentialValue);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 0.01;

    // 淡墨网格
    ctx.strokeStyle = 'rgba(168,163,154,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 心电图折线 - 朱砂色
    ctx.beginPath();
    ctx.strokeStyle = '#c45c48';
    ctx.lineWidth = 2;
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = (1 - (v - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 节点
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = (1 - (v - min) / range) * h;
      ctx.beginPath();
      ctx.fillStyle = '#c45c48';
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [history]);

  return <canvas ref={canvasRef} className="w-full h-28 bg-stone-50 rounded" />;
}

function EdgeList({ edges }) {
  if (!edges || edges.length === 0) return <div className="text-stone-400">无边数据</div>;
  return (
    <div className="space-y-2">
      {edges.map((e, i) => {
        const compat = e.versionConstraint
          ? checkVersionCompatibility(CURRENT_ECHO_VERSION, e.versionConstraint)
          : checkVersionCompatibility(CURRENT_ECHO_VERSION, ALPHA_7_CONSTRAINT);
        return (
          <div key={i} className={`bg-stone-50 rounded border p-3 text-sm ${compat?.compatible === false ? 'border-red-300' : 'border-stone-200'}`}>
            <div className="flex justify-between mb-1">
              <span className="text-stone-500">{e.fromNode?.slice(0,8) || '?'}… → {e.toNode?.slice(0,8) || '?'}…</span>
              {compat && (
                <span className={`text-xs ${compat.compatible ? 'text-emerald-600' : 'text-red-500'}`}>
                  {compat.compatible ? '✅ 兼容' : `❌ ${compat.reason}`}
                </span>
              )}
            </div>
            {e.versionConstraint ? (
              <div className="text-xs text-red-400">
                v{e.versionConstraint.minVersion}~v{e.versionConstraint.maxVersion}
                <span className="text-stone-400 ml-2">({e.versionConstraint.constraintType})</span>
                <span className="text-stone-300 ml-2">blk#{e.versionConstraint.declaredAtBlock}</span>
              </div>
            ) : (
              <div className="text-xs text-stone-400">v1.0.0~v2.0.0 (ALPHA-7 默认约束)</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function JingPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhase, setActivePhase] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/potential`)
      .then(r => r.json())
      .then(data => {
        setNodes(data.nodes || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8">加载中…</div>;
  if (error) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8 text-red-500">错误：{error}</div>;
  if (nodes.length === 0) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8">无节点数据</div>;

  // 全量 potentialHistory 用于心电图（所有节点合并）
  const allHistory = nodes.flatMap(n => (n.potentialHistory || []).map(h => ({
    ...h,
    potentialValue: h.potential || h.potentialValue,
  }))).sort((a, b) => a.timestamp - b.timestamp);

  // 当前选中相位的节点
  const phaseNodes = activePhase !== null
    ? nodes.filter(n => n.phase === activePhase)
    : nodes;

  // 当前选中相位的心电图
  const phaseHistory = activePhase !== null
    ? phaseNodes.flatMap(n => (n.potentialHistory || []).map(h => ({
        ...h,
        potentialValue: h.potential || h.potentialValue,
      }))).sort((a, b) => a.timestamp - b.timestamp)
    : allHistory;

  // 边的来源：当前相位节点的 edges
  const edges = phaseNodes.flatMap(n => (n.edges || []).map(e => ({
    fromNode: n.nodeId,
    toNode: e.toNode,
    versionConstraint: ALPHA_7_CONSTRAINT,
  })));

  const latestNode = nodes[0];
  const fourRights = latestNode?.fourRights || {};

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">境 — 争议之势</h1>
        <p className="text-stone-500 mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>

        {allHistory.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-stone-600 mb-2">
              {activePhase !== null ? `${PHASE_NAMES[activePhase]} 势位曲线` : '全六相势位曲线'}
              <span className="text-stone-400 ml-2">（{allHistory.length} 个数据点）</span>
            </div>
            <PotentialChart history={phaseHistory} />
          </div>
        )}

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {PHASES.map((p) => {
            const count = nodes.filter(n => n.phase === p.shiPosition).length;
            return (
              <div key={p.shiPosition} onClick={() => setActivePhase(activePhase === p.shiPosition ? null : p.shiPosition)}
                className={`cursor-pointer rounded p-3 text-center transition-all duration-200 border ${activePhase === p.shiPosition ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white hover:border-stone-400'}`}>
                <div className="text-lg font-bold text-stone-800">{p.name}</div>
                <div className="text-xs text-stone-400">{p.desc}</div>
                <div className="text-xs text-red-400 mt-1">相位{p.shiPosition}</div>
                <div className="text-xs text-stone-500 mt-1">{count} 节点</div>
              </div>
            );
          })}
        </div>

        {edges.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-stone-600 mb-2">边 — 伦理承诺的技术肉身</div>
            <EdgeList edges={edges} />
          </div>
        )}

        <div className="bg-white rounded border border-stone-200 p-4">
          <div className="text-sm text-stone-600 mb-3">节点四权配置</div>
          <div className="grid grid-cols-4 gap-4">
            {['usage', 'derive', 'expand', 'benefit'].map(right => (
              <div key={right} className="text-center">
                <div className="text-xs text-stone-400 uppercase mb-1">{right}</div>
                <div className="text-2xl font-bold text-stone-800">{fourRights[right] ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-xs text-stone-400">
          数据来源：{API_BASE}/api/potential · 更新于 {new Date(nodes[0]?.updatedAt || Date.now()).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
}
