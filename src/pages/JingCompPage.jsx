import { useState } from 'react';

// Mock 竞争数据
const MOCK_ROUNDS = [
  { id: 1, phase: '纳相', status: 'active', participants: 12, trigger: '争议提交', endTime: '2026-06-02 12:00' },
  { id: 2, phase: '展相', status: 'pending', participants: 0, trigger: '证据提交', endTime: '-' },
  { id: 3, phase: '照相', status: 'pending', participants: 0, trigger: '观点对照', endTime: '-' },
];

const MOCK_RANKING = [
  { rank: 1, name: 'Echo Protocol', potential: 2847, trend: '+12%', address: '0x7a8b...c3d4' },
  { rank: 2, name: 'DAO 治理框架', potential: 2156, trend: '+8%', address: '0x9e1f...a2b3' },
  { rank: 3, name: 'AgentJury 合约', potential: 1892, trend: '-3%', address: '0x3c5d...e7f8' },
  { rank: 4, name: '经济模型设计', potential: 1567, trend: '+5%', address: '0x1a2b...c3d4' },
  { rank: 5, name: 'ExitGas 池', potential: 1234, trend: '+2%', address: '0x5e6f...a7b8' },
];

const MOCK_DERIVATIVES = [
  { from: 'Echo Protocol', to: 'DAO 治理框架', type: 'derive', potential: 1200 },
  { from: 'DAO 治理框架', to: 'AgentJury 合约', type: 'expand', potential: 800 },
  { from: 'Echo Protocol', to: '经济模型设计', type: 'derive', potential: 600 },
];

export default function JingCompPage() {
  const [rounds] = useState(MOCK_ROUNDS);
  const [ranking] = useState(MOCK_RANKING);
  const [derivatives] = useState(MOCK_DERIVATIVES);
  const [activeTab, setActiveTab] = useState('rounds');

  const totalPotential = ranking.reduce((sum, r) => sum + r.potential, 0);
  const activeCount = rounds.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">竞 — 共识之果</h1>
          <p className="text-neutral-400">竞争态势与势位排行。尘埃落定，共识成典。</p>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">总势位</div>
            <div className="text-3xl font-bold text-emerald-400">{totalPotential.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">参与作品</div>
            <div className="text-3xl font-bold text-blue-400">{ranking.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">进行中轮次</div>
            <div className="text-3xl font-bold text-yellow-400">{activeCount}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">衍生关系</div>
            <div className="text-3xl font-bold text-purple-400">{derivatives.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-neutral-800">
          {[
            { key: 'rounds', label: '游戏轮次' },
            { key: 'ranking', label: '势位排行' },
            { key: 'derivatives', label: '衍生关系' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 text-sm transition-colors relative ${
                activeTab === tab.key ? 'text-white' : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* 游戏轮次 */}
        {activeTab === 'rounds' && (
          <div className="card">
            <div className="text-sm text-emerald-400 mb-4 font-medium">六相轮次状态</div>
            <div className="space-y-3">
              {rounds.map(r => (
                <div key={r.id} className={`flex items-center gap-4 p-4 rounded border ${
                  r.status === 'active' ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-neutral-800 bg-neutral-900'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    r.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                    r.status === 'completed' ? 'bg-blue-500' : 'bg-neutral-600'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.phase}</div>
                    <div className="text-xs text-neutral-500">{r.trigger}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-neutral-500">参与</div>
                    <div className="text-sm font-bold">{r.participants}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-500">截止</div>
                    <div className="text-sm text-neutral-400">{r.endTime}</div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      r.status === 'active' ? 'bg-emerald-900/50 text-emerald-300' :
                      r.status === 'completed' ? 'bg-blue-900/50 text-blue-300' :
                      'bg-neutral-800 text-neutral-400'
                    }`}>
                      {r.status === 'active' ? '进行中' : r.status === 'completed' ? '已结束' : '待开始'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 势位排行 */}
        {activeTab === 'ranking' && (
          <div className="card">
            <div className="text-sm text-emerald-400 mb-4 font-medium">势位排行榜</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-800">
                    <th className="text-left py-3 px-4">排名</th>
                    <th className="text-left py-3 px-4">作品</th>
                    <th className="text-left py-3 px-4">地址</th>
                    <th className="text-right py-3 px-4">势位值</th>
                    <th className="text-right py-3 px-4">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(r => (
                    <tr key={r.rank} className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                          r.rank === 1 ? 'bg-yellow-900/50 text-yellow-300' :
                          r.rank === 2 ? 'bg-neutral-700 text-neutral-300' :
                          r.rank === 3 ? 'bg-orange-900/50 text-orange-300' :
                          'bg-neutral-800 text-neutral-400'
                        }`}>
                          {r.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{r.name}</td>
                      <td className="py-3 px-4 text-neutral-400 text-xs">{r.address}</td>
                      <td className="text-right py-3 px-4 font-bold text-emerald-400">{r.potential.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-xs ${r.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 衍生关系 */}
        {activeTab === 'derivatives' && (
          <div className="card">
            <div className="text-sm text-emerald-400 mb-4 font-medium">衍生关系图</div>
            <div className="space-y-3">
              {derivatives.map((d, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded bg-neutral-900 border border-neutral-800">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.from}</div>
                    <div className="text-xs text-neutral-500">源作品</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-neutral-400">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      d.type === 'derive' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'
                    }`}>
                      {d.type === 'derive' ? '改编' : '衍生'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.to}</div>
                    <div className="text-xs text-neutral-500">子作品</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">{d.potential.toLocaleString()}</div>
                    <div className="text-xs text-neutral-500">势位</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
