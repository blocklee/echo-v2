import { useState, useCallback } from 'react';
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

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    
    try {
      // Check for ethereum window object
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or a Qitmeer-compatible wallet.');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }
      
      const addr = accounts[0];
      
      // Create ethers provider
      const web3Provider = new BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      
      // Get network
      const network = await web3Provider.getNetwork();
      
      // Check if correct chain
      if (Number(network.chainId) !== CHAIN_ID) {
        console.warn(`Connected to chain ${network.chainId}, expected ${CHAIN_ID} (${CHAIN_NAME})`);
      }
      
      // Get balance
      const balanceWei = await web3Provider.getBalance(addr);
      const balanceFormatted = Number(balanceWei) / 1e18;
      
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(addr);
      setBalance(balanceFormatted);
      
      console.log('Wallet connected:', addr, 'Balance:', balanceFormatted, 'MEER');
      
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const switchToQitmeer = useCallback(async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + CHAIN_ID.toString(16) }], // 0x32D = 813
      });
    } catch (switchError) {
      // Chain not added, try adding
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x32D',
              chainName: CHAIN_NAME,
              rpcUrls: ['https://qng.rpc.qitmeer.io'],
              blockExplorerUrls: ['https://qng.meerscan.io'],
              nativeCurrency: {
                name: 'MEER',
                symbol: 'MEER',
                decimals: 18,
              },
            }],
          });
        } catch (addError) {
          console.error('Failed to add Qitmeer chain:', addError);
        }
      }
    }
  }, []);

  // Listen for account changes
  if (window.ethereum && !window.ethereum._eventsBound) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    });
    
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
    
    window.ethereum._eventsBound = true;
  }

  return {
    provider,
    signer,
    address,
    balance,
    connecting,
    error,
    connect,
    disconnect,
    switchToQitmeer,
    isConnected: !!address,
  };
}