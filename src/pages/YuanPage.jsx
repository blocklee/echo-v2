import { useState } from 'react';

export default function YuanPage() {
  const [selectedWork, setSelectedWork] = useState(null);

  const WORKS = [
    { id: 1, name: 'ECHO Protocol 白皮书', version: '壹·〇', state: '封卷', milestone: '创世', sealedAt: '乙巳年春' },
    { id: 2, name: 'DAO 治理框架', version: '贰·壹', state: '流变', milestone: '共识', sealedAt: '乙巳年春' },
    { id: 3, name: 'AgentJury 合约', version: '零·肆', state: '封卷', milestone: '测试', sealedAt: '乙巳年春' },
    { id: 4, name: '经济模型', version: '壹·贰', state: '流变', milestone: '调参', sealedAt: '乙巳年春' },
  ];

  const SOURCE_TREE = [
    { version: '壹·〇', author: '创始团队', date: '乙巳年春', note: '协议定义', branch: '本' },
    { version: '壹·壹', author: '社区', date: '乙巳年春', note: '治理优化', branch: '本' },
    { version: '贰·〇', author: '核心组', date: '乙巳年春', note: '重大升级', branch: '本' },
    { version: '贰·壹', author: '贡献者', date: '乙巳年春', note: '瑕疵修正', branch: '支' },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-8">
      <div className="max-w-5xl mx-auto">
        {/* 唐之风骨 */}
        <div className="mb-16">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-wide text-[#1a1a1a] mb-3">源</h1>
              <p className="text-[#6b6b6b] text-lg">版本如铸，源流可溯</p>
            </div>
          </div>
          <div className="mt-6 h-px bg-[#d4d0c8]" />
        </div>

        {/* 著录 — 作品列表 */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">著录</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
            <span className="text-sm text-[#9a9a9a]">{WORKS.length} 件</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {WORKS.map((work, index) => (
              <div
                key={work.id}
                onClick={() => setSelectedWork(work.id === selectedWork ? null : work.id)}
                className="group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-[#9a9a9a] font-serif">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="text-lg font-bold tracking-wide">{work.name}</h3>
                      <p className="text-sm text-[#6b6b6b] mt-1">{work.milestone}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs tracking-wider ${
                    work.state === '封卷' 
                      ? 'bg-[#c45c48] text-white' 
                      : 'border border-[#3b5998] text-[#3b5998]'
                  }`} style={{ borderRadius: '2px' }}>
                    {work.state}
                  </span>
                </div>

                {selectedWork === work.id && (
                  <div className="mt-4 pl-10">
                    <div className="h-px bg-[#e5e2dc] mb-4" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[#9a9a9a]">版本</span>
                        <p className="font-medium mt-1">{work.version}</p>
                      </div>
                      <div>
                        <span className="text-[#9a9a9a]">纪年</span>
                        <p className="font-medium mt-1">{work.sealedAt}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 h-px bg-[#e5e2dc]" />
              </div>
            ))}
          </div>
        </div>

        {/* 源流谱 — 版本树 */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">源流谱</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
          </div>

          <div className="space-y-0">
            {SOURCE_TREE.map((node, index) => (
              <div key={index} className="flex items-start gap-6 py-5 border-b border-[#e5e2dc]">
                <span className={`text-sm px-2 py-1 ${
                  node.branch === '本' 
                    ? 'text-[#c45c48]' 
                    : 'text-[#3b5998]'
                }`}>
                  {node.branch}
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline gap-4">
                    <span className="font-bold">{node.version}</span>
                    <span className="text-sm text-[#6b6b6b]">{node.note}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#9a9a9a]">
                    {node.author} · {node.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 纪年 — 里程碑 */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold tracking-wide">纪年</h2>
            <div className="flex-1 h-px bg-[#d4d0c8]" />
          </div>

          <div className="relative">
            {/* 竖线 */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#d4d0c8]" />
            
            <div className="space-y-8">
              {WORKS.map((work, index) => (
                <div key={work.id} className="flex items-start gap-6 pl-10 relative">
                  <div className="absolute left-2 top-2 w-3 h-3 rounded-full bg-[#c45c48]" />
                  <div>
                    <div className="font-bold">{work.milestone}</div>
                    <div className="text-sm text-[#6b6b6b] mt-1">{work.name}</div>
                    <div className="text-xs text-[#9a9a9a] mt-1">{work.sealedAt}</div>
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
