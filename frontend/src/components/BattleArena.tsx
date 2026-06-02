'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ECONOMIC_PARAMS, REVENUE_SHARE, TIER_NAMES } from '../types';
import type { Battle, Deck } from '../types';

export function BattleArena() {
  const { address, provider } = useWallet();
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>(ECONOMIC_PARAMS.BET_MIN);
  const [betting, setBetting] = useState(false);
  const [battles, setBattles] = useState<Battle[]>([]);

  const handleCreateBattle = async () => {
    if (!provider || !selectedDeck) return;
    setBetting(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setBattles(prev => [{
        battleId: '0x' + Math.random().toString(16).slice(2, 34),
        player1: address,
        player2: '0x0000000000000000000000000000000000000000',
        deck1: selectedDeck,
        deck2: '',
        betAmount,
        winner: '',
        revenuePool: String(Number(betAmount) * 2),
        distributed: false,
        createdAt: Date.now(),
        endedAt: 0,
      }, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setBetting(false);
    }
  };

  const formatAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '等待对手...';

  return (
    <div className="p-4 border border-[#d4c5b0] rounded-lg bg-[#faf9f7]">
      <h2 className="text-lg font-medium mb-4 text-[#2a2522]">对战竞技场</h2>

      <div className="mb-4 p-3 bg-[#f5f3ef] rounded text-sm text-[#6b5f56]">
        <div className="flex justify-between mb-1">
          <span>投注范围</span>
          <span className="font-medium">{ECONOMIC_PARAMS.BET_MIN} ~ {ECONOMIC_PARAMS.BET_MAX} MEER</span>
        </div>
        <div className="flex justify-between">
          <span>分账规则</span>
          <span className="font-medium">创作者 45% | 编排者 25%</span>
        </div>
      </div>

      <div className="mb-3 space-y-3">
        <div>
          <label className="block text-sm text-[#6b5f56] mb-1">选择牌组</label>
          <select
            value={selectedDeck}
            onChange={e => setSelectedDeck(e.target.value)}
            className="w-full px-3 py-2 border border-[#d4c5b0] rounded text-sm bg-white focus:outline-none focus:border-[#2a2522]"
          >
            <option value="">— 选择牌组 —</option>
            {myDecks.map(d => (
              <option key={d.deckId} value={d.deckId}>{d.name || d.deckId.slice(0, 8)} (⚡{d.totalPotential})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#6b5f56] mb-1">投注金额 (MEER)</label>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            min={ECONOMIC_PARAMS.BET_MIN}
            max={ECONOMIC_PARAMS.BET_MAX}
            step="0.1"
            className="w-full px-3 py-2 border border-[#d4c5b0] rounded text-sm bg-white focus:outline-none focus:border-[#2a2522]"
          />
        </div>
      </div>

      <button
        onClick={handleCreateBattle}
        disabled={!address || !selectedDeck || betting}
        className="w-full py-2.5 bg-[#2a2522] text-white rounded hover:bg-[#3d3632] transition-colors disabled:opacity-50 text-sm"
      >
        {betting ? '发起中...' : `创建对战 (投注 ${betAmount} MEER)`}
      </button>

      {battles.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-[#6b5f56]">进行中的对战 ({battles.length})</h3>
          {battles.map(b => (
            <div key={b.battleId} className="p-3 border border-[#d4c5b0] rounded bg-white">
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#8b7a6b]">
                  {formatAddress(b.player1)} vs {formatAddress(b.player2)}
                </div>
                <div className="text-sm font-medium text-[#2a2522]">{b.betAmount} MEER</div>
              </div>
              <div className="mt-1 text-xs text-[#8b7a6b]">
                奖池: {b.revenuePool} MEER | {b.distributed ? '已分账' : '待分账'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}