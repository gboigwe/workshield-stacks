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

// Network configuration - Updated for proper env handling
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
};

const network = getNetwork();

// Contract addresses - Updated to use env variables
const getContractAddress = (contractName: string) => {
  const envKey = `NEXT_PUBLIC_${contractName.toUpperCase()}_CONTRACT`;
  const envAddress = process.env[envKey];
  
  if (envAddress) {
    return envAddress;
  }
  
  // Fallback addresses
  const fallbackMap = {
    'ESCROW': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-escrow',
    'PAYMENTS': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-payments', 
    'DISPUTE': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-dispute'
  };
  
  return fallbackMap[contractName as keyof typeof fallbackMap] || '';
};

const CONTRACTS = {
  ESCROW: getContractAddress('ESCROW'),
  PAYMENTS: getContractAddress('PAYMENTS'),
  DISPUTE: getContractAddress('DISPUTE')
};

// Validate contract addresses on load
const validateContracts = () => {
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    if (!address) {
      console.error(`Missing contract address for ${name}. Check your .env.local file.`);
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

  // Initialize user session
  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
        setIsSignedIn(true);
        setLoading(false);
      });
    } else if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setUserData(userData);
      setIsSignedIn(true);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(() => {
    showConnect({
      appDetails: {
        name: 'WorkShield',
        icon: window.location.origin + '/favicon.ico',
      },
      redirectTo: '/',
      onFinish: () => {
        window.location.reload();
      },
      userSession,
    });
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    userSession.signUserOut();
    setUserData(null);
    setIsSignedIn(false);
    window.location.href = '/';
  }, []);

  // Generic contract call function
  const callContract = useCallback(({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    postConditions = [],
    onFinish,
    onCancel
  }: ContractCallOptions) => {
    openContractCall({
      network,
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      postConditions,
      postConditionMode: PostConditionMode.Deny,
      onFinish: onFinish || ((data) => {
        console.log('Transaction submitted:', data);
      }),
      onCancel: onCancel || (() => {
        console.log('Transaction cancelled');
      }),
    });
  }, []);

  // Create escrow contract
  const createEscrow = useCallback((
    client: string,
    freelancer: string,
    description: string,
    endDate: number,
    totalAmount: number,
    onFinish?: (data: any) => void
  ) => {
    if (!userData) {
      alert('Please connect your wallet first');
      return;
    }

    // Get the correct address based on network
    const userAddress = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
    
    const postConditions = [
      Pc.principal(userAddress).willSendEq(totalAmount).ustx()
    ];

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

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
      onFinish
    });
  }, [userData, callContract]);

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
