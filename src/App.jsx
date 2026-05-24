import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useCase } from './hooks/useCase';
import { CONTRACTS } from './contracts/config';

function App() {
  const [caseId, setCaseId] = useState('');
  const [vote, setVote] = useState(true);
  const [salt, setSalt] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const { address, balance, connecting, error: walletError, connect, disconnect, isConnected, signer } = useWallet();

  const { currentCase, loading: caseLoading, error: caseError, loadCase, commitVote, revealVote, finalizeCase } = useCase(signer);

  const handleCommit = async () => {
    if (!caseId || !salt) { setTxStatus('error: Missing caseId or salt'); return; }
    try {
      setTxStatus('committing...');
      const receipt = await commitVote(Number(caseId), vote, Number(salt));
      setTxStatus('committed');
      setTxHash(receipt.hash);
    } catch (err) {
      setTxStatus('error: ' + err.message);
    }
  };

  const handleReveal = async () => {
    if (!caseId || !salt) { setTxStatus('error: Missing caseId or salt'); return; }
    try {
      setTxStatus('revealing...');
      const receipt = await revealVote(Number(caseId), vote, Number(salt));
      setTxStatus('revealed');
      setTxHash(receipt.hash);
    } catch (err) {
      setTxStatus('error: ' + err.message);
    }
  };

  const handleFinalize = async () => {
    if (!caseId) { setTxStatus('error: Missing caseId'); return; }
    try {
      setTxStatus('finalizing...');
      const receipt = await finalizeCase(Number(caseId));
      setTxStatus('finalized');
      setTxHash(receipt.hash);
    } catch (err) {
      setTxStatus('error: ' + err.message);
    }
  };

  const getStateLabel = (s) => ['COMMIT_OPEN','REVEAL_OPEN','RESOLVED'][s] || 'UNKNOWN';
  const getStateClass = (s) => ['status-commit','status-reveal','status-resolved'][s] || 'bg-neutral-700';

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ECHO v0.4</h1>
          <p className="text-neutral-400">Qitmeer Blockchain Dispute Resolution</p>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              {isConnected ? (
                <div>
                  <p className="text-lg font-mono">{address}</p>
                  <p className="text-neutral-400">{balance?.toFixed(4)} MEER</p>
                </div>
              ) : <p className="text-neutral-400">Not connected</p>}
            </div>
            {!isConnected ? (
              <button onClick={connect} disabled={connecting} className="btn-primary">
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <button onClick={disconnect} className="btn-primary">Disconnect</button>
            )}
          </div>
          {walletError && <p className="text-red-400 mt-3">{walletError}</p>}
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Case Operations</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Case ID</label>
              <input type="number" value={caseId} onChange={(e) => setCaseId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Salt (number)</label>
              <input type="number" value={salt} onChange={(e) => setSalt(e.target.value)}
                placeholder="123456"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-neutral-400 mb-1">Vote</label>
            <div className="flex gap-3">
              <button onClick={() => setVote(true)} className={`px-4 py-2 rounded ${vote ? 'bg-green-700' : 'bg-neutral-700'}`}>Approve</button>
              <button onClick={() => setVote(false)} className={`px-4 py-2 rounded ${!vote ? 'bg-red-700' : 'bg-neutral-700'}`}>Reject</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => caseId && loadCase(Number(caseId))} className="btn-primary">Load Case</button>
            <button onClick={handleCommit} className="btn-commit" disabled={!isConnected || caseLoading}>Commit</button>
            <button onClick={handleReveal} className="btn-reveal" disabled={!isConnected || caseLoading}>Reveal</button>
            <button onClick={handleFinalize} className="btn-primary" disabled={!isConnected || caseLoading}>Finalize</button>
          </div>
          {txStatus && (
            <div className={`mt-4 p-3 rounded ${txStatus.startsWith('error') ? 'bg-red-900' : 'bg-green-900'}`}>
              <p>{txStatus}</p>
              {txHash && <p className="text-sm text-neutral-400 mt-1">Tx: {txHash}</p>}
            </div>
          )}
          {caseError && <p className="text-red-400 mt-3">{caseError}</p>}
        </div>

        {currentCase && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Case #{currentCase.caseId}</h2>
              <span className={`status-badge ${getStateClass(currentCase.state)}`}>{getStateLabel(currentCase.state)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-neutral-400">Commit Deadline</p><p className="font-mono">{currentCase.commitDeadline}</p></div>
              <div><p className="text-sm text-neutral-400">Reveal Deadline</p><p className="font-mono">{currentCase.revealDeadline}</p></div>
              <div><p className="text-sm text-neutral-400">Commits / Reveals</p><p className="font-mono">{currentCase.commitCount} / {currentCase.revealCount}</p></div>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Contract Addresses</h2>
          <div className="space-y-2">
            {Object.entries(CONTRACTS).map(([name, addr]) => (
              <div key={name} className="flex justify-between"><span className="text-neutral-400">{name}</span><span className="font-mono text-sm">{addr}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;