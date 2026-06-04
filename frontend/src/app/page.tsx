'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { CardMinter } from '../components/CardMinter';
import { DeckBuilder } from '../components/DeckBuilder';
import { BattleArena } from '../components/BattleArena';
import { PotentialMap } from '../components/PotentialMap';
import { HexagramInfoTheory } from '../components/HexagramInfoTheory';
import type { Card } from '../types';

type Tab = 'mint' | 'deck' | 'battle' | 'map' | 'info';

export default function Home() {
  const { address, connecting, error, connect, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('mint');
  const [myCards, setMyCards] = useState<Card[]>([]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'mint', label: '铸造' },
    { id: 'deck', label: '编排' },
    { id: 'battle', label: '对战' },
    { id: 'map', label: '地图' },
    { id: 'info', label: '信息论' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#2D2A26]">
      {/* Header */}
      <header className="border-b border-[#E5E2DC] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">⚡ 势位之战</h1>
            <p className="text-xs text-[#6B665C]">ECHO: Battle of Potential · MVP</p>
          </div>
          <div>
            {address ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#6B665C] font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs px-3 py-1.5 border border-[#E5E2DC] rounded hover:border-[#2D2A26] transition-colors"
                >
                  断开
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="text-xs px-4 py-1.5 bg-[#2D2A26] text-[#FAF9F7] rounded hover:bg-[#3d3632] transition-colors disabled:opacity-50"
              >
                {connecting ? '连接中...' : '连接钱包'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Tab bar */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-1 border-b border-[#E5E2DC] mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#2D2A26] text-[#2D2A26] font-medium'
                  : 'border-transparent text-[#6B665C] hover:text-[#2D2A26]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-5">
        {activeTab === 'mint' && <CardMinter />}
        {activeTab === 'deck' && <DeckBuilder />}
        {activeTab === 'battle' && <BattleArena />}
        {activeTab === 'map' && <PotentialMap cards={myCards} />}
        {activeTab === 'info' && <HexagramInfoTheory />}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-[#6B665C] border-t border-[#E5E2DC] mt-8">
        ECHO: Battle of Potential · Qitmeer QNG Mainnet · MVP Build
      </footer>
    </div>
  );
}