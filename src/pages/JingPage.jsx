import { useRef, useEffect, useState } from 'react';

export default function JingPage() {
  const canvasRef = useRef(null);
  const [activePhase, setActivePhase] = useState(0);

  const phases = [
    { name: '纳相', desc: '争议受理', en: 'NAXIANG' },
    { name: '展相', desc: '证据展示', en: 'ZHANXIANG' },
    { name: '照相', desc: '观点对照', en: 'ZHAOXIANG' },
    { name: '议相', desc: '群体审议', en: 'YIXIANG' },
    { name: '决相', desc: '共识裁决', en: 'JUEXIANG' },
    { name: '映相', desc: '结果映现', en: 'YINGXIANG' },
  ];

  // 模拟六相心电图动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animId;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // 画淡墨网格线
      ctx.strokeStyle = 'rgba(26,26,26,0.06)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (i / 6) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 画六条相位波动线
      phases.forEach((p, i) => {
        const y = (i + 0.5) * (h / 6);
        const isActive = i === activePhase;
        ctx.beginPath();
        ctx.strokeStyle = isActive ? '#c45c48' : 'rgba(26,26,26,0.15)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let x = 0; x < w; x += 2) {
          const t = (x + frame * 2) * 0.015;
          const amp = isActive ? 10 : 3;
          const freq = isActive ? 5 : 2;
          const noise = Math.sin(t * freq + i * 1.3) * amp
                      + Math.sin(t * freq * 2.1) * (amp * 0.4)
                      + (Math.random() - 0.5) * (isActive ? 2 : 0.5);
          ctx.lineTo(x, y + noise);
        }
        ctx.stroke();

        // 当前相位标记点
        if (isActive) {
          const cx = (w / 2) + Math.sin(frame * 0.05) * (w * 0.3);
          const cy = y + Math.sin(frame * 0.08) * 6;
          ctx.beginPath();
          ctx.fillStyle = '#c45c48';
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
          // 光晕
          ctx.beginPath();
          ctx.fillStyle = 'rgba(196,92,72,0.15)';
          ctx.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [activePhase]);

  // 自动流转相位（3秒一换）
  useEffect(() => {
    const id = setInterval(() => {
      setActivePhase((prev) => (prev + 1) % phases.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* 顶部标题与边版本约束 */}
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">
            境
          </h1>
          <span className="text-xs text-[#c45c48] font-mono border border-[#c45c48]/40 px-2 py-1 rounded">
            边版本约束 Alpha-7
          </span>
        </div>
        <p className="text-[#4a4a4a] mb-8 text-sm leading-relaxed">
          六相周流，如川不息。争议之势，纳于纳相，终于映相。
        </p>

        {/* 心电图 Canvas */}
        <div className="relative w-full h-56 mb-8 bg-[#faf9f7] border border-[#e5e2dc] rounded-lg overflow-hidden shadow-sm">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-3 left-3 text-[10px] text-[#8a8a8a] font-mono tracking-wider">
            LIVE 六相心电图
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-[#8a8a8a] font-mono">
            {phases[activePhase].name} · {phases[activePhase].en}
          </div>
        </div>

        {/* 六相面板 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {phases.map((p, i) => (
            <div
              key={i}
              onClick={() => setActivePhase(i)}
              className={`rounded-lg p-5 border transition-all duration-500 cursor-pointer select-none
                ${i === activePhase
                  ? 'border-[#c45c48] bg-[#c45c48]/5 shadow-sm'
                  : 'border-[#e5e2dc] bg-[#faf9f7] hover:border-[#4a4a4a]/30'
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-bold text-[#1a1a1a]">{p.name}</div>
                <div className="text-[10px] font-mono text-[#8a8a8a]">{p.en}</div>
              </div>
              <div className="text-sm text-[#4a4a4a]">{p.desc}</div>
              <div
                className={`mt-3 text-xs font-medium flex items-center gap-1
                  ${i === activePhase ? 'text-[#c45c48]' : 'text-[#8a8a8a]'}`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${i === activePhase ? 'bg-[#c45c48]' : 'bg-[#8a8a8a]'}`} />
                {i === activePhase ? '当前相位' : '待开启'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
