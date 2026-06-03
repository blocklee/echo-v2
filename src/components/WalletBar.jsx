import { useState, useEffect } from 'react';
import { useWalletContext } from '../contexts/WalletContext';

export default function WalletBar() {
  const { provider, address, connect, disconnect, isConnected } = useWalletContext();
  const [balance, setBalance] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!provider || !address) { setBalance(null); return; }
    provider.getBalance(address).then(b => setBalance(Number(b) / 1e18)).catch(() => setBalance(null));
  }, [provider, address]);

  const handleDisconnect = () => {
    setExiting(true);
    setTimeout(() => { setExiting(false); disconnect(); }, 250);
  };

  if (isConnected) {
    return (
      <div className={`flex items-center gap-3 transition-all duration-300 ${exiting ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
        <span className="text-sm text-[#6B665C]">{balance?.toFixed(4)} MEER</span>
        <span className="font-mono text-sm text-[#2D2A26]">{address.slice(0,6)}...{address.slice(-4)}</span>
        <button onClick={handleDisconnect} className="text-xs border border-[#E5E2DC] px-2 py-1 rounded hover:border-[#2D2A26] transition-colors text-[#6B665C] hover:text-[#2D2A26]">断开</button>
      </div>
    );
  }
  return <button onClick={connect} className="text-xs bg-[#6B9E87] text-white px-3 py-1.5 rounded hover:bg-[#5a8a76] transition-colors">连接钱包</button>;
}
