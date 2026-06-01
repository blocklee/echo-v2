export default function JingPage() {
  const phases = [
    { name: '纳相', desc: '争议受理', active: true },
    { name: '展相', desc: '证据展示', active: false },
    { name: '照相', desc: '观点对照', active: false },
    { name: '议相', desc: '群体审议', active: false },
    { name: '决相', desc: '共识裁决', active: false },
    { name: '映相', desc: '结果映现', active: false },
  ];
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">境 — 争议之势</h1>
        <p className="text-neutral-400 mb-8">此处展示六相动态与势位流转，案由如川，共识如流。</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {phases.map((p, i) => (
            <div key={i} className={`card transition-all duration-300 hover:border-emerald-700/50 ${p.active ? 'border-emerald-600/50 bg-emerald-950/20' : ''}`}>
              <div className="text-lg font-bold mb-1">{p.name}</div>
              <div className="text-sm text-neutral-400">{p.desc}</div>
              <div className="mt-2 text-xs text-emerald-400">{p.active ? '进行中' : '待开启'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
