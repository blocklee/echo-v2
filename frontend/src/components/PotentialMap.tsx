'use client';

import { TIER_NAMES, TIER_BOUNDARIES, TIER_MULTIPLIERS } from '../types';
import type { Card } from '../types';

interface PotentialMapProps {
  cards: Card[];
}

export function PotentialMap({ cards }: PotentialMapProps) {
  const getTierColor = (tier: number) => {
    const colors = ['#a8937a', '#c0c0c0', '#ffd700', '#e5e4e2', '#b9f2ff', '#9966cc'];
    return colors[tier - 1] || colors[0];
  };

  return (
    <div className="p-4 border border-[#d4c5b0] rounded-lg bg-[#faf9f7]">
      <h2 className="text-lg font-medium mb-1 text-[#2a2522]">势位地图</h2>
      <p className="text-xs text-[#8b7a6b] mb-4">卡牌按势位档位分布</p>

      <div className="mb-4">
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          {TIER_NAMES.map((name, i) => (
            <div
              key={name}
              className="flex-1 rounded-full"
              style={{ backgroundColor: getTierColor(i + 1) }}
              title={name}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[#8b7a6b]">
          {TIER_BOUNDARIES.slice(0, -1).map((b, i) => (
            <span key={i}>{b}+</span>
          ))}
          <span>最高</span>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#8b7a6b]">
          暂无卡牌数据
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {cards
            .sort((a, b) => b.potential - a.potential)
            .map(card => (
              <div
                key={card.nodeId}
                className="flex items-center gap-3 p-2 rounded border border-[#d4c5b0] bg-white hover:border-[#2a2522] transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getTierColor(card.tier) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#2a2522] truncate">{card.name}</div>
                  <div className="text-[10px] text-[#8b7a6b]">
                    {TIER_NAMES[card.tier - 1]} · 权重 {TIER_MULTIPLIERS[card.tier - 1]}x
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-[#2a2522]">{card.potential}</div>
                  <div className="text-[10px] text-[#8b7a6b]">势位</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}