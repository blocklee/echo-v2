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
        <span className="text-sm text-neutral-400">{balance?.toFixed(4)} MEER</span>
        <span className="font-mono text-sm">{address.slice(0,6)}...{address.slice(-4)}</span>
        <button onClick={handleDisconnect} className="text-xs bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-700 transition-colors">断开</button>
      </div>
    );
  }
  return <button onClick={connect} className="text-xs bg-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-600">连接钱包</button>;
}
