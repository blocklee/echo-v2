'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { ECONOMIC_PARAMS, TIER_NAMES, TIER_MULTIPLIERS } from '../types';
import type { Card, Quadrant } from '../types';

const QUADRANT_LABELS = {
  usage: ['私密', '社群', '开放'],
  derive: ['封闭', '条件', '开放'],
  expand: ['锁定', '条件', '自由'],
  benefit: ['免费', '按次', '分成'],
};

export function CardMinter() {
  const { address, provider } = useWallet();
  const [minting, setMinting] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [quadrant, setQuadrant] = useState<Quadrant>({
    usage: 1,
    derive: 1,
    expand: 2,
    benefit: 1,
  });
  const [txHash, setTxHash] = useState('');

  const handleMint = async () => {
    if (!provider || !address) return;
    setMinting(true);
    setTxHash('');
    try {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString()));
      const fakeMetadataURI = `ipfs://Qm${Date.now()}`;
      // SDK would be used here with real contracts
      // For now simulate
      await new Promise(r => setTimeout(r, 1000));
      const nodeId = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(contentHash),
        ethers.toUtf8Bytes(address),
        ethers.toUtf8Bytes(Date.now().toString())
      ])).slice(0, 34);
      setCards(prev => [{
        nodeId,
        creator: address,
        contentHash,
        quadrant,
        potential: 0,
        tier: 1,
        createdAt: Date.now(),
        frozen: false,
        name: `卡牌 #${prev.length + 1}`,
      }, ...prev]);
      setTxHash('0x' + Math.random().toString(16).slice(2, 66));
    } catch (e) {
      console.error(e);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="p-4 border border-[#d4c5b0] rounded-lg bg-[#faf9f7]">
      <h2 className="text-lg font-medium mb-4 text-[#2a2522]">铸造卡牌</h2>
      
      <div className="mb-4 p-3 bg-[#f5f3ef] rounded text-sm text-[#6b5f56]">
        <div className="flex justify-between mb-1">
          <span>铸卡费</span><span className="font-medium">{ECONOMIC_PARAMS.MINT_FEE} MEER</span>
        </div>
        <div className="flex justify-between">
          <span>衍权基价</span><span className="font-medium">{ECONOMIC_PARAMS.DERIVE_BASE} MEER <span className="text-[#8b7a6b]">(首月半价)</span></span>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {(['usage', 'derive', 'expand', 'benefit'] as const).map(key => (
          <div key={key}>
            <label className="block text-sm text-[#6b5f56] mb-1">
              {['用权', '衍权', '扩权', '收益权'][['usage', 'derive', 'expand', 'benefit'].indexOf(key)]}
            </label>
            <div className="flex gap-2">
              {[0, 1, 2].map(v => (
                <button
                  key={v}
                  onClick={() => setQuadrant(q => ({ ...q, [key]: v }))}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                    quadrant[key] === v
                      ? 'bg-[#2a2522] text-white border-[#2a2522]'
                      : 'bg-white text-[#6b5f56] border-[#d4c5b0] hover:border-[#2a2522]'
                  }`}
                >
                  {QUADRANT_LABELS[key][v]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!address ? (
        <button disabled className="w-full py-2.5 bg-[#d4c5b0] text-[#6b5f56] rounded cursor-not-allowed text-sm">
          请先连接钱包
        </button>
      ) : (
        <button
          onClick={handleMint}
          disabled={minting}
          className="w-full py-2.5 bg-[#2a2522] text-white rounded hover:bg-[#3d3632] transition-colors disabled:opacity-50 text-sm"
        >
          {minting ? '铸造中...' : `铸造 (${ECONOMIC_PARAMS.MINT_FEE} MEER)`}
        </button>
      )}

      {txHash && (
        <div className="mt-3 text-xs text-[#8b7a6b] break-all">
          交易已提交: {txHash}
        </div>
      )}

      {cards.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-[#6b5f56] mb-2">我的卡牌 ({cards.length})</h3>
          <div className="space-y-2">
            {cards.map(card => (
              <div key={card.nodeId} className="p-3 border border-[#d4c5b0] rounded bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-[#2a2522]">{card.name}</span>
                    <div className="text-xs text-[#8b7a6b] mt-0.5">
                      {TIER_NAMES[card.tier - 1]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#2a2522]">{card.potential}</div>
                    <div className="text-xs text-[#8b7a6b]">势位</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  {Object.entries(card.quadrant).map(([k, v]) => (
                    <span key={k} className="text-xs px-1.5 py-0.5 bg-[#f5f3ef] text-[#6b5f56] rounded">
                      {QUADRANT_LABELS[k as keyof Quadrant][Number(v)]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}