'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AppConfig, 
  UserSession, 
  showConnect
} from '@stacks/connect';
import { validateStacksAddress } from '@stacks/transactions';
import { useQueryClient } from '@tanstack/react-query';

// Initialize App Config and Session
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export const useStacksAuth = () => {
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize authentication state
  useEffect(() => {
    setMounted(true);
    
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setUserData(userData);
      setIsSignedIn(true);
      
      const address = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
      setUserAddress(address);
      
      console.log('✅ User already signed in:', address);
    }
  }, []);

  // Wallet connection
  const connectWallet = useCallback(() => {
    console.log('🔌 Connecting wallet...');
    
    showConnect({
      appDetails: {
        name: 'WorkShield',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '',
      },
      redirectTo: '/',
      onFinish: () => {
        console.log('✅ Wallet connected successfully');
        const userData = userSession.loadUserData();
        setUserData(userData);
        setIsSignedIn(true);
        
        const address = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
        setUserAddress(address);
        
        // Refresh contracts after connecting
        if (address) {
          queryClient.invalidateQueries({ queryKey: ['contracts', address] });
        }
      },
      onCancel: () => {
        console.log('❌ Wallet connection cancelled');
      },
    });
  }, [queryClient]);

  // Wallet disconnection
  const disconnectWallet = useCallback(() => {
    userSession.signUserOut('/');
    setUserData(null);
    setIsSignedIn(false);
    setUserAddress(null);
    queryClient.clear();
    console.log('🔌 Wallet disconnected');
  }, [queryClient]);

  // Address validation helper
  const validateAddress = useCallback((address: string) => {
    return validateStacksAddress(address);
  }, []);

  return {
    // State
    mounted,
    userData,
    isSignedIn,
    userAddress,
    
    // Actions
    connectWallet,
    disconnectWallet,
    validateAddress,
    
    // Session
    userSession
  };
};