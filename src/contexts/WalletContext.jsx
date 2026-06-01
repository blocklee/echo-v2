import { createContext, useContext } from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { provider, signer, address, connect, disconnect, isConnected, error } = useWallet();
  return (
    <WalletContext.Provider value={{ provider, signer, address, connect, disconnect, isConnected, error }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return ctx;
}
