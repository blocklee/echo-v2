'use client';

import { useState } from 'react';

// 64卦基本信息（简化版：卦名 + 卦象）
const HEXAGRAMS = [
  { id: 1, name: '乾', gua: '☰', lines: [1,1,1,1,1,1] },
  { id: 2, name: '坤', gua: '☷', lines: [0,0,0,0,0,0] },
  { id: 3, name: '屯', gua: '☳', lines: [0,0,0,1,0,1] },
  { id: 4, name: '蒙', gua: '☱', lines: [1,0,1,0,0,0] },
  { id: 5, name: '需', gua: '☰', lines: [0,0,1,1,1,0] },
  { id: 6, name: '讼', gua: '☰', lines: [1,1,1,0,0,1] },
  { id: 7, name: '师', gua: '☷', lines: [0,1,0,0,0,1] },
  { id: 8, name: '比', gua: '☷', lines: [1,0,0,1,1,1] },
  { id: 9, name: '小畜', gua: '☰', lines: [0,1,1,1,0,1] },
  { id: 10, name: '履', gua: '☱', lines: [1,0,1,1,1,0] },
  { id: 11, name: '泰', gua: '☰', lines: [0,0,0,1,1,1] },
  { id: 12, name: '否', gua: '☱', lines: [1,1,1,0,0,0] },
  { id: 13, name: '同人', gua: '☰', lines: [1,1,0,1,1,1] },
  { id: 14, name: '大有', gua: '☱', lines: [1,1,1,1,0,0] },
  { id: 15, name: '谦', gua: '☷', lines: [0,0,1,0,0,1] },
  { id: 16, name: '豫', gua: '☳', lines: [0,1,0,1,1,1] },
  { id: 17, name: '随', gua: '☱', lines: [1,0,1,1,0,1] },
  { id: 18, name: '蛊', gua: '☴', lines: [0,1,0,1,1,0] },
  { id: 19, name: '临', gua: '☰', lines: [0,0,1,0,1,1] },
  { id: 20, name: '观', gua: '☴', lines: [1,1,0,1,0,0] },
  { id: 21, name: '噬嗑', gua: '☳', lines: [1,0,1,0,1,1] },
  { id: 22, name: '贲', gua: '☱', lines: [1,1,0,0,1,0] },
  { id: 23, name: '剥', gua: '☷', lines: [0,0,0,0,1,0] },
  { id: 24, name: '复', gua: '☰', lines: [1,0,0,0,0,0] },
  { id: 25, name: '无妄', gua: '☳', lines: [1,0,1,1,1,0] },
  { id: 26, name: '大畜', gua: '☰', lines: [0,1,1,0,0,0] },
  { id: 27, name: '颐', gua: '☳', lines: [0,1,0,0,1,0] },
  { id: 28, name: '大过', gua: '☱', lines: [1,0,1,1,1,1] },
  { id: 29, name: '坎', gua: '☵', lines: [0,1,0,0,1,0] },
  { id: 30, name: '离', gua: '☲', lines: [1,0,1,1,0,1] },
  { id: 31, name: '咸', gua: '☱', lines: [1,0,1,1,0,0] },
  { id: 32, name: '恒', gua: '☳', lines: [0,1,0,1,1,1] },
  { id: 33, name: '遁', gua: '☱', lines: [1,1,0,0,0,1] },
  { id: 34, name: '大壮', gua: '☰', lines: [0,0,1,1,1,1] },
  { id: 35, name: '晋', gua: '☲', lines: [1,0,1,0,0,0] },
  { id: 36, name: '明夷', gua: '☱', lines: [0,0,0,1,0,1] },
  { id: 37, name: '家人', gua: '☲', lines: [0,1,1,0,1,1] },
  { id: 38, name: '睽', gua: '☱', lines: [1,1,0,1,0,1] },
  { id: 39, name: '蹇', gua: '☵', lines: [0,1,0,0,1,1] },
  { id: 40, name: '解', gua: '☵', lines: [1,1,0,0,1,0] },
  { id: 41, name: '损', gua: '☱', lines: [1,1,0,1,0,0] },
  { id: 42, name: '益', gua: '☰', lines: [0,0,1,0,1,1] },
  { id: 43, name: '夬', gua: '☱', lines: [1,1,1,1,1,0] },
  { id: 44, name: '姤', gua: '☰', lines: [0,1,1,1,0,1] },
  { id: 45, name: '萃', gua: '☷', lines: [1,0,0,1,1,0] },
  { id: 46, name: '升', gua: '☴', lines: [0,0,0,1,0,1] },
  { id: 47, name: '困', gua: '☵', lines: [1,0,0,1,0,0] },
  { id: 48, name: '井', gua: '☵', lines: [0,1,0,1,0,1] },
  { id: 49, name: '革', gua: '☱', lines: [1,0,1,0,1,1] },
  { id: 50, name: '鼎', gua: '☲', lines: [0,1,1,0,1,0] },
  { id: 51, name: '震', gua: '☳', lines: [0,1,0,0,0,1] },
  { id: 52, name: '艮', gua: '☶', lines: [1,0,0,1,0,0] },
  { id: 53, name: '渐', gua: '☴', lines: [0,1,1,0,0,1] },
  { id: 54, name: '归妹', gua: '☱', lines: [1,0,1,0,0,1] },
  { id: 55, name: '丰', gua: '☳', lines: [1,0,1,1,0,1] },
  { id: 56, name: '旅', gua: '☲', lines: [0,1,0,1,0,0] },
  { id: 57, name: '巽', gua: '☴', lines: [0,1,0,1,0,0] },
  { id: 58, name: '兑', gua: '☱', lines: [1,0,1,1,0,1] },
  { id: 59, name: '涣', gua: '☴', lines: [0,0,0,1,0,1] },
  { id: 60, name: '节', gua: '☵', lines: [1,1,0,0,0,1] },
  { id: 61, name: '中孚', gua: '☱', lines: [1,0,1,0,0,1] },
  { id: 62, name: '小过', gua: '☶', lines: [0,1,0,0,1,0] },
  { id: 63, name: '既济', gua: '☵', lines: [1,0,1,0,1,0] },
  { id: 64, name: '未济', gua: '☵', lines: [0,1,0,1,0,1] },
];

// 计算卦的熵值（信息论视角）
function calcHexagramEntropy(lines: number[]): number {
  // 熵：阳爻(1)阴爻(0)分布的不确定性
  const ones = lines.filter(l => l === 1).length;
  const zeros = lines.length - ones;
  const p1 = ones / lines.length;
  const p0 = zeros / lines.length;
  if (p1 === 0 || p0 === 0) return 0; // 纯卦熵为0
  return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
}

// 互信息估算（基于上下卦组合）
function calcMutualInfo(hex: typeof HEXAGRAMS[0]): { mi: number; label: string } {
  // 上卦三爻 + 下卦三爻
  const upper = hex.lines.slice(0, 3);
  const lower = hex.lines.slice(3, 6);
  
  // 简化：互信息与阴阳比例差异相关
  const upperOnes = upper.filter(l => l === 1).length;
  const lowerOnes = lower.filter(l => l === 1).length;
  
  // 差异越大，互信息越低（相对独立）
  const diff = Math.abs(upperOnes - lowerOnes);
  const mi = Math.max(0, 1 - diff / 3) * 2.585; // 最大约2.585 bit (log2 6)
  
  let label = '独立';
  if (mi > 2) label = '强协同';
  else if (mi > 1) label = '中等';
  else if (mi > 0.5) label = '弱关联';
  
  return { mi, label };
}

// 信息瓶颈分类
function getBottleneckTier(mi: number): { tier: number; color: string; desc: string } {
  if (mi > 2) return { tier: 1, color: '#c9a96e', desc: '高保真压缩' };
  if (mi > 1.5) return { tier: 2, color: '#a8c5b5', desc: '均衡压缩' };
  if (mi > 1) return { tier: 3, color: '#8faa96', desc: '低熵保留' };
  return { tier: 4, color: '#b5a89a', desc: '高压缩比' };
}

export function HexagramInfoTheory() {
  const [selectedHex, setSelectedHex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'entropy' | 'mi'>('entropy');

  const sortedHexagrams = [...HEXAGRAMS].map(h => {
    const entropy = calcHexagramEntropy(h.lines);
    const { mi, label } = calcMutualInfo(h);
    const bt = getBottleneckTier(mi);
    return { ...h, entropy, mi, miLabel: label, ...bt };
  }).sort((a, b) => sortBy === 'entropy' ? b.entropy - a.entropy : b.mi - a.mi);

  const selected = selectedHex ? sortedHexagrams.find(h => h.id === selectedHex) : null;

  return (
    <div className="p-4 border border-[#d4c5b0] rounded-lg bg-[#faf9f7]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-[#2a2522]">信息论视角 · 64卦气候态</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('entropy')}
            className={`px-3 py-1 text-sm rounded ${sortBy === 'entropy' ? 'bg-[#c9a96e] text-white' : 'bg-[#f5f3ef] text-[#6b5f56]'}`}
          >
            按熵排序
          </button>
          <button
            onClick={() => setSortBy('mi')}
            className={`px-3 py-1 text-sm rounded ${sortBy === 'mi' ? 'bg-[#c9a96e] text-white' : 'bg-[#f5f3ef] text-[#6b5f56]'}`}
          >
            按互信息排序
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex gap-4 mb-4 text-xs text-[#6b5f56]">
        <span>🟤 高保真压缩</span>
        <span>🟢 均衡压缩</span>
        <span>🟡 低熵保留</span>
        <span>⚪ 高压缩比</span>
      </div>

      {/* 64卦网格 */}
      <div className="grid grid-cols-8 gap-1 mb-4">
        {sortedHexagrams.map(h => (
          <button
            key={h.id}
            onClick={() => setSelectedHex(h.id === selectedHex ? null : h.id)}
            className={`
              relative p-1 rounded text-center text-xs transition-all
              ${h.id === selectedHex ? 'ring-2 ring-[#c9a96e]' : ''}
              ${h.tier === 1 ? 'bg-[#f0e6d3] border border-[#c9a96e]' : ''}
              ${h.tier === 2 ? 'bg-[#e8f0eb] border border-[#a8c5b5]' : ''}
              ${h.tier === 3 ? 'bg-[#f5f5f0] border border-[#8faa96]' : ''}
              ${h.tier === 4 ? 'bg-[#f7f4f0] border border-[#b5a89a]' : ''}
            `}
            title={`${h.name} | 熵:${h.entropy.toFixed(2)} | MI:${h.mi.toFixed(2)}(${h.miLabel})`}
          >
            <div className="text-lg">{h.gua}</div>
            <div className="text-[10px]">{h.name}</div>
          </button>
        ))}
      </div>

      {/* 选中详情 */}
      {selected && (
        <div className="p-3 bg-[#f5f3ef] rounded">
          <div className="text-center mb-3">
            <span className="text-3xl">{selected.gua}</span>
            <span className="ml-2 text-lg font-medium text-[#2a2522]">{selected.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-white rounded">
              <div className="text-xs text-[#6b5f56]">熵</div>
              <div className="font-medium text-[#2a2522]">{selected.entropy.toFixed(3)} bit</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="text-xs text-[#6b5f56]">互信息</div>
              <div className="font-medium text-[#2a2522]">{selected.mi.toFixed(3)} bit</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="text-xs text-[#6b5f56]">压缩类型</div>
              <div className="font-medium text-[#2a2522]">{selected.desc}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#6b5f56] text-center">
            上卦: {selected.lines.slice(0,3).join('')} | 下卦: {selected.lines.slice(3,6).join('')} | {selected.miLabel}
          </div>
        </div>
      )}

      {/* 统计摘要 */}
      <div className="mt-3 text-xs text-[#6b5f56] flex justify-between">
        <span>平均熵: {(sortedHexagrams.reduce((s,h) => s + h.entropy, 0) / 64).toFixed(3)} bit</span>
        <span>平均互信息: {(sortedHexagrams.reduce((s,h) => s + h.mi, 0) / 64).toFixed(3)} bit</span>
        <span>纯卦(乾/坤)熵=0</span>
      </div>
    </div>
  );
}