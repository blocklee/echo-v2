import { useState, useEffect } from 'react';
import { Contract, keccak256, solidityPacked } from 'ethers';
import { CONTRACTS } from '../contracts/config';
import { AGENTJURY_ABI } from '../contracts/abi';

const { AgentJury } = CONTRACTS;

export function useCase(signer) {
  const [currentCase, setCurrentCase] = useState(null);
  const [commitments, setCommitments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load case info
  const loadCase = async (caseId) => {
    if (!signer) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const caseData = await jury.getCase(caseId);
      
      const [
        evidenceHash, 
        commitDeadline, 
        revealDeadline, 
        state, 
        commitCount, 
        revealCount, 
        jurorCount, 
        resolved, 
        appealed
      ] = caseData;

      setCurrentCase({
        caseId,
        evidenceHash,
        commitDeadline: Number(commitDeadline),
        revealDeadline: Number(revealDeadline),
        state: Number(state), // 0=COMMIT, 1=REVEAL, 2=RESOLVED
        commitCount: Number(commitCount),
        revealCount: Number(revealCount),
        jurorCount: Number(jurorCount),
        resolved,
        appealed,
      });

      console.log('Case loaded:', caseId, 'State:', Number(state), 'CommitCount:', Number(commitCount), 'RevealCount:', Number(revealCount));

    } catch (err) {
      console.error('Failed to load case:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  // Commit vote
  const commitVote = async (caseId, vote, salt) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      const address = await signer.getAddress();
      
      // Generate commit hash: keccak256(abi.encodePacked(vote, salt, caseId, sender))
      const commitHash = keccak256(
        solidityPacked(['bool', 'uint256', 'uint256', 'address'], [vote, BigInt(salt), caseId, address])
      );
      
      console.log('Committing vote:', { caseId, vote, salt, address, commitHash });
      
      const tx = await jury.juryCommit(caseId, commitHash, BigInt(salt));
      console.log('Commit tx sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Commit confirmed:', receipt.hash);
      
      return receipt;

    } catch (err) {
      console.error('Commit failed:', err);
      const errorMsg = err.message || 'Commit failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reveal vote
  const revealVote = async (caseId, vote, salt) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      
      console.log('Revealing vote:', { caseId, vote, salt });
      
      const tx = await jury.juryReveal(caseId, vote, BigInt(salt));
      console.log('Reveal tx sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Reveal confirmed:', receipt.hash);
      
      return receipt;

    } catch (err) {
      console.error('Reveal failed:', err);
      const errorMsg = err.message || 'Reveal failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Finalize case
  const finalizeCase = async (caseId) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const jury = new Contract(AgentJury, AGENTJURY_ABI, signer);
      
      console.log('Finalizing case:', caseId);
      
      const tx = await jury.finalizeCase(caseId);
      console.log('Finalize tx sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Finalize confirmed:', receipt.hash);
      
      return receipt;

    } catch (err) {
      console.error('Finalize failed:', err);
      const errorMsg = err.message || 'Finalize failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    currentCase,
    commitments,
    loading,
    error,
    loadCase,
    commitVote,
    revealVote,
    finalizeCase,
  };
}