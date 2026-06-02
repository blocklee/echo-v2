'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { ECONOMIC_PARAMS } from '../types';
import type { Deck, Card } from '../types';

export function DeckBuilder() {
  const { address, provider } = useWallet();
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [deckName, setDeckName] = useState('');
  const [building, setBuilding] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);

  const handleCreateDeck = async () => {
    if (!provider || selectedCards.length === 0) return;
    setBuilding(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setDeck({
        deckId: '0x' + Math.random().toString(16).slice(2, 34),
        owner: address,
        cardNodeIds: selectedCards,
        weights: selectedCards.map(() => 100),
        totalPotential: myCards.filter(c => selectedCards.includes(c.nodeId)).reduce((s, c) => s + c.potential, 0),
        createdAt: Date.now(),
        name: deckName || '我的牌组',
      });
      setSelectedCards([]);
      setDeckName('');
    } catch (e) {
      console.error(e);
    } finally {
      setBuilding(false);
    }
  };

  const toggleCard = (nodeId: string) => {
    setSelectedCards(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  return (
    <div className="p-4 border border-[#d4c5b0] rounded-lg bg-[#faf9f7]">
      <h2 className="text-lg font-medium mb-4 text-[#2a2522]">牌组编排</h2>

      <div className="mb-4 p-3 bg-[#f5f3ef] rounded text-sm text-[#6b5f56]">
        <div className="flex justify-between">
          <span>编排费</span><span className="font-medium">{ECONOMIC_PARAMS.ASSEMBLY_FEE} MEER</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>最大卡数</span><span className="font-medium">30 张</span>
        </div>
      </div>

      <input
        type="text"
        value={deckName}
        onChange={e => setDeckName(e.target.value)}
        placeholder="牌组名称（选填）"
        className="w-full px-3 py-2 border border-[#d4c5b0] rounded text-sm mb-3 bg-white focus:outline-none focus:border-[#2a2522]"
      />

      <div className="mb-3">
        <div className="text-sm text-[#6b5f56] mb-2">选择卡牌（{selectedCards.length}/30）</div>
        {myCards.length === 0 ? (
          <div className="text-sm text-[#8b7a6b] text-center py-6 bg-[#f5f3ef] rounded">
            暂无卡牌，请先铸造
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {myCards.map(card => (
              <button
                key={card.nodeId}
                onClick={() => toggleCard(card.nodeId)}
                className={`p-2 rounded border text-xs text-left transition-colors ${
                  selectedCards.includes(card.nodeId)
                    ? 'bg-[#2a2522] text-white border-[#2a2522]'
                    : 'bg-white text-[#6b5f56] border-[#d4c5b0] hover:border-[#2a2522]'
                }`}
              >
                <div className="font-medium truncate">{card.name}</div>
                <div className="text-[10px] opacity-70">⚡{card.potential}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleCreateDeck}
        disabled={!address || selectedCards.length === 0 || building}
        className="w-full py-2.5 bg-[#2a2522] text-white rounded hover:bg-[#3d3632] transition-colors disabled:opacity-50 text-sm"
      >
        {building ? '编排中...' : `创建牌组 (${ECONOMIC_PARAMS.ASSEMBLY_FEE} MEER)`}
      </button>

      {deck && (
        <div className="mt-4 p-3 border border-[#d4c5b0] rounded bg-white">
          <div className="text-sm font-medium text-[#2a2522]">✅ {deck.name}</div>
          <div className="text-xs text-[#8b7a6b] mt-1">总势位: {deck.totalPotential}</div>
        </div>
      )}
    </div>
  );
}