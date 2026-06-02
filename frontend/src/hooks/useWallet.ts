'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('请安装 MetaMask 钱包');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      await browserProvider.send('eth_requestAccounts', []);
      const signer = await browserProvider.getSigner();
      const addr = await signer.getAddress();
      setProvider(browserProvider);
      setAddress(addr);
    } catch (e) {
      setError('连接失败: ' + (e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress('');
    setProvider(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts: unknown) => {
      if ((accounts as string[]).length === 0) {
        setAddress('');
        setProvider(null);
      }
    };
    window.ethereum.on('accountsChanged', handleAccounts);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccounts);
    };
  }, []);

  return { address, provider, connecting, error, connect, disconnect };
}