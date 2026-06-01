import { useState, useCallback } from 'react';
import { useWalletContext } from '../contexts/WalletContext';

// 四权档位配置
const FOUR_RIGHTS = [
  { key: 'usage', label: '使用权', desc: '复制、传播、展示' },
  { key: 'derive', label: '改编权', desc: '翻译、改编、二次创作' },
  { key: 'expand', label: '衍生权', desc: '续作、外传、同人' },
  { key: 'benefit', label: '收益权', desc: '商业变现、收益分配' },
];

const LEVELS = ['禁止', '有限', '开放', '激励'];

// Mock 数据 — 后续替换为真实 API
const MOCK_CONFIGS = [
  { id: 1, name: 'Echo Protocol 白皮书', usage: 2, derive: 1, expand: 0, benefit: 3, status: 'active', updatedAt: '2026-05-28' },
  { id: 2, name: 'DAO 治理框架 v2', usage: 3, derive: 2, expand: 1, benefit: 2, status: 'active', updatedAt: '2026-05-30' },
  { id: 3, name: 'AgentJury 合约设计', usage: 1, derive: 0, expand: 0, benefit: 1, status: 'pending', updatedAt: '2026-06-01' },
];

const MOCK_HISTORY = [
  { id: 1, action: '创建配置', target: 'Echo Protocol 白皮书', user: '0x7a8b...c3d4', time: '2026-05-28 14:32' },
  { id: 2, action: '修改使用权', target: '有限 → 开放', user: '0x7a8b...c3d4', time: '2026-05-29 09:15' },
  { id: 3, action: '创建配置', target: 'DAO 治理框架 v2', user: '0x9e1f...a2b3', time: '2026-05-30 11:00' },
];

function LevelBadge({ level }) {
  const colors = ['bg-red-900/50 text-red-300', 'bg-yellow-900/50 text-yellow-300', 'bg-emerald-900/50 text-emerald-300', 'bg-blue-900/50 text-blue-300'];
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}>
      {LEVELS[level]}
    </span>
  );
}

export default function DianPage() {
  const { signer, address } = useWalletContext();
  const [configs] = useState(MOCK_CONFIGS);
  const [history] = useState(MOCK_HISTORY);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', usage: 2, derive: 1, expand: 0, benefit: 1 });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!signer) { alert('请先连接钱包'); return; }
    setSubmitting(true);
    // TODO: 调用 CreatorConfig 合约创建配置
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setShowCreate(false);
    alert('配置已创建（Mock）');
  }, [signer]);

  // 统计
  const total = configs.length;
  const active = configs.filter(c => c.status === 'active').length;
  const pending = configs.filter(c => c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">典 — 铸造之法</h1>
          <p className="text-neutral-400">AI 铸造与四权配置。铸印为信，确权为据。</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">总配置数</div>
            <div className="text-3xl font-bold text-emerald-400">{total}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">已生效</div>
            <div className="text-3xl font-bold text-emerald-400">{active}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">公示中</div>
            <div className="text-3xl font-bold text-yellow-400">{pending}</div>
          </div>
        </div>

        {/* 四权档位说明 */}
        <div className="card mb-8">
          <div className="text-sm text-emerald-400 mb-4 font-medium">四权档位体系</div>
          <div className="grid grid-cols-4 gap-4">
            {FOUR_RIGHTS.map(r => (
              <div key={r.key} className="bg-neutral-900 rounded p-4">
                <div className="text-sm font-bold mb-1">{r.label}</div>
                <div className="text-xs text-neutral-500 mb-3">{r.desc}</div>
                <div className="space-y-1">
                  {LEVELS.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${['bg-red-500','bg-yellow-500','bg-emerald-500','bg-blue-500'][i]}`} />
                      <span className="text-xs text-neutral-400">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 配置列表 + 创建按钮 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">配置列表</div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <span>+</span> 新建配置
          </button>
        </div>

        <div className="card mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-800">
                  <th className="text-left py-3 px-4">作品名称</th>
                  <th className="text-center py-3 px-2">使用权</th>
                  <th className="text-center py-3 px-2">改编权</th>
                  <th className="text-center py-3 px-2">衍生权</th>
                  <th className="text-center py-3 px-2">收益权</th>
                  <th className="text-center py-3 px-4">状态</th>
                  <th className="text-right py-3 px-4">更新</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="text-center py-3 px-2"><LevelBadge level={c.usage} /></td>
                    <td className="text-center py-3 px-2"><LevelBadge level={c.derive} /></td>
                    <td className="text-center py-3 px-2"><LevelBadge level={c.expand} /></td>
                    <td className="text-center py-3 px-2"><LevelBadge level={c.benefit} /></td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'active' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                        {c.status === 'active' ? '已生效' : '公示中'}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-neutral-400">{c.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 变更历史 */}
        <div className="text-lg font-bold mb-4">变更历史</div>
        <div className="card">
          <div className="space-y-3">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-4 py-2 border-b border-neutral-800/50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm">{h.action} — <span className="text-neutral-300">{h.target}</span></div>
                  <div className="text-xs text-neutral-500 mt-0.5">by {h.user} · {h.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 创建弹窗 */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
            <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-lg border border-neutral-800" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-bold mb-4">新建四权配置</div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 block mb-1">作品名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="输入作品名称"
                  />
                </div>
                {FOUR_RIGHTS.map(r => (
                  <div key={r.key}>
                    <label className="text-sm text-neutral-400 block mb-1">{r.label} — {r.desc}</label>
                    <div className="flex gap-2">
                      {LEVELS.map((l, i) => (
                        <button
                          key={i}
                          onClick={() => setForm({ ...form, [r.key]: i })}
                          className={`flex-1 py-2 rounded text-xs transition-colors ${
                            form[r.key] === i
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded text-sm bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.name}
                    className="flex-1 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {submitting ? '提交中...' : '确认创建'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
