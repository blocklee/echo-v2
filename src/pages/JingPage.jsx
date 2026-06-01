import { useRef, useEffect, useState } from 'react';
import { checkVersionCompatibility } from '../utils/versionCompat';

const CURRENT_ECHO_VERSION = '1.1.0';
const API_URL = 'https://echo-api.meerfans.club/api/potential';

const PHASES = [
  { name: '纳相', desc: '争议受理', shiPosition: 0 },
  { name: '展相', desc: '证据展示', shiPosition: 1 },
  { name: '照相', desc: '观点对照', shiPosition: 2 },
  { name: '议相', desc: '群体审议', shiPosition: 3 },
  { name: '决相', desc: '共识裁决', shiPosition: 4 },
  { name: '映相', desc: '结果映现', shiPosition: 5 },
];

function PotentialChart({ history }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    const values = history.map(h => h.potential || h.potentialValue || 0);
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
          : null;
        return (
          <div key={i} className={`bg-stone-50 rounded border p-3 text-sm ${compat?.compatible === false ? 'border-red-300' : 'border-stone-200'}`}>
            <div className="flex justify-between mb-1">
              <span className="text-stone-500">{(e.fromNode || '…').slice(0,8)}… → {(e.toNode || '…').slice(0,8)}…</span>
              {compat && (
                <span className={`text-xs ${compat.compatible ? 'text-emerald-600' : 'text-red-500'}`}>
                  {compat.compatible ? '✅ 兼容' : `❌ ${compat.reason}`}
                </span>
              )}
            </div>
            {e.versionConstraint && (
              <div className="text-xs text-red-400">
                v{e.versionConstraint.minVersion}~v{e.versionConstraint.maxVersion}
                <span className="text-stone-400 ml-2">({e.versionConstraint.constraintType})</span>
                <span className="text-stone-300 ml-2">blk#{e.versionConstraint.declaredAtBlock}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function JingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhase, setActivePhase] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8">载入中...</div>;
  if (error) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8">API 错误: {error}</div>;
  if (!data?.nodes?.length) return <div className="min-h-screen bg-stone-50 text-stone-900 p-8">无数据</div>;

  const nodes = data.nodes;
  const firstNode = nodes[0];
  const phaseIndex = firstNode?.phase ?? 0;
  const chartData = firstNode?.potentialHistory || [];
  const edgeData = firstNode?.edges || [];
  const latestPotential = chartData[chartData.length - 1]?.potential || chartData[chartData.length - 1]?.potentialValue || '—';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">境 — 争议之势</h1>
        <p className="text-stone-500 mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>
        <div className="mb-6"><PotentialChart history={chartData} /></div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {PHASES.map((p) => (
            <div key={p.shiPosition} onClick={() => setActivePhase(activePhase === p.shiPosition ? null : p.shiPosition)}
              className={`cursor-pointer rounded p-3 text-center transition-all duration-200 border ${activePhase === p.shiPosition ? 'border-red-400 bg-red-50' : p.shiPosition === phaseIndex ? 'border-emerald-400 bg-emerald-50' : 'border-stone-300 bg-white hover:border-stone-400'}`}>
              <div className="text-lg font-bold text-stone-800">{p.name}</div>
              <div className="text-xs text-stone-400">{p.desc}</div>
              <div className={`text-xs mt-1 ${p.shiPosition === phaseIndex ? 'text-emerald-500' : 'text-red-400'}`}>
                {p.shiPosition === phaseIndex ? '进行中' : `相位${p.shiPosition}`}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-6"><div className="text-sm text-stone-600 mb-2">边 — 伦理承诺的技术肉身</div><EdgeList edges={edgeData} /></div>
        <div className="bg-white rounded border border-stone-200 p-4">
          <div className="text-sm text-stone-600 mb-3">节点四权配置</div>
          <div className="grid grid-cols-4 gap-4">
            {['usage','derive','expand','benefit'].map(right => (
              <div key={right} className="text-center">
                <div className="text-xs text-stone-400 uppercase mb-1">{right}</div>
                <div className="text-2xl font-bold text-stone-800">{latestPotential}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
