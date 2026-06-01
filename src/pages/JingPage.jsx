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
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = 112;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, h);

    const values = history.map(h => h.potential || h.potentialValue || 0);
    const max = Math.max(...values, 0.01);
    const min = Math.min(...values, 0);
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

    // 节点圆点
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = (1 - (v - min) / range) * h;
      ctx.beginPath();
      ctx.fillStyle = '#c45c48';
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 数据点标注
    if (values.length <= 10) {
      ctx.fillStyle = '#78716c';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = (1 - (v - min) / range) * h;
        ctx.fillText(v.toFixed(2), x, y - 8);
      });
    }
  }, [history]);

  return (
    <div className="w-full h-28">
      <canvas ref={canvasRef} className="w-full h-full bg-[#faf9f7] rounded" />
    </div>
  );
}

function EdgeList({ edges }) {
  if (!edges || edges.length === 0) return <div className="text-[#6b6b6b]">无边数据</div>;
  return (
    <div className="space-y-2">
      {edges.map((e, i) => {
        const compat = e.versionConstraint
          ? checkVersionCompatibility(CURRENT_ECHO_VERSION, e.versionConstraint)
          : checkVersionCompatibility(CURRENT_ECHO_VERSION, ALPHA_7_CONSTRAINT);
        return (
          <div key={i} className={`bg-[#faf9f7] rounded border p-3 text-sm ${compat?.compatible === false ? 'border-red-300' : 'border-[#e5e2dc]'}`}>
            <div className="flex justify-between mb-1">
              <span className="text-[#6b6b6b]">{e.fromNode?.slice(0,8) || '?'}… → {e.toNode?.slice(0,8) || '?'}…</span>
              {compat && (
                <span className={`text-xs ${compat.compatible ? 'text-emerald-600' : 'text-red-500'}`}>
                  {compat.compatible ? '✅ 兼容' : `❌ ${compat.reason}`}
                </span>
              )}
            </div>
            {e.versionConstraint ? (
              <div className="text-xs text-[#c45c48]">
                v{e.versionConstraint.minVersion}~v{e.versionConstraint.maxVersion}
                <span className="text-[#6b6b6b] ml-2">({e.versionConstraint.constraintType})</span>
                <span className="text-[#9a9a9a] ml-2">blk#{e.versionConstraint.declaredAtBlock}</span>
              </div>
            ) : (
              <div className="text-xs text-[#9a9a9a]">v1.0.0~v2.0.0 (ALPHA-7 默认约束)</div>
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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    fetch(`${API_BASE}/api/potential`, { signal: ctrl.signal })
      .then(r => {
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setNodes(data.nodes || []);
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          setError('API 请求超时（8秒），后端响应太慢。请刷新重试。');
        } else {
          setError(err.message);
        }
        setLoading(false);
      });

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-[#1a1a1a]">境</h1>
        <p className="text-[#6b6b6b] mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>
        <div className="text-[#9a9a9a] mb-4">加载节点数据中…</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {PHASES.map((p) => (
            <div key={p.shiPosition} className="rounded p-3 text-center border border-[#e5e2dc] bg-white opacity-50">
              <div className="text-lg font-bold text-[#1a1a1a]">{p.name}</div>
              <div className="text-xs text-[#6b6b6b]">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-[#1a1a1a]">境</h1>
        <p className="text-[#6b6b6b] mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600 mb-4">
          <div className="font-bold mb-2">API 错误</div>
          <div>{error}</div>
        </div>
        <div className="text-[#9a9a9a] text-sm">后端 API 地址：{API_BASE}/api/potential</div>
      </div>
    </div>
  );
  if (nodes.length === 0) return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-[#1a1a1a]">境</h1>
        <p className="text-[#6b6b6b] mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>
        <div className="text-[#9a9a9a]">无节点数据</div>
      </div>
    </div>
  );

  const allHistory = nodes.flatMap(n => (n.potentialHistory || []).map(h => ({
    ...h,
    potentialValue: h.potential || h.potentialValue,
  }))).sort((a, b) => a.timestamp - b.timestamp);

  const phaseNodes = activePhase !== null
    ? nodes.filter(n => n.phase === activePhase)
    : nodes;

  const phaseHistory = activePhase !== null
    ? phaseNodes.flatMap(n => (n.potentialHistory || []).map(h => ({
        ...h,
        potentialValue: h.potential || h.potentialValue,
      }))).sort((a, b) => a.timestamp - b.timestamp)
    : allHistory;

  const edges = phaseNodes.flatMap(n => (n.edges || []).map(e => ({
    fromNode: n.nodeId,
    toNode: e.toNode,
    versionConstraint: ALPHA_7_CONSTRAINT,
  })));

  const latestNode = nodes[0];
  const fourRights = latestNode?.fourRights || {};

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        {/* 唐之风骨 */}
        <div className="mb-16">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-wide text-[#1a1a1a] mb-3">境</h1>
              <p className="text-[#6b6b6b] text-lg">势位如川，共识如流</p>
            </div>
          </div>
          <div className="mt-6 h-px bg-[#d4d0c8]" />
        </div>

        {/* 心电图 */}
        {allHistory.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-[#6b6b6b] mb-2">
              {activePhase !== null ? `${PHASE_NAMES[activePhase]} 势位曲线` : '全六相势位曲线'}
              <span className="text-[#9a9a9a] ml-2">（{allHistory.length} 个数据点）</span>
            </div>
            <PotentialChart history={phaseHistory} />
          </div>
        )}

        {/* 六相 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {PHASES.map((p) => {
            const count = nodes.filter(n => n.phase === p.shiPosition).length;
            return (
              <div key={p.shiPosition} onClick={() => setActivePhase(activePhase === p.shiPosition ? null : p.shiPosition)}
                className={`cursor-pointer rounded p-3 text-center transition-all duration-200 border ${activePhase === p.shiPosition ? 'border-[#c45c48] bg-[#c45c48]/5' : 'border-[#e5e2dc] bg-white hover:border-[#d4d0c8]'}`}>
                <div className="text-lg font-bold text-[#1a1a1a]">{p.name}</div>
                <div className="text-xs text-[#6b6b6b]">{p.desc}</div>
                <div className="text-xs text-[#c45c48] mt-1">相位{p.shiPosition}</div>
                <div className="text-xs text-[#9a9a9a] mt-1">{count} 节点</div>
              </div>
            );
          })}
        </div>

        {/* 节点列表 */}
        {phaseNodes.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-[#6b6b6b] mb-2">
              {activePhase !== null ? `${PHASE_NAMES[activePhase]} 节点` : '全部节点'}
              <span className="text-[#9a9a9a] ml-2">（{phaseNodes.length} 个）</span>
            </div>
            <div className="space-y-3">
              {phaseNodes.map((node, i) => (
                <div key={node.nodeId || i} className="bg-white rounded border border-[#e5e2dc] p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-bold text-[#1a1a1a]">
                      节点 {i + 1} · {node.nodeId?.slice(0, 16)}…
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${node.phase === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-[#faf9f7] text-[#6b6b6b]'}`}>
                      {PHASE_NAMES[node.phase ?? 0]} · 势位 {node.shiPosition ?? node.phase ?? 0}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                    <div>
                      <div className="text-xs text-[#9a9a9a]">当前势值</div>
                      <div className="font-bold text-[#c45c48]">{typeof node.potential === 'number' ? node.potential.toFixed(2) : typeof node.potential === 'string' ? node.potential : JSON.stringify(node.potential ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9a9a9a]">相位</div>
                      <div className="font-bold">{PHASE_NAMES[node.phase ?? 0]}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9a9a9a]">势位</div>
                      <div className="font-bold">{node.shiPosition ?? node.phase ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9a9a9a]">触发</div>
                      <div className="font-bold">{typeof node.nextPhaseTrigger === 'string' ? node.nextPhaseTrigger : typeof node.nextPhaseTrigger === 'number' ? String(node.nextPhaseTrigger) : JSON.stringify(node.nextPhaseTrigger ?? null)}</div>
                    </div>
                  </div>
                  {node.creator && (
                    <div className="text-xs text-[#9a9a9a]">创建者：{node.creator}</div>
                  )}
                  {node.edges && node.edges.length > 0 && (
                    <div className="text-xs text-[#9a9a9a] mt-1">
                      出边：{node.edges.length} 条 → {node.edges.map(e => e.toNode?.slice(0, 8) || '?').join(', ')}…
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 边列表 */}
        {edges.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-[#6b6b6b] mb-2">边 — 伦理承诺的技术肉身</div>
            <EdgeList edges={edges} />
          </div>
        )}

        {/* 四权 */}
        <div className="bg-white rounded border border-[#e5e2dc] p-4">
          <div className="text-sm text-[#6b6b6b] mb-3">节点四权配置</div>
          <div className="grid grid-cols-4 gap-4">
            {['usage', 'derive', 'expand', 'benefit'].map(right => (
              <div key={right} className="text-center">
                <div className="text-xs text-[#6b6b6b] uppercase mb-1">{right}</div>
                <div className="text-2xl font-bold text-[#1a1a1a]">{typeof fourRights[right] === 'string' || typeof fourRights[right] === 'number' ? fourRights[right] : JSON.stringify(fourRights[right] ?? null)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-xs text-[#9a9a9a]">
          数据来源：{API_BASE}/api/potential · 更新于 {new Date(nodes[0]?.updatedAt || Date.now()).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
}
