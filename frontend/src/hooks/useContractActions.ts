'use client';

import { useState, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import { 
  uintCV,
  stringUtf8CV,
  standardPrincipalCV,
  PostConditionMode,
} from '@stacks/transactions';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionResponse, isValidStacksAddress } from '@/types';
import { getNetwork, CONTRACTS, parseContractId, contractCache } from './useStacksNetwork';
import { QUERY_KEYS } from './useStacksQuery';

const network = getNetwork();
const escrowContract = parseContractId(CONTRACTS.ESCROW);

export const useContractActions = (
  isSignedIn: boolean, 
  userData: any, 
  userAddress: string | null
) => {
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const queryClient = useQueryClient();

  // Debug function
  const debugContractSystem = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Contract System Status');
      console.log('📡 Network:', network);
      console.log('👤 User Address:', userAddress);
      console.log('🔐 Is Signed In:', isSignedIn);
      console.log('⚙️ Contracts Config:', CONTRACTS);
      console.log('🏗️ Escrow Contract:', escrowContract);

      // Test if contract exists
      try {
        console.log('🧪 Testing contract existence...');
        const contractInfo = await fetch(`https://api.testnet.hiro.so/v1/contracts/${escrowContract.address}/${escrowContract.name}`);
        console.log('📋 Contract Info Response:', contractInfo.status, contractInfo.statusText);

        if (contractInfo.ok) {
          const contractData = await contractInfo.json();
          console.log('✅ Contract exists:', contractData);
        } else {
          console.log('❌ Contract does not exist or is not deployed');

          // Try to check if any version of the contract exists
          console.log('🔍 Checking for other contract versions...');
          const versions = ['workshield-escrow', 'workshield-escrow-v2', 'workshield-escrow-v3'];
          for (const version of versions) {
            try {
              const versionCheck = await fetch(`https://api.testnet.hiro.so/v1/contracts/${escrowContract.address}/${version}`);
              console.log(`📋 ${version}: ${versionCheck.status} ${versionCheck.statusText}`);
            } catch (e) {
              console.log(`❌ Error checking ${version}:`, e);
            }
          }
        }
      } catch (contractError) {
        console.error('❌ Error checking contract existence:', contractError);
      }
    } catch (error) {
      console.error('❌ Debug Error:', error);
    }
  }, [userAddress, isSignedIn]);

  // Contract creation
  const createEscrow = useCallback(async (
    client: string,          
    freelancer: string,     
    description: string,  
    endDate: number,    
    totalAmount: number  
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isValidStacksAddress(freelancer)) {
      return { success: false, error: 'Invalid freelancer address format' };
    }

    if (freelancer === userAddress) {
      return { success: false, error: 'You cannot create a contract with yourself' };
    }

    setTransactionInProgress(true);

    try {
      console.log('🔧 Creating escrow with parameters:', {
        client,
        freelancer,
        description: description.substring(0, 50) + '...',
        endDate,
        totalAmount
      });

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'create-escrow',
          functionArgs: [
            standardPrincipalCV(client),
            standardPrincipalCV(freelancer),
            stringUtf8CV(description),
            uintCV(endDate),
            uintCV(totalAmount)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: async (data: any) => {
            console.log('✅ Contract created successfully:', data);
            setTransactionInProgress(false);
            
            setTimeout(() => {
              contractCache.clear();
              if (userAddress) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress) });
              }
            }, 2000);
            
            resolve({ 
              success: true, 
              txId: data.txId 
            });
          },
          onCancel: () => {
            console.log('❌ Transaction cancelled by user');
            setTransactionInProgress(false);
            resolve({ 
              success: false, 
              error: 'Transaction cancelled by user' 
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Error in createEscrow:', error);
      setTransactionInProgress(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: `Contract creation failed: ${errorMessage}` 
      };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  // Add milestone
  const addMilestone = useCallback(async (
    contractId: number,
    description: string,
    amount: number,
    deadline: number
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
    }

    console.log('🔧 DEBUG: addMilestone called with:', {
      contractId,
      description: description.substring(0, 30) + '...',
      amount: `${amount} microSTX (${amount / 1000000} STX)`,
      deadline: `Unix timestamp ${deadline} (${new Date(deadline * 1000).toISOString()})`,
      userAddress,
      network: process.env.NEXT_PUBLIC_NETWORK
    });

    setTransactionInProgress(true);

    try {
      return new Promise((resolve) => {
        console.log('📡 DEBUG: Opening contract call for add-milestone...');
        
        openContractCall({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'add-milestone',
          functionArgs: [
            uintCV(contractId),
            stringUtf8CV(description),
            uintCV(amount),
            uintCV(deadline)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            console.log('✅ DEBUG: add-milestone transaction completed successfully:', {
              txId: data.txId,
              timestamp: new Date().toISOString()
            });
            
            setTransactionInProgress(false);
            
            setTimeout(() => {
              contractCache.delete(`contract-${contractId}`);
              contractCache.delete(`milestones-${contractId}`);
              if (userAddress) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress) });
              }
            }, 2000);
            
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            console.log('❌ DEBUG: add-milestone transaction cancelled by user');
            setTransactionInProgress(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          }
        });
      });
    } catch (error) {
      console.error('💥 DEBUG: Exception in addMilestone:', error);
      setTransactionInProgress(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: `Milestone creation failed: ${errorMessage}` 
      };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  // Submit milestone
  const submitMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number,
    submissionNote: string
  ): Promise<TransactionResponse> => {
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    setTransactionInProgress(true);

    try {
      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'submit-milestone',
          functionArgs: [
            uintCV(contractId),
            uintCV(milestoneIndex),
            stringUtf8CV(submissionNote)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            setTransactionInProgress(false);
            setTimeout(() => {
              contractCache.delete(`contract-${contractId}`);
              contractCache.delete(`milestones-${contractId}`);
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress!) });
            }, 2000);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setTransactionInProgress(false);
            resolve({ success: false, error: 'Transaction cancelled' });
          }
        });
      });
    } catch (error) {
      setTransactionInProgress(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  // Approve milestone
  const approveMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number
  ): Promise<TransactionResponse> => {
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    try {
      setTransactionInProgress(true);
      console.log(`🚀 DEBUG: Approving milestone ${contractId}-${milestoneIndex}...`);

      await openContractCall({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'approve-milestone',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneIndex)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('✅ Milestone approval submitted:', data.txId);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress!) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contractDetails(contractId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.milestones(contractId) });
            contractCache.delete(`contract-${contractId}`);
            contractCache.delete(`milestones-${contractId}`);
          }, 2000);
          
          setTransactionInProgress(false);
        },
        onCancel: () => {
          console.log('❌ Transaction cancelled');
          setTransactionInProgress(false);
        },
      });

      return { success: true, txId: 'pending' };
    } catch (error: any) {
      console.error('❌ Error approving milestone:', error);
      setTransactionInProgress(false);
      const errorMessage = error?.message || 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  // Reject milestone
  const rejectMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number,
    rejectionReason: string
  ): Promise<TransactionResponse> => {
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    setTransactionInProgress(true);

    try {
      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'reject-milestone',
          functionArgs: [
            uintCV(contractId),
            uintCV(milestoneIndex),
            stringUtf8CV(rejectionReason)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            setTransactionInProgress(false);
            setTimeout(() => {
              contractCache.delete(`contract-${contractId}`);
              contractCache.delete(`milestones-${contractId}`);
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress!) });
            }, 2000);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setTransactionInProgress(false);
            resolve({ success: false, error: 'Transaction cancelled' });
          }
        });
      });
    } catch (error) {
      setTransactionInProgress(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  // Release remaining balance (emergency function)
  const releaseRemainingBalance = useCallback(async (
    contractId: number,
    milestoneIndex: number
  ): Promise<TransactionResponse> => {
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    try {
      setTransactionInProgress(true);
      console.log(`🚨 EMERGENCY: Releasing remaining balance for contract ${contractId}, milestone ${milestoneIndex}...`);

      await openContractCall({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'release-remaining-balance',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneIndex)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('✅ Emergency release completed:', data.txId);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress!) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contractDetails(contractId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.milestones(contractId) });
            contractCache.delete(`contract-${contractId}`);
            contractCache.delete(`milestones-${contractId}`);
          }, 2000);
          
          setTransactionInProgress(false);
        },
        onCancel: () => {
          console.log('❌ Emergency release cancelled');
          setTransactionInProgress(false);
        },
      });

      return { success: true, txId: 'pending' };
    } catch (error: any) {
      console.error('❌ Error releasing remaining balance:', error);
      setTransactionInProgress(false);
      const errorMessage = error?.message || 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [isSignedIn, userData, userAddress, queryClient]);

  return {
    // State
    transactionInProgress,
    
    // Actions
    createEscrow,
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    releaseRemainingBalance,
    debugContractSystem,
  };
};