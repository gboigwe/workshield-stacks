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
  PostConditionMode,
  stringUtf8CV,
  uintCV,
  standardPrincipalCV,
  Pc
} from '@stacks/transactions';

// App configuration
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Network configuration
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
};

const network = getNetwork();

// Contract addresses - Updated to match your deployment
const getContractAddress = (contractName: string) => {
  const envKey = `NEXT_PUBLIC_${contractName.toUpperCase()}_CONTRACT`;
  const envAddress = process.env[envKey];
  
  if (envAddress) {
    console.log(`✅ Found ${contractName} contract address in env:`, envAddress);
    return envAddress;
  }
  
  // Updated fallback addresses to match your deployment
  const fallbackMap = {
    'ESCROW': 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow',
    'PAYMENTS': 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments', 
    'DISPUTE': 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
  };
  
  const fallbackAddress = fallbackMap[contractName as keyof typeof fallbackMap] || '';
  console.log(`⚠️ Using fallback ${contractName} contract address:`, fallbackAddress);
  return fallbackAddress;
};

const CONTRACTS = {
  ESCROW: getContractAddress('ESCROW'),
  PAYMENTS: getContractAddress('PAYMENTS'),
  DISPUTE: getContractAddress('DISPUTE')
};

// Validate contract addresses on load
const validateContracts = () => {
  console.log('🔍 Validating contract addresses...');
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    if (!address) {
      console.error(`❌ Missing contract address for ${name}. Check your .env.local file.`);
    } else {
      console.log(`✅ ${name}: ${address}`);
    }
  });
};

validateContracts();

interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: any[];
  postConditions?: any[];
  onFinish?: (data: any) => void;
  onCancel?: () => void;
}

export const useStacks = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  // Initialize user session
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

  // Connect wallet
  const connectWallet = useCallback(() => {
    console.log('🔗 Connecting wallet...');
    showConnect({
      appDetails: {
        name: 'WorkShield',
        icon: window.location.origin + '/favicon.ico',
      },
      redirectTo: '/',
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

  // Generic contract call function with enhanced logging
  const callContract = useCallback(({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    postConditions = [],
    onFinish,
    onCancel
  }: ContractCallOptions) => {
    console.log('📞 Making contract call:', {
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      postConditions,
      networkType: network === STACKS_MAINNET ? 'mainnet' : 'testnet'
    });

    setTransactionInProgress(true);

    try {
      openContractCall({
        network,
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        postConditions,
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          console.log('✅ Transaction submitted successfully:', data);
          setTransactionInProgress(false);
          if (onFinish) {
            onFinish(data);
          }
        },
        onCancel: () => {
          console.log('❌ Transaction cancelled by user');
          setTransactionInProgress(false);
          if (onCancel) {
            onCancel();
          }
        },
      });
    } catch (error: unknown) {
      console.error('❌ Contract call error:', error);
      setTransactionInProgress(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Transaction failed: ${errorMessage}`);
    }
  }, []);

  // Create escrow contract with enhanced error handling
  const createEscrow = useCallback((
    client: string,
    freelancer: string,
    description: string,
    endDate: number,
    totalAmount: number,
    onFinish?: (data: any) => void,
    onCancel?: () => void
  ) => {
    console.log('🏗️ Creating escrow contract...');
    
    if (!userData) {
      console.error('❌ No user data available');
      alert('Please connect your wallet first');
      return;
    }

    if (!isSignedIn) {
      console.error('❌ User not signed in');
      alert('Please connect your wallet first');
      return;
    }

    // Get the correct address based on network
    const userAddress = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
    
    if (!userAddress) {
      console.error('❌ No user address found');
      alert('Could not get your wallet address. Please reconnect your wallet.');
      return;
    }

    console.log('👤 User address:', userAddress);
    console.log('📋 Contract details:', {
      client,
      freelancer,
      description,
      endDate,
      totalAmount: `${totalAmount} microSTX (${totalAmount / 1000000} STX)`
    });
    
    const postConditions = [
      Pc.principal(userAddress).willSendEq(totalAmount).ustx()
    ];

    console.log('✅ Post conditions:', postConditions);

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    if (!contractAddress || !contractName) {
      console.error('❌ Invalid escrow contract address:', CONTRACTS.ESCROW);
      alert('Contract address not configured properly. Please check environment variables.');
      return;
    }

    console.log('📄 Contract to call:', { contractAddress, contractName });

    callContract({
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
      postConditions,
      onFinish: (data) => {
        console.log('✅ Escrow creation successful:', data);
        alert(`Contract created successfully! Transaction ID: ${data.txId}`);
        if (onFinish) {
          onFinish(data);
        }
      },
      onCancel: () => {
        console.log('❌ Escrow creation cancelled by user');
        if (onCancel) {
          onCancel();
        }
      }
    });
  }, [userData, isSignedIn, callContract]);

  // Add milestone
  const addMilestone = useCallback((
    contractId: number,
    description: string,
    amount: number,
    deadline: number,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) return;

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    callContract({
      contractAddress,
      contractName,
      functionName: 'add-milestone',
      functionArgs: [
        uintCV(contractId),
        stringUtf8CV(description),
        uintCV(amount),
        uintCV(deadline)
      ],
      onFinish
    });
  }, [userData, callContract]);

  // Submit milestone
  const submitMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    submissionNotes: string,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) return;

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    callContract({
      contractAddress,
      contractName,
      functionName: 'submit-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId),
        stringUtf8CV(submissionNotes)
      ],
      onFinish
    });
  }, [userData, callContract]);

  // Approve milestone
  const approveMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) return;

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    callContract({
      contractAddress,
      contractName,
      functionName: 'approve-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId)
      ],
      onFinish
    });
  }, [userData, callContract]);

  // Reject milestone
  const rejectMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    reason: string,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) return;

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

    callContract({
      contractAddress,
      contractName,
      functionName: 'reject-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId),
        stringUtf8CV(reason)
      ],
      onFinish
    });
  }, [userData, callContract]);

  // Create dispute
  const createDispute = useCallback((
    contractId: number,
    reason: string,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) return;

    const [contractAddress, contractName] = CONTRACTS.DISPUTE.split('.');

    callContract({
      contractAddress,
      contractName,
      functionName: 'open-dispute',
      functionArgs: [
        uintCV(contractId),
        standardPrincipalCV(userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet),
        standardPrincipalCV(userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet), 
        stringUtf8CV(reason)
      ],
      onFinish
    });
  }, [userData, callContract]);

  // Get network info
  const getNetworkInfo = useCallback(() => {
    return {
      network: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
      apiUrl: process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so',
      explorerUrl: process.env.NEXT_PUBLIC_STACKS_EXPLORER_URL || 'https://explorer.hiro.so/?chain=testnet'
    };
  }, []);

  return {
    userData,
    isSignedIn,
    loading,
    transactionInProgress,
    userAddress: userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || null,
    connectWallet,
    disconnectWallet,
    callContract,
    createEscrow,
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    createDispute,
    network,
    networkInfo: getNetworkInfo(),
    contracts: CONTRACTS
  };
};
