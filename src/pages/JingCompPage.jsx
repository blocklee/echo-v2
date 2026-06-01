import { useState } from 'react';

export default function JingCompPage() {
  const [round, setRound] = useState(1);
  const [showDetail, setShowDetail] = useState(null);

  const MOCK_RANKING = [
    { rank: 1, name: 'ECHO 协议 v4', potential: 2847, trend: '+12%', address: '0x742d...35fD' },
    { rank: 2, name: 'AgentJury 机制', potential: 2156, trend: '+8%', address: '0x9a8b...c7d6' },
    { rank: 3, name: 'AgentJury 合约', potential: 1892, trend: '-3%', address: '0x3c5d...e7f8' },
    { rank: 4, name: '经济模型设计', potential: 1567, trend: '+5%', address: '0x1a2b...c3d4' },
    { rank: 5, name: 'ExitGas', potential: 1234, trend: '+2%', address: '0x5e6f...a7b8' },
  ];

  const MOCK_DERIVATIVES = [
    { from: 'ECHO 协议 v4', to: 'AgentJury 机制', type: '扩展', strength: 0.85 },
    { from: 'AgentJury 机制', to: '经济模型设计', type: '依赖', strength: 0.72 },
    { from: '经济模型设计', to: 'ExitGas', type: '影响', strength: 0.63 },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-[#1a1a1a]">竞 — 竞争之势</h1>
        <p className="text-[#6b6b6b] mb-8">此处展示竞争态势与排名，势位流转，优胜劣汰。</p>

        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">第 {round} 轮角逐</h2>
            <div className="flex gap-2">
              <button onClick={() => setRound(Math.max(1, round - 1))} className="btn-primary">上一轮</button>
              <button onClick={() => setRound(round + 1)} className="btn-primary">下一轮</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-stone-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-[#c45c48]">5</div>
              <div className="text-sm text-[#6b6b6b]">参与方</div>
            </div>
            <div className="bg-stone-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-[#3b5998]">2847</div>
              <div className="text-sm text-[#6b6b6b]">最高势位</div>
            </div>
            <div className="bg-stone-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-emerald-600">+8.5%</div>
              <div className="text-sm text-[#6b6b6b]">平均增长</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">势位排行</h2>
            <div className="space-y-3">
              {MOCK_RANKING.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded cursor-pointer hover:bg-stone-100 transition-colors"
                  onClick={() => setShowDetail(item)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      item.rank === 1 ? 'bg-[#c45c48] text-white' :
                      item.rank === 2 ? 'bg-[#3b5998] text-white' :
                      item.rank === 3 ? 'bg-amber-500 text-white' :
                      'bg-stone-200 text-stone-600'
                    }`}>
                      {item.rank}
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-[#6b6b6b]">{item.address}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.potential}</div>
                    <div className={`text-sm ${item.trend.startsWith('+') ? 'text-emerald-600' : 'text-[#c45c48]'}`}>
                      {item.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">衍生关系</h2>
            <div className="space-y-3">
              {MOCK_DERIVATIVES.map((d, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.from}</span>
                      <span className="text-[#6b6b6b]">→</span>
                      <span className="font-medium">{d.to}</span>
                    </div>
                    <span className="text-sm px-2 py-1 rounded bg-stone-200">{d.type}</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-[#c45c48] h-2 rounded-full transition-all"
                        style={{ width: `${d.strength * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#6b6b6b] mt-1">关联强度: {(d.strength * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
