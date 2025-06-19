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
const network = process.env.NODE_ENV === 'production' 
  ? STACKS_MAINNET 
  : STACKS_TESTNET;

// Contract addresses 
const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-escrow',
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-payments',
  DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.workshield-dispute'
};

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
        icon: window.location.origin + '/icon.png',
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
    // Optionally redirect or reload
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
    if (!userData) return;

    const postConditions = [
      Pc.principal(userData.profile.stxAddress.testnet).willSendEq(totalAmount).ustx()
    ];

    callContract({
      contractAddress: CONTRACTS.ESCROW.split('.')[0],
      contractName: CONTRACTS.ESCROW.split('.')[1],
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
    callContract({
      contractAddress: CONTRACTS.ESCROW.split('.')[0],
      contractName: CONTRACTS.ESCROW.split('.')[1],
      functionName: 'add-milestone',
      functionArgs: [
        uintCV(contractId),
        stringUtf8CV(description),
        uintCV(amount),
        uintCV(deadline)
      ],
      onFinish
    });
  }, [callContract]);

  // Submit milestone
  const submitMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    submissionNotes: string,
    onFinish?: (data: any) => void
  ) => {
    callContract({
      contractAddress: CONTRACTS.ESCROW.split('.')[0],
      contractName: CONTRACTS.ESCROW.split('.')[1],
      functionName: 'submit-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId),
        stringUtf8CV(submissionNotes)
      ],
      onFinish
    });
  }, [callContract]);

  // Approve milestone
  const approveMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    onFinish?: (data: any) => void
  ) => {
    callContract({
      contractAddress: CONTRACTS.ESCROW.split('.')[0],
      contractName: CONTRACTS.ESCROW.split('.')[1],
      functionName: 'approve-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId)
      ],
      onFinish
    });
  }, [callContract]);

  // Reject milestone
  const rejectMilestone = useCallback((
    contractId: number,
    milestoneId: number,
    reason: string,
    onFinish?: (data: any) => void
  ) => {
    callContract({
      contractAddress: CONTRACTS.ESCROW.split('.')[0],
      contractName: CONTRACTS.ESCROW.split('.')[1],
      functionName: 'reject-milestone',
      functionArgs: [
        uintCV(contractId),
        uintCV(milestoneId),
        stringUtf8CV(reason)
      ],
      onFinish
    });
  }, [callContract]);

  // Create dispute
  const createDispute = useCallback((
    contractId: number,
    reason: string,
    onFinish?: (data: any) => void
  ) => {
    callContract({
      contractAddress: CONTRACTS.DISPUTE.split('.')[0],
      contractName: CONTRACTS.DISPUTE.split('.')[1],
      functionName: 'create-dispute',
      functionArgs: [
        uintCV(contractId),
        stringUtf8CV(reason)
      ],
      onFinish
    });
  }, [callContract]);

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
    contracts: CONTRACTS
  };
};
