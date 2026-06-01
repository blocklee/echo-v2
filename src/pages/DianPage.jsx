import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function DianPage() {
  const { provider, address } = useWallet();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRight, setSelectedRight] = useState(null);
  const [history, setHistory] = useState([]);

  const FOUR_RIGHTS = [
    { key: 'usage', label: '使用权', desc: '复制、传播、展示' },
    { key: 'derive', label: '改编权', desc: '翻译、改编、二次创作' },
    { key: 'expand', label: '衍生权', desc: '续作、外传、同人' },
    { key: 'reproduce', label: '再制权', desc: '重制、汇编、数据库' },
  ];

  const [configs, setConfigs] = useState(FOUR_RIGHTS.map(r => ({
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
      action: '更新配置',
      right: config.label,
      detail: `范围: ${config.scope}, 版税: ${config.royalty}%, 期限: ${config.duration}`,
      timestamp: new Date().toLocaleString('zh-CN'),
    }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[#1a1a1a]">典 — 铸造之法</h1>
            <p className="text-[#6b6b6b]">此处为 AI 铸造与四权配置，铸印为信，确权为据。</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary bg-[#c45c48] hover:bg-[#b54e3a] text-white"
          >
            铸造新典
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configs.map(config => (
            <div key={config.key} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{config.label}</h3>
                  <p className="text-sm text-[#6b6b6b]">{config.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6b6b6b]">启用</span>
                  <button
                    onClick={() => updateConfig(config.key, 'enabled', !config.enabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-[#c45c48]' : 'bg-stone-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {config.enabled && (
                <div className="space-y-4 mt-4 border-t border-stone-200 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">授权范围</label>
                    <select
                      value={config.scope}
                      onChange={(e) => updateConfig(config.key, 'scope', e.target.value)}
                      className="w-full p-2 rounded border border-stone-300 bg-white"
                    >
                      <option value="all">全球开放</option>
                      <option value="region">区域限制</option>
                      <option value="private">私有</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">版税比例 (%)</label>
                    <input
                      type="number"
                      value={config.royalty}
                      onChange={(e) => updateConfig(config.key, 'royalty', Number(e.target.value))}
                      className="w-full p-2 rounded border border-stone-300 bg-white"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">授权期限</label>
                    <select
                      value={config.duration}
                      onChange={(e) => updateConfig(config.key, 'duration', e.target.value)}
                      className="w-full p-2 rounded border border-stone-300 bg-white"
                    >
                      <option value="perpetual">永久</option>
                      <option value="1year">1年</option>
                      <option value="5years">5年</option>
                      <option value="10years">10年</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleSave(config.key)}
                    className="btn-primary w-full"
                  >
                    保存配置
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div className="mt-8 card">
            <h3 className="text-lg font-bold mb-4">变更历史</h3>
            <div className="space-y-2">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-stone-50 rounded">
                  <div>
                    <div className="font-medium">{h.action} — {h.right}</div>
                    <div className="text-sm text-[#6b6b6b]">{h.detail}</div>
                  </div>
                  <div className="text-sm text-[#9a9a9a]">{h.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
