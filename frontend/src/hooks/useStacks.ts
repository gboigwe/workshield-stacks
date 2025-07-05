'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AppConfig, 
  UserSession, 
  showConnect,
  openContractCall,
} from '@stacks/connect';
import { 
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  stringUtf8CV,
  standardPrincipalCV,
  PostConditionMode,
  validateStacksAddress
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { createApiKeyMiddleware, createFetchFn } from '@stacks/common';
import { Contract, Milestone, TransactionResponse, isValidStacksAddress } from '@/types';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

// Initialize App Config and Session
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// ✅ FIXED: Proper Stacks.js v7 Network Configuration with API Key
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY || '49c6e72fb90e5b04c2f53721cd1f9a59';
  
  console.log(`🌐 Network: ${networkType}, API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}`);
  
  // Get base network using new v7 static objects
  const baseNetwork = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
  
  if (apiKey) {
    console.log('🔑 Creating API key middleware for Stacks.js v7');
    
    // ✅ PROPER v7 API KEY SETUP
    const apiMiddleware = createApiKeyMiddleware({
      apiKey: apiKey
    });
    
    const customFetchFn = createFetchFn(apiMiddleware);
    
    return {
      ...baseNetwork,
      fetchFn: customFetchFn
    };
  } else {
    console.warn('⚠️ No API key found - using base network');
    return baseNetwork;
  }
};

// ✅ FALLBACK: Proxy-based API calls for CORS issues
const makeProxyApiCall = async (endpoint: string, body?: any) => {
  const proxyUrl = `/api/stacks${endpoint}`;
  
  try {
    console.log(`🔄 Making proxy call to: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Proxy API call failed:', error);
    throw error;
  }
};

// ✅ SMART API CALL with fallback strategy
const makeSmartApiCall = async (apiCall: () => Promise<any>, fallbackEndpoint?: string, fallbackBody?: any) => {
  try {
    // First try direct Stacks.js call with API key
    console.log('🎯 Attempting direct Stacks.js API call...');
    return await apiCall();
  } catch (error: any) {
    console.warn('⚠️ Direct call failed, trying proxy fallback...', error.message);
    
    if (fallbackEndpoint) {
      try {
        return await makeProxyApiCall(fallbackEndpoint, fallbackBody);
      } catch (proxyError) {
        console.error('❌ Both direct and proxy calls failed');
        throw proxyError;
      }
    } else {
      throw error;
    }
  }
};

const network = getNetwork();

// Contract Configuration
const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow-v2',
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments',
  DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
};

const parseContractId = (contractId: string) => {
  const [address, name] = contractId.split('.');
  return { address, name };
};

const escrowContract = parseContractId(CONTRACTS.ESCROW);

// ✅ FIXED: CACHING CONFIGURATION - Use Map consistently
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const contractCache = new Map<string, { data: any; timestamp: number }>();

const isDataFresh = (timestamp: number) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

const getCachedData = <T>(key: string): T | null => {
  const cached = contractCache.get(key);
  if (cached && isDataFresh(cached.timestamp)) {
    console.log(`📋 Using cached data for ${key}`);
    return cached.data;
  }
  return null;
};

const setCachedData = <T>(key: string, data: T) => {
  contractCache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 Cached data for ${key}`);
};

// React Query Configuration
const QUERY_KEYS = {
  contracts: (userAddress: string) => ['contracts', userAddress],
  contractDetails: (contractId: number) => ['contract', contractId],
  milestones: (contractId: number) => ['milestones', contractId],
  totalContracts: () => ['totalContracts']
};

const QUERY_CONFIG = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

export const useStacks = () => {
  const [mounted, setMounted] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);
  const queryClient = useQueryClient();

  // ✅ USER SESSION MANAGEMENT
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

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

  // ✅ CORE FETCH FUNCTIONS with Smart API Calls

  const fetchTotalContractsCount = useCallback(async (): Promise<number> => {
    const cacheKey = 'totalContracts';
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log('📊 Fetching total contract count...');

      const result = await makeSmartApiCall(
        () => fetchCallReadOnlyFunction({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-total-contracts',
          functionArgs: [],
          senderAddress: escrowContract.address,
        }),
        '/get-total-contracts',
        {
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-total-contracts',
          functionArgs: [],
          senderAddress: escrowContract.address,
        }
      );

      const totalContracts = result.value ? parseInt(result.value) : 0;
      console.log(`📈 Total contracts: ${totalContracts}`);
      
      setCachedData(cacheKey, totalContracts);
      return totalContracts;
    } catch (error) {
      console.error('❌ Error fetching total contracts:', error);
      return 0;
    }
  }, []);

  const fetchMilestoneById = useCallback(async (contractId: number, milestoneId: number): Promise<Milestone | null> => {
    const cacheKey = `milestone-${contractId}-${milestoneId}`;
    const cached = getCachedData<Milestone>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log(`🔍 Fetching milestone ${contractId}-${milestoneId}`);

      const result = await makeSmartApiCall(
        () => fetchCallReadOnlyFunction({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-milestone',
          functionArgs: [uintCV(contractId), uintCV(milestoneId)],
          senderAddress: userAddress || escrowContract.address,
        }),
        '/get-milestone',
        {
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-milestone',
          functionArgs: [uintCV(contractId), uintCV(milestoneId)],
          senderAddress: userAddress || escrowContract.address,
        }
      );

      const milestoneData = cvToJSON(result);
      
      if (milestoneData.value === null) {
        return null;
      }

      const data = milestoneData.value.value || milestoneData.value;
      
      const milestone: Milestone = {
        id: milestoneId,
        description: data.description?.value || data.description || '',
        amount: parseInt(data.amount?.value || data.amount || '0'),
        deadline: parseInt(data.deadline?.value || data.deadline || '0'),
        status: parseInt(data.status?.value || data.status || '0'),
        submissionNotes: data['submission-note']?.value || data['submission-note'] || '',
        rejectionReason: data['rejection-reason']?.value || data['rejection-reason'] || '',
      };

      console.log(`✅ Fetched milestone ${contractId}-${milestoneId}:`, milestone);
      setCachedData(cacheKey, milestone);
      return milestone;
    } catch (error) {
      console.error(`❌ Error fetching milestone ${contractId}-${milestoneId}:`, error);
      return null;
    }
  }, [userAddress]);

  const fetchMilestonesByContract = useCallback(async (contractId: number): Promise<Milestone[]> => {
    const cacheKey = `milestones-${contractId}`;
    const cached = getCachedData<Milestone[]>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log(`📋 Fetching milestones for contract ${contractId}`);
      const milestones: Milestone[] = [];
      
      // Try to fetch up to 50 milestones (reasonable limit)
      for (let i = 1; i <= 50; i++) {
        const milestone = await fetchMilestoneById(contractId, i);
        if (milestone === null) break; // No more milestones
        milestones.push(milestone);
      }
      
      console.log(`✅ Found ${milestones.length} milestones for contract ${contractId}`);
      setCachedData(cacheKey, milestones);
      return milestones;
    } catch (error) {
      console.error(`❌ Error fetching milestones for contract ${contractId}:`, error);
      return [];
    }
  }, [fetchMilestoneById]);

  const fetchContractByIdInternal = useCallback(async (contractId: number): Promise<Contract | null> => {
    const cacheKey = `contract-${contractId}`;
    const cached = getCachedData<Contract>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log(`🔍 Fetching contract ID: ${contractId}`);

      const result = await makeSmartApiCall(
        () => fetchCallReadOnlyFunction({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-contract',
          functionArgs: [uintCV(contractId)],
          senderAddress: escrowContract.address,
        }),
        '/get-contract',
        {
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-contract',
          functionArgs: [uintCV(contractId)],
          senderAddress: escrowContract.address,
        }
      );

      const contractData = cvToJSON(result);
      
      if (contractData && contractData.value && contractData.value.value) {
        // Fetch milestones for this contract
        const milestones = await fetchMilestonesByContract(contractId);
        
        const data = contractData.value.value;
        
        const contract: Contract = {
          id: contractId,
          client: data.client?.value || data.client,
          freelancer: data.freelancer?.value || data.freelancer,
          totalAmount: parseInt(data['total-amount']?.value || data['total-amount']),
          remainingBalance: parseInt(data['remaining-balance']?.value || data['remaining-balance']),
          status: parseInt(data.status?.value || data.status),
          createdAt: parseInt(data['created-at']?.value || data['created-at']),
          endDate: parseInt(data['end-date']?.value || data['end-date']),
          description: data.description?.value || data.description,
          milestones: milestones
        };
        
        console.log(`✅ Fetched contract ${contractId}:`, contract);
        setCachedData(cacheKey, contract);
        return contract;
      } else {
        console.log(`❌ No data found for contract ${contractId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching contract ${contractId}:`, error);
      return null;
    }
  }, [fetchMilestonesByContract]);

  const fetchUserContractsInternal = useCallback(async (userAddress: string): Promise<Contract[]> => {
    if (!userAddress) return [];

    try {
      console.log(`🚀 Fetching contracts for user ${userAddress}`);
      const totalContracts = await fetchTotalContractsCount();
      console.log(`📊 Checking ${totalContracts} contracts for user involvement...`);
      
      const contracts: Contract[] = [];
      
      // Process contracts in smaller batches with delays to avoid rate limits
      const batchSize = 3;
      for (let i = 1; i <= totalContracts; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, totalContracts + 1); j++) {
          batch.push(fetchContractByIdInternal(j));
        }
        
        const batchResults = await Promise.all(batch);
        
        for (const contract of batchResults) {
          if (contract && (contract.client === userAddress || contract.freelancer === userAddress)) {
            contracts.push(contract);
            console.log(`✅ Added contract ${contract.id} (user is ${contract.client === userAddress ? 'client' : 'freelancer'})`);
          }
        }
        
        // Add delay between batches to be gentle on the API
        if (i + batchSize <= totalContracts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`🎯 RESULT: Found ${contracts.length} contracts for user`);
      return contracts;
    } catch (error) {
      console.error('❌ Error fetching user contracts:', error);
      return [];
    }
  }, [fetchTotalContractsCount, fetchContractByIdInternal]);

  // ✅ REACT QUERY HOOKS
  const {
    data: allContracts = [],
    isLoading: contractsLoading,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: QUERY_KEYS.contracts(userAddress || ''),
    queryFn: () => fetchUserContractsInternal(userAddress!),
    enabled: !!userAddress && isSignedIn,
    ...QUERY_CONFIG,
    refetchInterval: isPollingEnabled ? 30000 : false, // Poll every 30 seconds if enabled
  });

  // ✅ DERIVED STATE
  const clientContracts = allContracts.filter(contract => contract.client === userAddress);
  const freelancerContracts = allContracts.filter(contract => contract.freelancer === userAddress);

  // ✅ REFRESH FUNCTIONS - Declare BEFORE createEscrow
  const refreshContracts = useCallback(async () => {
    if (!userAddress) return;
    
    console.log('🔄 Refreshing contracts...');
    // ✅ FIXED: Use Map methods consistently
    contractCache.clear();
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress) });
    await refetchContracts();
  }, [userAddress, queryClient, refetchContracts]);

  const debugContractSystem = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Contract System Status');
      console.log('📡 Network:', network);
      console.log('👤 User Address:', userAddress);
      console.log('🔐 Is Signed In:', isSignedIn);
      console.log('📊 Client Contracts:', clientContracts.length);
      console.log('💼 Freelancer Contracts:', freelancerContracts.length);
      console.log('⚙️ Contracts Config:', CONTRACTS);
      
      if (userAddress) {
        console.log('🔄 Fetching fresh contract data...');
        const totalContracts = await fetchTotalContractsCount();
        console.log('📈 Total Contracts on Blockchain:', totalContracts);
      }
    } catch (error) {
      console.error('❌ Debug Error:', error);
    }
  }, [userAddress, isSignedIn, clientContracts, freelancerContracts, fetchTotalContractsCount]);

  // ✅ WALLET CONNECTION
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(address) });
        }
      },
      onCancel: () => {
        console.log('❌ Wallet connection cancelled');
      },
    });
  }, [queryClient]);

  const disconnectWallet = useCallback(() => {
    userSession.signUserOut('/');
    setUserData(null);
    setIsSignedIn(false);
    setUserAddress(null);
    queryClient.clear();
    console.log('🔌 Wallet disconnected');
  }, [queryClient]);

  // ✅ CONTRACT CREATION with proper validation (KEEP THIS!)
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

    // ✅ FIXED: Use correct function name
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
          // ✅ FIXED: Correct parameter order matching smart contract exactly
          functionArgs: [
            standardPrincipalCV(client),        // (client principal)
            standardPrincipalCV(freelancer),    // (freelancer principal)
            stringUtf8CV(description),          // (description (string-utf8 500))
            uintCV(endDate),                    // (end-date uint)
            uintCV(totalAmount)                 // (total-amount uint)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: async (data: any) => {
            console.log('✅ Contract created successfully:', data);
            setTransactionInProgress(false);
            
            // ✅ FIXED: Clear cache using proper async method
            setTimeout(() => {
              // Clear cache to force refresh
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
  }, [isSignedIn, userData, userAddress, network, queryClient]); // ✅ FIXED: Proper dependencies

  // ✅ MILESTONE OPERATIONS
  const approveMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number
  ): Promise<TransactionResponse> => {
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    try {
      setTransactionInProgress(true);
      console.log(`🚀 Approving milestone ${contractId}-${milestoneIndex}...`);

      await openContractCall({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'approve-milestone',
        functionArgs: [
          uintCV(contractId),
          uintCV(milestoneIndex)
        ],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          console.log('✅ Milestone approval submitted:', data.txId);
          
          // ✅ REAL-TIME UPDATE: Refresh contract data
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress!) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contractDetails(contractId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.milestones(contractId) });
            // ✅ FIXED: Use Map methods consistently
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

  // ✅ REAL-TIME CONTROLS
  const enableRealTimeUpdates = useCallback(() => {
    setIsPollingEnabled(true);
    console.log('🔄 Real-time updates enabled');
  }, []);

  const disableRealTimeUpdates = useCallback(() => {
    setIsPollingEnabled(false);
    console.log('⏸️ Real-time updates disabled');
  }, []);

  const enableActivePolling = enableRealTimeUpdates;
  const disableActivePolling = disableRealTimeUpdates;

  // ✅ ADDRESS VALIDATION HELPER (KEEP THIS!)
  const validateAddress = useCallback((address: string) => {
    const networkType = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    return validateStacksAddress(address);
  }, []);



  // ✅ PLACEHOLDER FUNCTIONS (implement as needed)
  const addMilestone = useCallback(async (
    contractId: number,
    description: string,
    amount: number,
    deadline: number  // ✅ Now expects block height, not timestamp
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
    }

    console.log('🔧 DEBUG: addMilestone called with:', {
      contractId,
      description: description.substring(0, 30) + '...',
      amount: `${amount} microSTX (${amount / 1000000} STX)`,
      deadline: `Block height ${deadline}`,
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
            uintCV(deadline)  // ✅ Now properly formatted as block height
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            console.log('✅ DEBUG: add-milestone transaction completed successfully:', {
              txId: data.txId,
              timestamp: new Date().toISOString()
            });
            
            setTransactionInProgress(false);
            
            // Clear cache and refresh data
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
  }, [isSignedIn, userData, userAddress, network, queryClient]);

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
  }, [isSignedIn, userData, userAddress, network, queryClient]);

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
  }, [isSignedIn, userData, userAddress, network, queryClient]);

  if (!mounted) {
    return {
      userData: null,
      isSignedIn: false,
      loading: true,
      transactionInProgress: false,
      userAddress: null,
      clientContracts: [],
      freelancerContracts: [],
      allContracts: [],
      network,
      contracts: CONTRACTS,
      connectWallet: () => {},
      disconnectWallet: () => {},
      refreshContracts: () => {},
      fetchUserContracts: () => Promise.resolve([]),
      fetchContractById: () => Promise.resolve(null),
      fetchMilestonesByContract: () => Promise.resolve([]),
      createEscrow: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      addMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      submitMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      approveMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      rejectMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      enableRealTimeUpdates: () => {},
      disableRealTimeUpdates: () => {},
      isPollingEnabled: false,
      validateAddress: () => false,
    };
  }

  return {
    userData,
    isSignedIn,
    loading: contractsLoading,
    transactionInProgress,
    userAddress,
    
    // Contract arrays
    clientContracts,
    freelancerContracts,
    allContracts,
    
    // Network and contracts
    network,
    contracts: CONTRACTS,
    
    // Actions
    connectWallet,
    disconnectWallet,
    refreshContracts,
    
    // Contract operations
    fetchUserContracts: fetchUserContractsInternal,
    fetchContractById: fetchContractByIdInternal,
    fetchMilestonesByContract,
    
    // Enhanced contract creation (with validation kept)
    createEscrow,
    
    // Milestone operations
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    
    // Real-time control
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    isPollingEnabled,
    
    // Address validation (kept as requested)
    validateAddress,
    enableActivePolling,
    disableActivePolling,
    debugContractSystem,
  };
};



