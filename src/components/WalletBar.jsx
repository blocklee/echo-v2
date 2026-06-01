import { useWallet } from '../hooks/useWallet';

export default function WalletBar() {
  const { address, balance, connecting, error, connect, disconnect, isConnected } = useWallet();
  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-400">{balance?.toFixed(4)} MEER</span>
        <span className="font-mono text-sm">{address.slice(0,6)}...{address.slice(-4)}</span>
        <button onClick={disconnect} className="text-xs bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-700">断开</button>
      </div>
    );
  }
  return (
    <button onClick={connect} disabled={connecting} className="text-xs bg-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-600">
      {connecting ? '连接中…' : '连接钱包'}
    </button>
  );
}
