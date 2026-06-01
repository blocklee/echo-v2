import { useRef, useEffect, useState } from 'react';

const PHASES = [
  { name: '纳相', desc: '争议受理', shiPosition: 0 },
  { name: '展相', desc: '证据展示', shiPosition: 1 },
  { name: '照相', desc: '观点对照', shiPosition: 2 },
  { name: '议相', desc: '群体审议', shiPosition: 3 },
  { name: '决相', desc: '共识裁决', shiPosition: 4 },
  { name: '映相', desc: '结果映现', shiPosition: 5 },
];

const MOCK_POTENTIAL_HISTORY = [
  { timestamp: 1748758400, potentialValue: 0.42, phase: '纳相', shiPosition: 0 },
  { timestamp: 1748760000, potentialValue: 0.51, phase: '纳相', shiPosition: 0 },
  { timestamp: 1748761600, potentialValue: 0.48, phase: '展相', shiPosition: 1 },
  { timestamp: 1748763200, potentialValue: 0.63, phase: '展相', shiPosition: 1 },
  { timestamp: 1748764800, potentialValue: 0.59, phase: '照相', shiPosition: 2 },
  { timestamp: 1748766400, potentialValue: 0.71, phase: '照相', shiPosition: 2 },
  { timestamp: 1748768000, potentialValue: 0.68, phase: '议相', shiPosition: 3 },
  { timestamp: 1748769600, potentialValue: 0.75, phase: '议相', shiPosition: 3 },
  { timestamp: 1748771200, potentialValue: 0.73, phase: '决相', shiPosition: 4 },
  { timestamp: 1748772800, potentialValue: 0.80, phase: '映相', shiPosition: 5 },
];

const MOCK_EDGES = [
  { fromNode: '0x86ca...', toNode: '0x16ce...', versionConstraint: { minVersion: '1.0', maxVersion: '2.0', constraintType: 'range', declaredAtBlock: 2704473 } },
  { fromNode: '0x16ce...', toNode: '0xc6a7...', versionConstraint: { minVersion: '1.0', maxVersion: '1.9', constraintType: 'range', declaredAtBlock: 2704500 } },
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
    const max = Math.max(...history.map(h => h.potentialValue));
    const min = Math.min(...history.map(h => h.potentialValue));
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
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = (1 - (pt.potentialValue - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // 节点
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = (1 - (pt.potentialValue - min) / range) * h;
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
      {edges.map((e, i) => (
        <div key={i} className="bg-stone-50 rounded border border-stone-200 p-3 text-sm">
          <div className="flex justify-between mb-1"><span className="text-stone-500">{e.fromNode.slice(0,8)}… → {e.toNode.slice(0,8)}…</span></div>
          {e.versionConstraint && <div className="text-xs text-red-400">v{e.versionConstraint.minVersion}~v{e.versionConstraint.maxVersion}<span className="text-stone-400 ml-2">({e.versionConstraint.constraintType})</span><span className="text-stone-300 ml-2">blk#{e.versionConstraint.declaredAtBlock}</span></div>}
        </div>
      ))}
    </div>
  );
}

export default function JingPage() {
  const [activePhase, setActivePhase] = useState(null);
  const [chartData] = useState(MOCK_POTENTIAL_HISTORY);
  const [edgeData] = useState(MOCK_EDGES);
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">境 — 争议之势</h1>
        <p className="text-stone-500 mb-6">势位如川，共识如流。六相呼吸，动态呈现。</p>
        <div className="mb-6"><PotentialChart history={chartData} /></div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {PHASES.map((p) => (
            <div key={p.shiPosition} onClick={() => setActivePhase(activePhase === p.shiPosition ? null : p.shiPosition)}
              className={`cursor-pointer rounded p-3 text-center transition-all duration-200 border ${activePhase === p.shiPosition ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white hover:border-stone-400'}`}>
              <div className="text-lg font-bold text-stone-800">{p.name}</div>
              <div className="text-xs text-stone-400">{p.desc}</div>
              <div className="text-xs text-red-400 mt-1">相位{p.shiPosition}</div>
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
                <div className="text-2xl font-bold text-stone-800">{chartData[chartData.length-1]?.potentialValue || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
