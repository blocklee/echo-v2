import { useState, useCallback, useRef } from 'react';
import { Contract, keccak256, solidityPacked } from 'ethers';
import { CONTRACTS } from '../contracts/config';
import { AGENTJURY_ABI } from '../contracts/abi';

const { AgentJury } = CONTRACTS;

export function useCase(signer) {
  const [currentCase, setCurrentCase] = useState(null);
  const [commitments, setCommitments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const processingRef = useRef(false);

  const loadCase = useCallback(async (caseId) => {
    if (!signer) { setError('Wallet not connected'); return; }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const caseData = await jury.getCase(caseId);
      const [evidenceHash, commitDeadline, revealDeadline, state, commitCount, revealCount, jurorCount, resolved, appealed] = caseData;
      setCurrentCase({
        caseId,
        evidenceHash,
        commitDeadline: Number(commitDeadline),
        revealDeadline: Number(revealDeadline),
        state: Number(state),
        commitCount: Number(commitCount),
        revealCount: Number(revealCount),
        jurorCount: Number(jurorCount),
        resolved,
        appealed,
      });
    } catch (err) {
      console.error('Failed to load case:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [signer]);

  const commitVote = useCallback(async (caseId, vote, salt) => {
    if (!signer) { setError('Wallet not connected'); return; }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const address = await signer.getAddress();
      const commitHash = keccak256(solidityPacked(['bool', 'uint256', 'uint256', 'address'], [vote, BigInt(salt), caseId, address]));
      const tx = await jury.juryCommit(caseId, commitHash, BigInt(salt));
      const receipt = await tx.wait();
      setCommitments(prev => ({ ...prev, [caseId]: commitHash }));
      return receipt;
    } catch (err) {
      console.error('Commit failed:', err);
      setError(err.message || 'Commit failed');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [signer]);

  const revealVote = useCallback(async (caseId, vote, salt) => {
    if (!signer) { setError('Wallet not connected'); return; }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const tx = await jury.juryReveal(caseId, vote, BigInt(salt));
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Reveal failed:', err);
      setError(err.message || 'Reveal failed');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [signer]);

  const finalizeCase = useCallback(async (caseId) => {
    if (!signer) { setError('Wallet not connected'); return; }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const tx = await jury.finalizeCase(caseId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Finalize failed:', err);
      setError(err.message || 'Finalize failed');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [signer]);

  return {
    currentCase, commitments, loading, error,
    loadCase, commitVote, revealVote, finalizeCase,
  };
}