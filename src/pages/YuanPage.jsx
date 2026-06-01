import { useState } from 'react';

export default function YuanPage() {
  const [selectedWork, setSelectedWork] = useState(null);

  const MOCK_WORKS = [
    { id: 1, name: 'Echo Protocol 白皮书', version: 'v1.0', status: 'locked', milestone: '创世发布', lockedAt: '2026-05-20' },
    { id: 2, name: 'DAO 治理框架', version: 'v2.1', status: 'evolving', milestone: '社区共识', lockedAt: '2026-05-25' },
    { id: 3, name: 'AgentJury 合约', version: 'v0.4', status: 'locked', milestone: '测试网部署', lockedAt: '2026-05-28' },
    { id: 4, name: '经济模型', version: 'v1.2', status: 'evolving', milestone: '参数调优', lockedAt: '2026-05-30' },
  ];

  const MOCK_VERSION_TREE = [
    { version: 'v1.0', author: '创始团队', date: '2026-05-20', note: '协议定义', branch: 'main' },
    { version: 'v1.1', author: '社区', date: '2026-05-22', note: '治理优化', branch: 'main' },
    { version: 'v2.0', author: '核心组', date: '2026-05-25', note: '重大升级', branch: 'main' },
    { version: 'v2.1', author: '贡献者', date: '2026-05-27', note: 'Bug修复', branch: 'hotfix' },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-[#1a1a1a]">源 — 贡献之源</h1>
        <p className="text-[#6b6b6b] mb-8">此处展示贡献者与作品源，源流汇聚，共创未来。</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">作品列表</h2>
            <div className="space-y-3">
              {MOCK_WORKS.map((work) => (
                <div
                  key={work.id}
                  className={`p-4 rounded border transition-all cursor-pointer ${
                    selectedWork?.id === work.id
                      ? 'border-[#c45c48] bg-[#faf9f7]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                  onClick={() => setSelectedWork(work)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{work.name}</div>
                      <div className="text-sm text-[#6b6b6b]">版本: {work.version}</div>
                    </div>
                    <span className={`status-badge ${
                      work.status === 'locked' ? 'status-resolved' : 'status-commit'
                    }`}>
                      {work.status === 'locked' ? '已锁定' : '演进中'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[#6b6b6b]">
                    里程碑: {work.milestone} | 锁定于: {work.lockedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">版本树</h2>
            <div className="space-y-4">
              {MOCK_VERSION_TREE.map((v, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3b5998] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {v.version}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{v.note}</div>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-600">
                        {v.branch}
                      </span>
                    </div>
                    <div className="text-sm text-[#6b6b6b]">
                      {v.author} · {v.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 card">
          <h2 className="text-xl font-bold mb-4">里程碑时间线</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stone-200" />
            <div className="space-y-6">
              {MOCK_WORKS.map((work, i) => (
                <div key={work.id} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                    work.status === 'locked' ? 'bg-[#c45c48] text-white' : 'bg-[#3b5998] text-white'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium">{work.milestone}</div>
                    <div className="text-sm text-[#6b6b6b]">{work.name} · {work.lockedAt}</div>
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
