import { useState } from 'react';

export default function JingCompPage() {
  const [round, setRound] = useState(1);
  const [showDetail, setShowDetail] = useState(null);

  const RANKING = [
    { rank: 1, name: 'ECHO 协议', potential: 2847, trend: '+12%', address: '0x742d...35fD' },
    { rank: 2, name: 'AgentJury 机制', potential: 2156, trend: '+8%', address: '0x9a8b...c7d6' },
    { rank: 3, name: 'AgentJury 合约', potential: 1892, trend: '-3%', address: '0x3c5d...e7f8' },
    { rank: 4, name: '经济模型', potential: 1567, trend: '+5%', address: '0x1a2b...c3d4' },
    { rank: 5, name: 'ExitGas', potential: 1234, trend: '+2%', address: '0x5e6f...a7b8' },
  ];

  const DERIVATIVES = [
    { from: 'ECHO 协议', to: 'AgentJury 机制', type: '扩展', strength: 0.85 },
    { from: 'AgentJury 机制', to: '经济模型', type: '依赖', strength: 0.72 },
    { from: '经济模型', to: 'ExitGas', type: '影响', strength: 0.63 },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        {/* 唐之风骨 */}
        <div className="mb-16">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-wide text-[#1a1a1a] mb-3">竞</h1>
              <p className="text-[#6b6b6b] text-lg">势如峰峦，位如座次</p>
            </div>
          </div>
          <div className="mt-6 h-px bg-[#d4d0c8]" />
        </div>

        {/* 局况 — 统计 */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">局况</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center py-8">
              <div className="text-3xl font-bold text-[#c45c48]">5</div>
              <div className="text-sm text-[#6b6b6b] mt-2 tracking-wider">入局者</div>
            </div>
            <div className="text-center py-8">
              <div className="text-3xl font-bold text-[#1a1a1a]">2847</div>
              <div className="text-sm text-[#6b6b6b] mt-2 tracking-wider">最高势位</div>
            </div>
            <div className="text-center py-8">
              <div className="text-3xl font-bold text-[#3b5998]">+8.5%</div>
              <div className="text-sm text-[#6b6b6b] mt-2 tracking-wider">平均增长</div>
            </div>
          </div>
        </div>

        {/* 势位榜 */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">势位榜</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
            <div className="flex gap-2">
              <button 
                onClick={() => setRound(Math.max(1, round - 1))}
                className="px-3 py-1 text-sm border border-[#d4d0c8] text-[#6b6b6b] hover:border-[#c45c48] hover:text-[#c45c48] transition-colors"
                style={{ borderRadius: '2px' }}
              >
                上一轮
              </button>
              <button 
                onClick={() => setRound(round + 1)}
                className="px-3 py-1 text-sm border border-[#d4d0c8] text-[#6b6b6b] hover:border-[#c45c48] hover:text-[#c45c48] transition-colors"
                style={{ borderRadius: '2px' }}
              >
                下一轮
              </button>
            </div>
          </div>

          <div className="space-y-0">
            {RANKING.map((item, index) => (
              <div 
                key={item.rank}
                onClick={() => setShowDetail(showDetail === item.rank ? null : item.rank)}
                className="cursor-pointer group"
              >
                <div className="flex items-center gap-6 py-5 border-b border-[#e5e2dc]">
                  <span className="text-sm text-[#9a9a9a] font-serif w-8">
                    {String(item.rank).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold tracking-wide">{item.name}</div>
                    <div className="text-xs text-[#9a9a9a] mt-1">{item.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{item.potential}</div>
                    <div className={`text-sm ${item.trend.startsWith('+') ? 'text-[#c45c48]' : 'text-[#3b5998]'}`}>
                      {item.trend}
                    </div>
                  </div>
                </div>

                {showDetail === item.rank && (
                  <div className="pl-14 py-4 bg-[#faf9f7]">
                    <div className="h-px bg-[#e5e2dc] mb-4" />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[#9a9a9a]">势位</span>
                        <p className="font-medium mt-1">{item.potential}</p>
                      </div>
                      <div>
                        <span className="text-[#9a9a9a]">流向</span>
                        <p className="font-medium mt-1">{item.trend}</p>
                      </div>
                      <div>
                        <span className="text-[#9a9a9a]">契址</span>
                        <p className="font-medium mt-1">{item.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 脉络 — 衍生关系 */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">脉络</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
          </div>

          <div className="space-y-0">
            {DERIVATIVES.map((link, index) => (
              <div key={index} className="py-5 border-b border-[#e5e2dc]">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#9a9a9a] font-serif">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 flex items-center gap-4">
                    <span className="font-medium">{link.from}</span>
                    <span className="text-[#9a9a9a]">→</span>
                    <span className="px-2 py-0.5 text-xs border border-[#d4d0c8] text-[#6b6b6b]">
                      {link.type}
                    </span>
                    <span className="text-[#9a9a9a]">→</span>
                    <span className="font-medium">{link.to}</span>
                  </div>
                  <div className="text-sm text-[#9a9a9a]">
                    强度 {Math.round(link.strength * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
