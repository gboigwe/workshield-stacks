'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AppConfig, 
  UserSession, 
  showConnect,
  openContractCall,
  openSTXTransfer
} from '@stacks/connect';
import { 
  STACKS_TESTNET, 
  STACKS_MAINNET 
} from '@stacks/network';
import {
  stringUtf8CV,
  uintCV,
  standardPrincipalCV,
  PostConditionMode,
  Pc,
  fetchCallReadOnlyFunction,
  cvToJSON
} from '@stacks/transactions';

// App configuration - exactly like official docs
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// App details for wallet connection
const appDetails = {
  name: 'WorkShield',
  icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.ico' : '',
};

// Network configuration
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
};

const network = getNetwork();

// Contract addresses
const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow',
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments',
  DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
};

// Extend Window interface for wallet providers
declare global {
  interface Window {
    StacksProvider?: any;
    LeatherProvider?: any;
    XverseProviders?: {
      StacksProvider?: any;
    };
  }
}

export const useStacks = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  // Initialize user session - exactly like official docs
  useEffect(() => {
    console.log('🔧 Initializing user session...');
    
    if (userSession.isSignInPending()) {
      console.log('⏳ Sign in pending...');
      userSession.handlePendingSignIn().then((userData) => {
        console.log('✅ Sign in completed:', userData);
        setUserData(userData);
        setIsSignedIn(true);
        setLoading(false);
      }).catch((error) => {
        console.error('❌ Sign in error:', error);
        setLoading(false);
      });
    } else if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      console.log('✅ User already signed in:', userData);
      setUserData(userData);
      setIsSignedIn(true);
      setLoading(false);
    } else {
      console.log('📱 No user session found');
      setLoading(false);
    }
  }, []);

  // Connect wallet - exactly like official docs
  const connectWallet = useCallback(() => {
    console.log('🔗 Connecting wallet...');
    showConnect({
      appDetails,
      onFinish: () => {
        console.log('✅ Wallet connected, reloading...');
        window.location.reload();
      },
      onCancel: () => {
        console.log('❌ Wallet connection cancelled');
      },
      userSession,
    });
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    console.log('🔓 Disconnecting wallet...');
    userSession.signUserOut();
    setUserData(null);
    setIsSignedIn(false);
    window.location.href = '/';
  }, []);

  // Create escrow using the EXACT pattern from official Stacks docs
  const createEscrow = useCallback(async (
    client: string,
    freelancer: string,
    description: string,
    endDate: number,
    totalAmount: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> => {
    console.log('🏗️ Creating escrow contract...');
    
    if (!userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!isSignedIn) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    // Get user address
    const userAddress = userData.profile?.stxAddress?.testnet || userData.profile?.stxAddress?.mainnet;
    
    if (!userAddress) {
      return { success: false, error: 'Could not get your wallet address. Please reconnect your wallet.' };
    }

    console.log('👤 User address:', userAddress);
    console.log('📋 Contract details:', {
      client,
      freelancer,
      description,
      endDate,
      totalAmount: `${totalAmount} microSTX (${totalAmount / 1000000} STX)`
    });

    // Split contract address and name
    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    if (!contractAddress || !contractName) {
      return { success: false, error: 'Contract address not configured properly' };
    }

    // Create post conditions
    const postConditions = [
      Pc.principal(userAddress).willSendEq(totalAmount).ustx()
    ];

    console.log('✅ Post conditions:', postConditions);
    console.log('📄 Contract to call:', { contractAddress, contractName });

    // Use the EXACT pattern from official Stacks documentation
    try {
      setTransactionInProgress(true);
      
      const options = {
        contractAddress,
        contractName,
        functionName: 'create-escrow',
        functionArgs: [
          standardPrincipalCV(client),
          standardPrincipalCV(freelancer),
          stringUtf8CV(description),
          uintCV(endDate),
          uintCV(totalAmount)
        ],
        network,
        appDetails,
        postConditions,
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data: any) => {
          console.log('✅ Escrow creation successful:', data);
          setTransactionInProgress(false);
          // Note: data.txId might be data.txid depending on version
          const txId = data.txId || data.txid;
          return { success: true, txId };
        },
        onCancel: () => {
          console.log('❌ Escrow creation cancelled by user');
          setTransactionInProgress(false);
          return { success: false, error: 'Transaction cancelled by user' };
        }
      };

      console.log('🚀 Calling openContractCall with options:', options);
      
      // This is the exact same pattern used by Gamma and official docs
      await openContractCall(options);
      
      // Return success (the actual result comes through onFinish callback)
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Contract call error:', error);
      setTransactionInProgress(false);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide specific error messages for common issues
      if (errorMessage.includes('wallet') || errorMessage.includes('extension')) {
        return { success: false, error: 'Wallet connection issue. Please ensure a Stacks wallet is installed and connected.' };
      } else if (errorMessage.includes('network')) {
        return { success: false, error: 'Network issue. Please ensure your wallet is connected to Stacks testnet.' };
      } else {
        return { success: false, error: `Transaction failed: ${errorMessage}` };
      }
    }
  }, [userData, isSignedIn]);

  // Add milestone
  const addMilestone = useCallback(async (
    contractId: number,
    description: string,
    amount: number,
    deadline: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> => {
    if (!userData) return { success: false, error: 'Not connected' };

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    try {
      setTransactionInProgress(true);
      
      const options = {
        contractAddress,
        contractName,
        functionName: 'add-milestone',
        functionArgs: [
          uintCV(contractId),
          stringUtf8CV(description),
          uintCV(amount),
          uintCV(deadline)
        ],
        network,
        appDetails,
        onFinish: (data: any) => {
          setTransactionInProgress(false);
          const txId = data.txId || data.txid;
          return { success: true, txId };
        },
        onCancel: () => {
          setTransactionInProgress(false);
          return { success: false, error: 'Transaction cancelled' };
        }
      };

      await openContractCall(options);
      return { success: true };
      
    } catch (error: any) {
      setTransactionInProgress(false);
      return { success: false, error: error.message };
    }
  }, [userData]);

  // Submit milestone
  const submitMilestone = useCallback(async (
    contractId: number,
    milestoneId: number,
    submissionNotes: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> => {
    if (!userData) return { success: false, error: 'Not connected' };

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    try {
      setTransactionInProgress(true);
      
      const options = {
        contractAddress,
        contractName,
        functionName: 'submit-milestone',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneId),
          stringUtf8CV(submissionNotes)
        ],
        network,
        appDetails,
        onFinish: (data: any) => {
          setTransactionInProgress(false);
          const txId = data.txId || data.txid;
          return { success: true, txId };
        },
        onCancel: () => {
          setTransactionInProgress(false);
          return { success: false, error: 'Transaction cancelled' };
        }
      };

      await openContractCall(options);
      return { success: true };
      
    } catch (error: any) {
      setTransactionInProgress(false);
      return { success: false, error: error.message };
    }
  }, [userData]);

  // Approve milestone
  const approveMilestone = useCallback(async (
    contractId: number,
    milestoneId: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> => {
    if (!userData) return { success: false, error: 'Not connected' };

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    try {
      setTransactionInProgress(true);
      
      const options = {
        contractAddress,
        contractName,
        functionName: 'approve-milestone',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneId)
        ],
        network,
        appDetails,
        onFinish: (data: any) => {
          setTransactionInProgress(false);
          const txId = data.txId || data.txid;
          return { success: true, txId };
        },
        onCancel: () => {
          setTransactionInProgress(false);
          return { success: false, error: 'Transaction cancelled' };
        }
      };

      await openContractCall(options);
      return { success: true };
      
    } catch (error: any) {
      setTransactionInProgress(false);
      return { success: false, error: error.message };
    }
  }, [userData]);

  // Reject milestone
  const rejectMilestone = useCallback(async (
    contractId: number,
    milestoneId: number,
    reason: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> => {
    if (!userData) return { success: false, error: 'Not connected' };

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    try {
      setTransactionInProgress(true);
      
      const options = {
        contractAddress,
        contractName,
        functionName: 'reject-milestone',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneId),
          stringUtf8CV(reason)
        ],
        network,
        appDetails,
        onFinish: (data: any) => {
          setTransactionInProgress(false);
          const txId = data.txId || data.txid;
          return { success: true, txId };
        },
        onCancel: () => {
          setTransactionInProgress(false);
          return { success: false, error: 'Transaction cancelled' };
        }
      };

      await openContractCall(options);
      return { success: true };
      
    } catch (error: any) {
      setTransactionInProgress(false);
      return { success: false, error: error.message };
    }
  }, [userData]);

  return {
    userData,
    isSignedIn,
    loading,
    transactionInProgress,
    userAddress: userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || null,
    connectWallet,
    disconnectWallet,
    createEscrow,
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    network,
    contracts: CONTRACTS
  };
};
