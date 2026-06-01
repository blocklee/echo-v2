import { useState } from 'react';

// Mock 作品数据
const MOCK_WORKS = [
  { id: 1, name: 'Echo Protocol 白皮书', version: 'v1.0', status: 'locked', milestone: '创世发布', lockedAt: '2026-05-20' },
  { id: 2, name: 'DAO 治理框架', version: 'v2.1', status: 'evolving', milestone: '社区共识', lockedAt: '2026-05-25' },
  { id: 3, name: 'AgentJury 合约', version: 'v0.4', status: 'locked', milestone: '测试网部署', lockedAt: '2026-05-28' },
];

const MOCK_MILESTONES = [
  { id: 1, name: '创世发布', desc: '白皮书首发，四权体系确立', date: '2026-05-20', type: 'creation' },
  { id: 2, name: '社区共识', desc: '首轮 DAO 投票通过治理框架', date: '2026-05-25', type: 'vote' },
  { id: 3, name: '测试网部署', desc: 'AgentJury 合约上线测试', date: '2026-05-28', type: 'deploy' },
  { id: 4, name: '主网锁定', desc: '创世作品进入锁定态', date: '2026-06-01', type: 'lock' },
];

const VERSION_TREE = {
  id: 1,
  name: 'Echo Protocol',
  version: 'v1.0',
  children: [
    {
      id: 2, name: 'DAO 治理框架', version: 'v2.0',
      children: [
        { id: 3, name: 'AgentJury 合约', version: 'v0.4', children: [] },
      ]
    },
    {
      id: 4, name: '经济模型设计', version: 'v1.2',
      children: [
        { id: 5, name: 'ExitGas 池', version: 'v1.0', children: [] },
      ]
    },
  ]
};

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={`ml-${depth * 4}`}>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded hover:bg-neutral-900/50 cursor-pointer transition-colors"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="text-xs text-neutral-500 w-4">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <div className={`w-2 h-2 rounded-full ${hasChildren ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
        <div className="flex-1">
          <div className="text-sm font-medium">{node.name}</div>
          <div className="text-xs text-neutral-500">{node.version}</div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="ml-4 border-l border-neutral-800">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function YuanPage() {
  const [works] = useState(MOCK_WORKS);
  const [milestones] = useState(MOCK_MILESTONES);
  const [activeTab, setActiveTab] = useState('works');

  const lockedCount = works.filter(w => w.status === 'locked').length;
  const evolvingCount = works.filter(w => w.status === 'evolving').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">源 — 共鸣之场</h1>
          <p className="text-neutral-400">创世作品与版本演化。锁定为根，共鸣为枝。</p>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">作品总数</div>
            <div className="text-3xl font-bold text-emerald-400">{works.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">已锁定</div>
            <div className="text-3xl font-bold text-blue-400">{lockedCount}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-400 mb-1">演化中</div>
            <div className="text-3xl font-bold text-yellow-400">{evolvingCount}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-neutral-800">
          {[
            { key: 'works', label: '作品列表' },
            { key: 'tree', label: '版本树' },
            { key: 'milestones', label: '里程碑' },
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

        {/* 作品列表 */}
        {activeTab === 'works' && (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-800">
                    <th className="text-left py-3 px-4">作品名称</th>
                    <th className="text-center py-3 px-4">版本</th>
                    <th className="text-center py-3 px-4">状态</th>
                    <th className="text-center py-3 px-4">里程碑</th>
                    <th className="text-right py-3 px-4">锁定时间</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map(w => (
                    <tr key={w.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{w.name}</td>
                      <td className="text-center py-3 px-4 text-neutral-400">{w.version}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          w.status === 'locked'
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {w.status === 'locked' ? '已锁定' : '演化中'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 text-neutral-400">{w.milestone}</td>
                      <td className="text-right py-3 px-4 text-neutral-400">{w.lockedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 版本树 */}
        {activeTab === 'tree' && (
          <div className="card">
            <div className="text-sm text-emerald-400 mb-4 font-medium">版本演化树</div>
            <TreeNode node={VERSION_TREE} />
          </div>
        )}

        {/* 里程碑 */}
        {activeTab === 'milestones' && (
          <div className="card">
            <div className="text-sm text-emerald-400 mb-4 font-medium">里程碑时间线</div>
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={m.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      m.type === 'creation' ? 'bg-emerald-500' :
                      m.type === 'vote' ? 'bg-blue-500' :
                      m.type === 'deploy' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    {i < milestones.length - 1 && <div className="w-0.5 h-12 bg-neutral-800 mt-1" />}
                  </div>
                  <div className="pb-6">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{m.desc}</div>
                    <div className="text-xs text-neutral-500 mt-1">{m.date}</div>
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
