import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function DianPage() {
  const { provider, address } = useWallet();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRight, setSelectedRight] = useState(null);
  const [history, setHistory] = useState([]);

  const FOUR_SEALS = [
    { key: 'usage', name: '流布印', desc: '一灯传万灯', detail: '照临无界，复制、传播、展示' },
    { key: 'derive', name: '化裁印', desc: '穷则变，变则通', detail: '翻译、改编、二次创作' },
    { key: 'expand', name: '衍义印', desc: '枝蔓滋长', detail: '续作、外传、同人' },
    { key: 'reproduce', name: '重光印', desc: '旧命新辉', detail: '重制、汇编、数据库' },
  ];

  const [configs, setConfigs] = useState(FOUR_SEALS.map(r => ({
    ...r,
    enabled: false,
    scope: 'all',
    royalty: 5,
    duration: 'perpetual',
  })));

  const updateConfig = (key, field, value) => {
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, [field]: value } : c));
  };

  const handleSave = (key) => {
    const config = configs.find(c => c.key === key);
    setHistory(prev => [{
      action: '契印',
      seal: config.name,
      detail: `范围: ${config.scope}, 分润: ${config.royalty}%, 期限: ${config.duration}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        {/* 唐之风骨 — 标题恢弘 */}
        <div className="mb-16">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-wide text-[#1a1a1a] mb-3">契</h1>
              <p className="text-[#6b6b6b] text-lg">铸印为信，确权为据</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2.5 bg-[#c45c48] hover:bg-[#b54e3a] text-white text-sm tracking-widest transition-colors"
              style={{ borderRadius: '2px' }}
            >
              新铸
            </button>
          </div>
          {/* 宋之留白 — 细线分隔 */}
          <div className="mt-6 h-px bg-[#d4d0c8]" />
        </div>

        {/* 四印 — 明之淡雅 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {configs.map((config, index) => (
            <div key={config.key} className="group">
              {/* 印头 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-baseline gap-4">
                  <span className="text-sm text-[#9a9a9a] font-serif">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-xl font-bold tracking-wide">{config.name}</h3>
                    <p className="text-sm text-[#6b6b6b] mt-1">{config.desc}</p>
                  </div>
                </div>
                {/* 朱文印样式开关 */}
                <button
                  onClick={() => updateConfig(config.key, 'enabled', !config.enabled)}
                  className={`px-4 py-1.5 text-sm tracking-wider transition-all ${
                    config.enabled 
                      ? 'bg-[#c45c48] text-white' 
                      : 'border border-[#d4d0c8] text-[#6b6b6b] hover:border-[#c45c48] hover:text-[#c45c48]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {config.enabled ? '已契' : '未契'}
                </button>
              </div>

              {/* 契印展开 */}
              {config.enabled && (
                <div className="pl-10 space-y-5">
                  <div className="h-px bg-[#e5e2dc]" />
                  
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs text-[#9a9a9a] tracking-wider mb-2 block">照临范围</label>
                      <select
                        value={config.scope}
                        onChange={(e) => updateConfig(config.key, 'scope', e.target.value)}
                        className="w-full p-2 bg-[#faf9f7] border-b border-[#d4d0c8] text-sm focus:border-[#c45c48] focus:outline-none transition-colors"
                      >
                        <option value="all">天下</option>
                        <option value="region">一方</option>
                        <option value="private">独照</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#9a9a9a] tracking-wider mb-2 block">分润 (%)</label>
                      <input
                        type="number"
                        value={config.royalty}
                        onChange={(e) => updateConfig(config.key, 'royalty', Number(e.target.value))}
                        className="w-full p-2 bg-[#faf9f7] border-b border-[#d4d0c8] text-sm focus:border-[#c45c48] focus:outline-none transition-colors"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#9a9a9a] tracking-wider mb-2 block">契期</label>
                      <select
                        value={config.duration}
                        onChange={(e) => updateConfig(config.key, 'duration', e.target.value)}
                        className="w-full p-2 bg-[#faf9f7] border-b border-[#d4d0c8] text-sm focus:border-[#c45c48] focus:outline-none transition-colors"
                      >
                        <option value="perpetual">永续</option>
                        <option value="1year">一载</option>
                        <option value="5years">五载</option>
                        <option value="10years">十载</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSave(config.key)}
                    className="px-8 py-2 border border-[#c45c48] text-[#c45c48] hover:bg-[#c45c48] hover:text-white text-sm tracking-widest transition-all"
                    style={{ borderRadius: '2px' }}
                  >
                    落印
                  </button>
                </div>
              )}

              {/* 底部细线 */}
              <div className="mt-8 h-px bg-[#e5e2dc]" />
            </div>
          ))}
        </div>

        {/* 契印谱 — 变更历史 */}
        {history.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl font-bold tracking-wide">契印谱</h2>
              <div className="flex-1 h-px bg-[#d4d0c8]" />
            </div>
            <div className="space-y-0">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className="flex justify-between items-center py-4 border-b border-[#e5e2dc]">
                  <div className="flex items-baseline gap-6">
                    <span className="text-sm text-[#9a9a9a]">{h.timestamp}</span>
                    <div>
                      <span className="font-medium">{h.seal}</span>
                      <span className="text-sm text-[#6b6b6b] ml-3">{h.detail}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#c45c48] tracking-wider">{h.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
