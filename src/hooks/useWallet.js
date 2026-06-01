import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { CONTRACTS, CHAIN_ID, CHAIN_NAME } from '../contracts/config';

const QITMEER_RPC = 'https://qng.rpc.qitmeer.io';

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const refreshBalance = useCallback(async (web3Provider, addr) => {
    if (!web3Provider || !addr) return;
    try {
      const balanceWei = await web3Provider.getBalance(addr);
      setBalance(Number(balanceWei) / 1e18);
    } catch (e) {
      console.error('refreshBalance failed:', e);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or a Qitmeer-compatible wallet.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }
      const addr = accounts[0];
      const web3Provider = new BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        console.warn(`Connected to chain ${network.chainId}, expected ${CHAIN_ID} (${CHAIN_NAME})`);
      }
      await refreshBalance(web3Provider, addr);
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(addr);
      console.log('Wallet connected:', addr);
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    if (window.ethereum?.removeAllListeners) {
      try { window.ethereum.removeAllListeners(); } catch (e) {}
    }
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const switchToQitmeer = useCallback(async () => {
    if (!window.ethereum) return;
    const chainIdHex = '0x' + CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: CHAIN_NAME,
              rpcUrls: [QITMEER_RPC],
              blockExplorerUrls: ['https://qng.meerscan.io'],
              nativeCurrency: { name: 'MEER', symbol: 'MEER', decimals: 18 },
            }],
          });
        } catch (addError) {
          console.error('Failed to add Qitmeer chain:', addError);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        if (provider) refreshBalance(provider, accounts[0]);
      }
    };
    const handleChainChanged = () => {
      if (provider) refreshBalance(provider, address).catch(() => {});
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [provider, address, disconnect, refreshBalance]);

  return {
    provider, signer, address, balance, connecting, error,
    connect, disconnect, switchToQitmeer, isConnected: !!address,
  };
}