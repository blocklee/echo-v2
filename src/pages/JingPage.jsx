import { useState, useEffect } from 'react';

const PHASE_NAMES = ['纳相', '展相', '照相', '议相', '决相', '映相'];
const PHASE_DESCS = ['争议受理', '证据展示', '观点对照', '群体审议', '共识裁决', '结果映现'];
const API_URL = 'https://echo-api.meerfans.club/api/potential';

export default function JingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white p-8">载入中...</div>;
  if (error) return <div className="min-h-screen bg-neutral-950 text-white p-8">API 错误: {error}</div>;
  if (!data?.nodes?.length) return <div className="min-h-screen bg-neutral-950 text-white p-8">无数据</div>;

  const nodes = data.nodes;
  const phaseIndex = nodes[0]?.phase ?? 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">境 — 争议之势</h1>
        <p className="text-neutral-400 mb-8">案由如川，共识如流。此处展示六相动态与势位流转。</p>

        {/* 六相位 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {PHASE_NAMES.map((name, i) => (
            <div key={i} className={`card transition-all duration-300 hover:border-emerald-700/50 ${i === phaseIndex ? 'border-emerald-600/50 bg-emerald-950/20' : ''}`}>
              <div className="text-lg font-bold mb-1">{name}</div>
              <div className="text-sm text-neutral-400">{PHASE_DESCS[i]}</div>
              <div className="mt-2 text-xs text-emerald-400">{i === phaseIndex ? '进行中' : '待开启'}</div>
            </div>
          ))}
        </div>

        {/* 节点列表 */}
        <div className="space-y-6">
          {nodes.map((node, idx) => (
            <div key={node.nodeId} className="card border border-neutral-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-emerald-400">节点 {idx + 1}</div>
                <div className="text-xs text-neutral-500 font-mono">{node.nodeId.slice(0, 16)}...</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div><span className="text-neutral-500">势值:</span> <span className="text-white">{node.potential}</span></div>
                <div><span className="text-neutral-500">相位:</span> <span className="text-white">{PHASE_NAMES[node.phase ?? 0]} ({node.phase})</span></div>
                <div><span className="text-neutral-500">势位:</span> <span className="text-white">({node.shiPosition?.x}, {node.shiPosition?.y})</span></div>
                <div><span className="text-neutral-500">触发:</span> <span className="text-white">{node.nextPhaseTrigger}</span></div>
              </div>

              {/* 历史曲线 — 简单柱状图 */}
              {node.potentialHistory?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-neutral-500 mb-2">势位历史</div>
                  <div className="flex items-end gap-1 h-24">
                    {node.potentialHistory.map((h, i) => {
                      const max = Math.max(...node.potentialHistory.map(p => p.potential));
                      const pct = max > 0 ? (h.potential / max) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-emerald-500/60 rounded-t" style={{ height: `${pct}%` }} />
                          <div className="text-[10px] text-neutral-500">{i + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 因果边 */}
              {node.edges?.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500 mb-2">因果边 ({node.edges.length} 条)</div>
                  <div className="space-y-1">
                    {node.edges.map((e, i) => (
                      <div key={i} className="text-xs text-neutral-400 font-mono">
                        → {e.toNode.slice(0, 20)}... (depth={e.depth}, type={e.edgeType})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
