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
import { Contract, Milestone } from '@/types';

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
    LeatherProvider?: any;
    XverseProviders?: {
      StacksProvider?: any;
    };
    HiroWallet?: any;
    blockstack?: any;
  }
}

// Log contract addresses for debugging
console.log('📄 Contract addresses loaded:');
Object.entries(CONTRACTS).forEach(([key, address]) => {
  if (address.includes('ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V')) {
    console.log(`⚠️ Using fallback ${key} contract address: ${address}`);
  } else {
    console.log(`✅ Using configured ${key} contract address: ${address}`);
  }
});

// Validate contract addresses
console.log('🔍 Validating contract addresses...');
Object.entries(CONTRACTS).forEach(([key, address]) => {
  if (address && address.includes('.')) {
    console.log(`✅ ${key}: ${address}`);
  } else {
    console.error(`❌ Invalid ${key} contract address: ${address}`);
  }
});

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
    if (!userData) return { success: false, error: 'Not connected' };

    const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');

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

  // Fetch all contracts for a user
  const fetchUserContracts = useCallback(async (userAddress: string): Promise<Contract[]> => {
    console.log('🚀 fetchUserContracts called with address:', userAddress);
    console.log('🏠 Using contract address:', CONTRACTS.ESCROW);
    try {
      const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');
      console.log('📝 Split contract - Address:', contractAddress, 'Name:', contractName);
      const contracts: Contract[] = [];
      
      // Since we don't have a "get all contracts" function, we'll need to query by contract ID
      // In a real implementation, you'd need to track contract IDs or have a registry
      
      for (let contractId = 1; contractId <= 50; contractId++) { // Check first 10 contracts
        try {
          const result = await fetchCallReadOnlyFunction({
            network,
            contractAddress,
            contractName,
            functionName: 'get-contract',
            functionArgs: [uintCV(contractId)],
            senderAddress: userAddress,
          });

          const contractData = cvToJSON(result);
          console.log(`🔍 Contract ${contractId} raw data:`, contractData);
          
          if (contractData.value && contractData.value.value) {
            const contract = contractData.value.value;
            console.log(`📋 Contract ${contractId} parsed:`, contract);

            // Extract the actual string values from the nested structure
            const clientAddress = contract.client?.value || '';
            const freelancerAddress = contract.freelancer?.value || '';
            
            console.log(`👤 Client: ${clientAddress}, Freelancer: ${freelancerAddress}, User: ${userAddress}`);
            
            // Check if user is either client or freelancer
            if (clientAddress === userAddress || freelancerAddress === userAddress) {
              console.log(`✅ User matches! Adding contract ${contractId}`);
              // Fetch milestone count
              const milestoneCountResult = await fetchCallReadOnlyFunction({
                network,
                contractAddress,
                contractName,
                functionName: 'get-milestone-count',
                functionArgs: [uintCV(contractId)],
                senderAddress: userAddress,
              });

              const milestoneCount = cvToJSON(milestoneCountResult).value || 0;
              
              // Fetch all milestones for this contract
              const milestones = [];
              for (let milestoneId = 1; milestoneId <= milestoneCount; milestoneId++) {
                const milestoneResult = await fetchCallReadOnlyFunction({
                  network,
                  contractAddress,
                  contractName,
                  functionName: 'get-milestone',
                  functionArgs: [uintCV(contractId), uintCV(milestoneId)],
                  senderAddress: userAddress,
                });

                const milestoneData = cvToJSON(milestoneResult);
                if (milestoneData.success && milestoneData.value) {
                  milestones.push({
                    id: milestoneId,
                    description: milestoneData.value.description,
                    amount: parseInt(milestoneData.value.amount),
                    deadline: parseInt(milestoneData.value.deadline) * 1000, // Convert to milliseconds
                    status: milestoneData.value.status,
                    submissionNotes: milestoneData.value.submissionNotes || '',
                    rejectionReason: milestoneData.value.rejectionReason || '',
                    submittedAt: milestoneData.value.submittedAt ? parseInt(milestoneData.value.submittedAt) * 1000 : undefined,
                    approvedAt: milestoneData.value.approvedAt ? parseInt(milestoneData.value.approvedAt) * 1000 : undefined,
                  });
                }
              }

              contracts.push({
                id: contractId,
                client: clientAddress,
                freelancer: freelancerAddress,
                description: contract.description?.value || '',
                totalAmount: parseInt(contract['total-amount']?.value || '0'),
                remainingBalance: parseInt(contract['remaining-balance']?.value || '0'),
                endDate: parseInt(contract['end-date']?.value || '0') * 1000,
                status: parseInt(contract.status?.value || '0'),
                milestones: milestones,
              });
            }
          }
        } catch (error) {
          // Contract doesn't exist or error fetching, continue to next
          console.log(`Contract ${contractId} not found or error:`, error);
        }
      }

      return contracts;
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }
  }, [network]);

  // Fetch a specific contract by ID
  const fetchContractById = useCallback(async (contractId: number): Promise<Contract | null> => {
    try {
      const [contractAddress, contractName] = CONTRACTS.ESCROW.split('.');
      
      const result = await fetchCallReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-contract',
        functionArgs: [uintCV(contractId)],
        senderAddress: userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '',
      });

      const contractData = cvToJSON(result);
      
      if (contractData.success && contractData.value) {
        const contract = contractData.value;
        
        // Fetch milestone count
        const milestoneCountResult = await fetchCallReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-milestone-count',
          functionArgs: [uintCV(contractId)],
          senderAddress: userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '',
        });

        const milestoneCount = cvToJSON(milestoneCountResult).value || 0;
        
        // Fetch all milestones
        const milestones = [];
        for (let milestoneId = 1; milestoneId <= milestoneCount; milestoneId++) {
          const milestoneResult = await fetchCallReadOnlyFunction({
            network,
            contractAddress,
            contractName,
            functionName: 'get-milestone',
            functionArgs: [uintCV(contractId), uintCV(milestoneId)],
            senderAddress: userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '',
          });

          const milestoneData = cvToJSON(milestoneResult);
          if (milestoneData.success && milestoneData.value) {
            milestones.push({
              id: milestoneId,
              description: milestoneData.value.description,
              amount: parseInt(milestoneData.value.amount),
              deadline: parseInt(milestoneData.value.deadline) * 1000,
              status: milestoneData.value.status,
              submissionNotes: milestoneData.value.submissionNotes || '',
              rejectionReason: milestoneData.value.rejectionReason || '',
              submittedAt: milestoneData.value.submittedAt ? parseInt(milestoneData.value.submittedAt) * 1000 : undefined,
              approvedAt: milestoneData.value.approvedAt ? parseInt(milestoneData.value.approvedAt) * 1000 : undefined,
            });
          }
        }

        return {
          id: contractId,
          client: contract.client,
          freelancer: contract.freelancer,
          description: contract.description,
          totalAmount: parseInt(contract.totalAmount),
          remainingBalance: parseInt(contract.remainingBalance),
          endDate: parseInt(contract.endDate) * 1000,
          status: contract.status,
          milestones: milestones,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching contract:', error);
      return null;
    }
  }, [network, userData]);

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
    fetchUserContracts,
    fetchContractById,
    network,
    contracts: CONTRACTS
  };
};
