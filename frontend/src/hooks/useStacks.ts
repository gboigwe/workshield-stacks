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

// Add this function at the top of the file
function convertSmartContractTimeToTimestamp(value: number): number {
  // Handle invalid or zero values
  if (!value || value === 0) {
    return Date.now(); // Use current time as fallback
  }

  if (value > 1000000000) {
    // This looks like a Unix timestamp (in seconds) - convert to milliseconds
    console.log(`🕐 Detected Unix timestamp: ${value} (${new Date(value * 1000).toISOString()})`);
    return value * 1000;
    
  } else if (value >= 100000 && value <= 300000) {
    // This looks like a Stacks block height - convert using block calculation
    console.log(`🧱 Detected block height: ${value}`);
    return convertBlockHeightToTimestamp(value);
    
  } else {
    // Fallback for unexpected values
    console.warn(`⚠️ Unexpected time value: ${value}, using current time`);
    return Date.now();
  }
}

function convertBlockHeightToTimestamp(blockHeight: number): number {
  // Stacks testnet approximation
  const TESTNET_GENESIS_TIMESTAMP = 1610000000; // Jan 2021 approximate
  const AVERAGE_BLOCK_TIME = 600; // 10 minutes in seconds
  
  const approximateTimestamp = TESTNET_GENESIS_TIMESTAMP + (blockHeight * AVERAGE_BLOCK_TIME);
  return approximateTimestamp * 1000; // Convert to milliseconds
}

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
        deadline: convertSmartContractTimeToTimestamp(parseInt(data.deadline?.value || data.deadline || '0')),
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
          createdAt: convertSmartContractTimeToTimestamp(parseInt(data['created-at']?.value || data['created-at'])),
          endDate: convertSmartContractTimeToTimestamp(parseInt(data['end-date']?.value || data['end-date'])),
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



  // ✅ FIXED addMilestone function - expects Unix timestamp (not block height)
  const addMilestone = useCallback(async (
    contractId: number,
    description: string,
    amount: number,
    deadline: number  // ✅ Now expects Unix timestamp in SECONDS
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
            uintCV(deadline)  // ✅ FIXED: Now properly formatted as Unix timestamp
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
        postConditionMode: PostConditionMode.Allow, // ✅ FIXED: Allow STX transfers
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





































// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { 
//   AppConfig, 
//   UserSession, 
//   showConnect,
//   openContractCall,
// } from '@stacks/connect';
// import { 
//   fetchCallReadOnlyFunction,
//   cvToJSON,
//   uintCV,
//   stringUtf8CV,
//   standardPrincipalCV,
//   PostConditionMode
// } from '@stacks/transactions';
// import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
// import { Contract, Milestone, MilestoneStatus, TransactionResponse } from '@/types';

// // // Rate limiting protection
// // const API_CALL_DELAY = 1000; // 1 second between API calls
// // let lastApiCall = 0;

// // const delayApiCall = async () => {
// //   const now = Date.now();
// //   const timeSinceLastCall = now - lastApiCall;
// //   if (timeSinceLastCall < API_CALL_DELAY) {
// //     await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY - timeSinceLastCall));
// //   }
// //   lastApiCall = Date.now();
// // };

// // Initialize App Config and Session
// const appConfig = new AppConfig(['store_write', 'publish_data']);
// const userSession = new UserSession({ appConfig });

// // Network configuration with Hiro API key
// const getNetwork = () => {
//   const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
//   const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY;
  
//   console.log(`🌐 Network: ${networkType}, API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}`);
  
//   // Get the base network configuration
//   const baseNetwork = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
  
//   // If no API key, return the base network
//   if (!apiKey) {
//     console.log('⚠️ No API key found - using default network configuration');
//     return baseNetwork;
//   }
  
//   // Create enhanced network configuration with API key
//   const enhancedNetwork = {
//     ...baseNetwork,
//     // Add custom fetch function that includes the API key
//     fetchFn: async (url: string, init?: RequestInit) => {
//       const headers = {
//         ...init?.headers,
//         'X-API-Key': apiKey,
//         'Content-Type': 'application/json',
//       };
      
//       console.log(`📡 Making API call to: ${url.split('?')[0]} with API key`);
      
//       return fetch(url, {
//         ...init,
//         headers,
//       });
//     }
//   };
  
//   return enhancedNetwork;
// };

// const network = getNetwork();

// // Enhanced API call function with rate limiting and API key support
// const makeApiCall = async (apiCall: () => Promise<any>, retries = 3): Promise<any> => {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       // Add delay between calls to avoid rate limiting
//       if (attempt > 1) {
//         const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
//         console.log(`⏳ Waiting ${delay}ms before retry ${attempt}/${retries}`);
//         await new Promise(resolve => setTimeout(resolve, delay));
//       }
      
//       const result = await apiCall();
      
//       if (attempt > 1) {
//         console.log(`✅ API call succeeded on attempt ${attempt}/${retries}`);
//       }
      
//       return result;
//     } catch (error: any) {
//       console.log(`❌ API call attempt ${attempt}/${retries} failed:`, error?.message || error);
      
//       // If this was the last retry, throw the error
//       if (attempt === retries) {
//         throw error;
//       }
      
//       // Check if it's a rate limit error
//       if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
//         console.log('🚦 Rate limit detected, waiting longer...');
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }
//   }
// };

// // Contract Configuration - UPDATED WITH NEW CONTRACT ADDRESS
// const CONTRACTS = {
//   ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow-v2',
//   PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments',
//   DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
// };

// // Parse contract address and name
// const parseContractId = (contractId: string) => {
//   const [address, name] = contractId.split('.');
//   return { address, name };
// };

// const escrowContract = parseContractId(CONTRACTS.ESCROW);

// // App Details
// const appDetails = {
//   name: 'WorkShield',
//   icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.ico' : '',
// };

// interface ContractCache {
//   [key: string]: {
//     data: any;
//     timestamp: number;
//   };
// }

// // ✅ Enhanced caching with longer cache times
// const CACHE_DURATION = 30000; // 30 seconds cache
// const isDataFresh = (timestamp: number): boolean => {
//   return Date.now() - timestamp < CACHE_DURATION;
// };
// // Rate limiting and caching
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));



// const contractCache: ContractCache = {};
// // const CACHE_TTL = 30000; // 30 seconds

// // Helper functions
// // const isDataFresh = (timestamp: number): boolean => {
// //   return Date.now() - timestamp < CACHE_TTL;
// // };

// interface UseStacksReturn {
//   userData: any;
//   isSignedIn: boolean;
//   loading: boolean;
//   transactionInProgress: boolean;
//   userAddress: string | null;
  
//   // Contract arrays - separated by role
//   clientContracts: Contract[];
//   freelancerContracts: Contract[];
//   allContracts: Contract[];
  
//   // Network and contracts
//   network: any;
//   contracts: typeof CONTRACTS;
  
//   // Actions
//   connectWallet: () => void;
//   disconnectWallet: () => void;
//   refreshContracts: () => Promise<void>;
  
//   // Contract operations
//   fetchUserContracts: (userAddress: string) => Promise<Contract[]>;
//   fetchContractById: (contractId: number) => Promise<Contract | null>;
//   fetchMilestonesByContract: (contractId: number) => Promise<Milestone[]>;
  
//   // Enhanced contract creation
//   createEscrow: (client: string, freelancer: string, description: string, endDate: number, totalAmount: number) => Promise<TransactionResponse>;
  
//   // Milestone operations
//   addMilestone: (contractId: number, description: string, amount: number, deadline: number) => Promise<TransactionResponse>;
//   submitMilestone: (contractId: number, milestoneIndex: number, submissionNote: string) => Promise<TransactionResponse>;
//   approveMilestone: (contractId: number, milestoneIndex: number) => Promise<TransactionResponse>;
//   rejectMilestone: (contractId: number, milestoneIndex: number, rejectionReason: string) => Promise<TransactionResponse>;
  
//   // Debug function
//   debugContractSystem: () => Promise<void>;

//   isPollingEnabled: boolean;
//   enableRealTimeUpdates: () => void;
//   disableRealTimeUpdates: () => void;
// }

// export const useStacks = (): UseStacksReturn => {
//   const [userData, setUserData] = useState<any>(null);
//   const [isSignedIn, setIsSignedIn] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [transactionInProgress, setTransactionInProgress] = useState(false);
//   const [clientContracts, setClientContracts] = useState<Contract[]>([]);
//   const [freelancerContracts, setFreelancerContracts] = useState<Contract[]>([]);
//   const [isPollingEnabled, setIsPollingEnabled] = useState(false);

//   // Initialize authentication
//   useEffect(() => {
//     const checkAuthState = async () => {
//       try {
//         if (userSession.isSignInPending()) {
//           const userData = await userSession.handlePendingSignIn();
//           setUserData(userData);
//           setIsSignedIn(true);
//         } else if (userSession.isUserSignedIn()) {
//           const userData = userSession.loadUserData();
//           setUserData(userData);
//           setIsSignedIn(true);
//         }
//       } catch (error) {
//         console.error('❌ Auth initialization error:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     checkAuthState();
//   }, []);

//   // Get user address
//   const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || null;

//   // ✅ NEW: Get total contracts using the new contract function
//   const getTotalContracts = useCallback(async (): Promise<number> => {
//     try {
//       console.log('📊 Fetching total contract count from blockchain...');
      
//       const result = await fetchCallReadOnlyFunction({
//         network,
//         contractAddress: escrowContract.address,
//         contractName: escrowContract.name,
//         functionName: 'get-total-contracts',
//         functionArgs: [],
//         senderAddress: escrowContract.address,
//       });

//       const totalContractsData = cvToJSON(result);
//       const totalContracts = totalContractsData?.value ? parseInt(totalContractsData.value) : 0;
      
//       console.log(`📊 Total contracts on blockchain: ${totalContracts}`);
//       return totalContracts;
//     } catch (error) {
//       console.error('❌ Error fetching total contracts:', error);
//       return 0;
//     }
//   }, []);

//   // ✅ OPTIMIZED: Fetch milestone by contract and milestone ID
//   const fetchMilestoneById = useCallback(async (contractId: number, milestoneId: number): Promise<Milestone | null> => {
//     try {
//       console.log(`🔍 [DEBUG] Fetching milestone ${contractId}-${milestoneId}`);
      
//       const result = await fetchCallReadOnlyFunction({
//         network,
//         contractAddress: escrowContract.address,
//         contractName: escrowContract.name,
//         functionName: 'get-milestone',
//         functionArgs: [uintCV(contractId), uintCV(milestoneId)],
//         senderAddress: escrowContract.address,
//       });

//       const milestoneData = cvToJSON(result);
      
//       console.log(`📊 [DEBUG] Raw milestone ${milestoneId} response:`, milestoneData);
//       console.log(`📊 [DEBUG] milestoneData.value:`, milestoneData?.value);
//       console.log(`📊 [DEBUG] milestoneData.value.value:`, milestoneData?.value?.value);
      
//       // Check if milestone exists (handle optional return)
//       if (!milestoneData || !milestoneData.value) {
//         console.log(`❌ [DEBUG] No milestone data found for ${contractId}-${milestoneId}`);
//         return null;
//       }
      
//       // Handle different possible data structures
//       let data;
//       if (milestoneData.value.value) {
//         // Double nested structure
//         data = milestoneData.value.value;
//         console.log(`📊 [DEBUG] Using double nested structure:`, data);
//       } else {
//         // Single nested structure
//         data = milestoneData.value;
//         console.log(`📊 [DEBUG] Using single nested structure:`, data);
//       }
      
//       // Log each field individually to see exact structure
//       console.log(`📊 [DEBUG] data.status:`, data.status);
//       console.log(`📊 [DEBUG] data.amount:`, data.amount);
//       console.log(`📊 [DEBUG] data.description:`, data.description);
//       console.log(`📊 [DEBUG] data.deadline:`, data.deadline);
      
//       // Extract values with fallbacks
//       const statusValue = data.status?.value || data.status;
//       const amountValue = data.amount?.value || data.amount;
//       const descriptionValue = data.description?.value || data.description;
//       const deadlineValue = data.deadline?.value || data.deadline;
      
//       console.log(`📊 [DEBUG] Extracted values:`);
//       console.log(`  status: ${statusValue} (type: ${typeof statusValue})`);
//       console.log(`  amount: ${amountValue} (type: ${typeof amountValue})`);
//       console.log(`  description: ${descriptionValue} (type: ${typeof descriptionValue})`);
//       console.log(`  deadline: ${deadlineValue} (type: ${typeof deadlineValue})`);
      
//       const milestone: Milestone = {
//         id: milestoneId,
//         description: String(descriptionValue || ''),
//         amount: parseInt(String(amountValue || '0')),
//         deadline: parseInt(String(deadlineValue || '0')),
//         status: parseInt(String(statusValue || '0')) as MilestoneStatus,
//         submissionNotes: data['submission-note']?.value || data['submission-note'] || undefined,
//         rejectionReason: data['rejection-reason']?.value || data['rejection-reason'] || undefined,
//         submittedAt: undefined,
//         approvedAt: undefined,
//       };
      
//       console.log(`✅ [DEBUG] Final milestone object:`, milestone);
//       console.log(`✅ [DEBUG] milestone.status type check:`, typeof milestone.status, milestone.status);
      
//       // Validate that all critical fields are primitive values
//       if (typeof milestone.status === 'object') {
//         console.error(`🚨 [ERROR] milestone.status is still an object!`, milestone.status);
//         throw new Error('Milestone status parsing failed - still an object');
//       }
      
//       if (typeof milestone.amount === 'object') {
//         console.error(`🚨 [ERROR] milestone.amount is still an object!`, milestone.amount);
//         throw new Error('Milestone amount parsing failed - still an object');
//       }
      
//       return milestone;
      
//     } catch (error) {
//       console.error(`❌ [ERROR] Error fetching milestone ${contractId}-${milestoneId}:`, error);
//       return null;
//     }
//   }, []);

//   // ✅ OPTIMIZED: Fetch all milestones for a contract
//   const fetchMilestonesByContract = useCallback(async (contractId: number): Promise<Milestone[]> => {
//     try {

//       // await delayApiCall();
//       // First get the milestone count
//       const countResult = await makeApiCall(() => fetchCallReadOnlyFunction({
//         network,
//         contractAddress: escrowContract.address,
//         contractName: escrowContract.name,
//         functionName: 'get-milestone-count',
//         functionArgs: [uintCV(contractId)],
//         senderAddress: escrowContract.address,
//       }));

//       const milestoneCount = cvToJSON(countResult);
//       const count = milestoneCount?.value ? parseInt(milestoneCount.value) : 0;

//       if (count === 0) return [];

//       // Fetch all milestones
//       const milestones: Milestone[] = [];
//       for (let i = 1; i <= count; i++) {
//         const milestone = await fetchMilestoneById(contractId, i);
//         if (milestone) {
//           milestones.push(milestone);
//         }
//       }

//       return milestones;
//     } catch (error) {
//       console.error(`❌ Error fetching milestones for contract ${contractId}:`, error);
//       return [];
//     }
//   }, [fetchMilestoneById]);

//   // ✅ SUPER OPTIMIZED: Fetch contract by ID with milestone loading
//   const fetchContractById = useCallback(async (contractId: number): Promise<Contract | null> => {
//     const cacheKey = `contract-${contractId}`;
//     const cached = contractCache[cacheKey];
    
//     if (cached && isDataFresh(cached.timestamp)) {
//       return cached.data;
//     }

//     try {
//       console.log(`🔍 Fetching contract ID: ${contractId}`);

//       // await delayApiCall();

//       const result = await makeApiCall(() => fetchCallReadOnlyFunction({
//         network,
//         contractAddress: escrowContract.address,
//         contractName: escrowContract.name,
//         functionName: 'get-contract',
//         functionArgs: [uintCV(contractId)],
//         senderAddress: escrowContract.address,
//       }));

//       const contractData = cvToJSON(result);
//       console.log(`📊 Raw contract data for ID ${contractId}:`, contractData); // ADD THIS
      
//       if (contractData && contractData.value && contractData.value.value) {
//         // Fetch milestones for this contract
//         const milestones = await fetchMilestonesByContract(contractId);
        
//         // 🔧 FIX: Access the nested value structure
//         const data = contractData.value.value;
        
//         const contract: Contract = {
//           id: contractId,
//           client: data.client?.value || data.client,
//           freelancer: data.freelancer?.value || data.freelancer,
//           totalAmount: parseInt(data['total-amount']?.value || data['total-amount']),
//           remainingBalance: parseInt(data['remaining-balance']?.value || data['remaining-balance']),
//           status: parseInt(data.status?.value || data.status),
//           createdAt: parseInt(data['created-at']?.value || data['created-at']),
//           endDate: parseInt(data['end-date']?.value || data['end-date']),
//           description: data.description?.value || data.description,
//           milestones: milestones
//         };
        
//         console.log(`✅ Parsed contract ${contractId}:`, contract);
//         console.log(`🔍 Client: ${contract.client}, User: ${userAddress}, Match: ${contract.client === userAddress}`);
        
//         contractCache[cacheKey] = { data: contract, timestamp: Date.now() };
//         return contract;
//       } else {
//         console.log(`❌ No contract data found for ID ${contractId}`); // ADD THIS
//       }
      
//       return null;
//     } catch (error) {
//       console.error(`❌ Error fetching contract ${contractId}:`, error);
//       return null;
//     }
//   }, [fetchMilestonesByContract, userAddress]); // ADD userAddress to dependencies

//   const fetchUserContracts = useCallback(async (userAddress: string): Promise<Contract[]> => {
//     if (!userAddress) return [];
    
//     const cacheKey = `user-contracts-${userAddress}`;
//     const cached = contractCache[cacheKey];
    
//     if (cached && isDataFresh(cached.timestamp)) {
//       console.log(`📋 Using cached contracts for ${userAddress.slice(0, 8)}...`);
//       return cached.data;
//     }

//     console.log(`🚀 SIMPLE: Fetching contracts for user ${userAddress}`);
    
//     try {
//       const totalContracts = await getTotalContracts();
//       console.log(`📊 Checking ${totalContracts} contracts for user involvement...`);
      
//       const contracts: Contract[] = [];
      
//       for (let i = 1; i <= totalContracts; i++) {
//         try {
//           const contract = await fetchContractById(i);
//           if (contract && (contract.client === userAddress || contract.freelancer === userAddress)) {
//             contracts.push(contract);
//             console.log(`✅ Added contract ${i} (user is ${contract.client === userAddress ? 'client' : 'freelancer'})`);
//           }
//         } catch (error) {
//           console.error(`❌ Error fetching contract ${i}:`, error);
//         }
//       }
      
//       console.log(`🎯 RESULT: Found ${contracts.length} contracts for user`);
      
//       // Cache the results
//       contractCache[cacheKey] = { data: contracts, timestamp: Date.now() };
//       return contracts;
      
//     } catch (error) {
//       console.error(`❌ Error in fetchUserContracts:`, error);
//       return [];
//     }
//   }, [fetchContractById, getTotalContracts]);

//   // 🔄 KEEP AS FALLBACK: Original method
//   const fetchUserContractsFallback = useCallback(async (userAddress: string): Promise<Contract[]> => {
//     console.log(`🔄 FALLBACK: Using iteration method for ${userAddress.slice(0, 8)}...`);
    
//     try {
//       const totalContracts = await getTotalContracts();
//       if (totalContracts === 0) return [];
      
//       const contracts: Contract[] = [];
      
//       for (let i = 1; i <= totalContracts; i++) {
//         try {
//           const contract = await fetchContractById(i);
//           if (contract && (contract.client === userAddress || contract.freelancer === userAddress)) {
//             contracts.push(contract);
//           }
//         } catch (error) {
//           console.error(`❌ Error fetching contract ${i}:`, error);
//         }
//       }
      
//       return contracts;
//     } catch (error) {
//       console.error(`❌ Error in fallback method:`, error);
//       return [];
//     }
//   }, [fetchContractById, getTotalContracts]);

//   // Connect wallet
//   const connectWallet = useCallback(() => {
//     showConnect({
//       appDetails,
//       onFinish: () => {
//         window.location.reload();
//       },
//       userSession,
//     });
//   }, []);

//   // Disconnect wallet
//   const disconnectWallet = useCallback(() => {
//     userSession.signUserOut();
//     setUserData(null);
//     setIsSignedIn(false);
//     setClientContracts([]);
//     setFreelancerContracts([]);
//     window.location.reload();
//   }, []);

//   // Refresh contracts
//   const refreshContracts = useCallback(async () => {
//     if (!userAddress) return;
    
//     // Clear cache
//     Object.keys(contractCache).forEach(key => {
//       if (key.includes(userAddress)) {
//         delete contractCache[key];
//       }
//     });
    
//     const contracts = await fetchUserContracts(userAddress);
    
//     const clientContracts = contracts.filter(c => c.client === userAddress);
//     const freelancerContracts = contracts.filter(c => c.freelancer === userAddress);
    
//     setClientContracts(clientContracts);
//     setFreelancerContracts(freelancerContracts);
//   }, [userAddress, fetchUserContracts]);

//   useEffect(() => {
//     if (!isPollingEnabled || !isSignedIn) return;

//     const pollForUpdates = async () => {
//       console.log('🔄 Polling for contract updates...');
      
//       // Clear some cache to get fresh data (but not all to avoid rate limits)
//       const cacheKeys = Object.keys(contractCache);
//       const oldCacheKeys = cacheKeys.filter(key => 
//         !isDataFresh(contractCache[key].timestamp)
//       );
      
//       oldCacheKeys.forEach(key => delete contractCache[key]);
      
//       // Refresh contracts
//       await refreshContracts();
//     };

//     // Poll every 30 seconds
//     const interval = setInterval(pollForUpdates, 30000);

//     return () => clearInterval(interval);
//   }, [isPollingEnabled, isSignedIn, refreshContracts]);

//   // ✅ Enable polling when user navigates to contract details
//   const enableRealTimeUpdates = useCallback(() => {
//     setIsPollingEnabled(true);
//   }, []);

//   const disableRealTimeUpdates = useCallback(() => {
//     setIsPollingEnabled(false);
//   }, []);

//   // Load contracts when user is signed in
//   useEffect(() => {
//     if (isSignedIn && userAddress) {
//       refreshContracts();
//     }
//   }, [isSignedIn, userAddress, refreshContracts]);

//   // ✅ ENHANCED: Create escrow with better error handling
//   const createEscrow = useCallback(async (
//     client: string,
//     freelancer: string,
//     description: string,
//     endDate: number,
//     totalAmount: number
//   ): Promise<TransactionResponse> => {
    
//     if (!isSignedIn || !userData) {
//       return { success: false, error: 'Wallet not connected' };
//     }

//     setTransactionInProgress(true);

//     try {
//       console.log('🔧 Creating escrow with parameters:', {
//         client,
//         freelancer,
//         description: description.substring(0, 50) + '...',
//         endDate,
//         totalAmount
//       });

//       return new Promise((resolve) => {
//         openContractCall({
//           network,
//           contractAddress: escrowContract.address,
//           contractName: escrowContract.name,
//           functionName: 'create-escrow',
//           functionArgs: [
//             standardPrincipalCV(client),
//             standardPrincipalCV(freelancer),
//             stringUtf8CV(description),
//             uintCV(endDate),
//             uintCV(totalAmount)
//           ],
//           postConditions: [],
//           postConditionMode: PostConditionMode.Allow,
//           onFinish: async (data: any) => {
//             console.log('✅ Contract created successfully:', data);
//             setTransactionInProgress(false);
            
//             // 🔧 FIX: Clear cache and refresh multiple times
//             Object.keys(contractCache).forEach(key => {
//               delete contractCache[key];
//             });
            
//             // Multiple refresh attempts
//             console.log('🔄 Refreshing contracts...');
//             setTimeout(() => refreshContracts(), 2000);
//             setTimeout(() => refreshContracts(), 5000);
//             setTimeout(() => refreshContracts(), 10000);
            
//             resolve({ 
//               success: true, 
//               txId: data.txId 
//             });
//           },
//           onCancel: () => {
//             console.log('❌ Transaction cancelled by user');
//             setTransactionInProgress(false);
//             resolve({ 
//               success: false, 
//               error: 'Transaction cancelled by user' 
//             });
//           }
//         });
//       });

//     } catch (error) {
//       console.error('❌ Error in createEscrow:', error);
//       setTransactionInProgress(false);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return { 
//         success: false, 
//         error: `Contract creation failed: ${errorMessage}` 
//       };
//     }
//   }, [isSignedIn, userData, refreshContracts]);

//   // ✅ Add milestone
//   const addMilestone = useCallback(async (
//     contractId: number,
//     description: string,
//     amount: number,
//     deadline: number
//   ): Promise<TransactionResponse> => {
    
//     if (!isSignedIn || !userData) {
//       return { success: false, error: 'Wallet not connected' };
//     }

//     setTransactionInProgress(true);

//     try {
//       return new Promise((resolve) => {
//         openContractCall({
//           network,
//           contractAddress: escrowContract.address,
//           contractName: escrowContract.name,
//           functionName: 'add-milestone',
//           functionArgs: [
//             uintCV(contractId),
//             stringUtf8CV(description),
//             uintCV(amount),
//             uintCV(deadline)
//           ],
//           postConditions: [],
//           postConditionMode: PostConditionMode.Allow,
//           onFinish: (data: any) => {
//             console.log('✅ Milestone added successfully:', data);
//             setTransactionInProgress(false);
//             setTimeout(() => refreshContracts(), 2000);
//             resolve({ success: true, txId: data.txId });
//           },
//           onCancel: () => {
//             setTransactionInProgress(false);
//             resolve({ success: false, error: 'Transaction cancelled' });
//           }
//         });
//       });
//     } catch (error) {
//       setTransactionInProgress(false);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return { success: false, error: errorMessage };
//     }
//   }, [isSignedIn, userData, refreshContracts]);

//   // ✅ Submit milestone
//   const submitMilestone = useCallback(async (
//     contractId: number,
//     milestoneIndex: number,
//     submissionNote: string
//   ): Promise<TransactionResponse> => {
    
//     if (!isSignedIn || !userData) {
//       return { success: false, error: 'Wallet not connected' };
//     }

//     setTransactionInProgress(true);

//     try {
//       return new Promise((resolve) => {
//         openContractCall({
//           network,
//           contractAddress: escrowContract.address,
//           contractName: escrowContract.name,
//           functionName: 'submit-milestone',
//           functionArgs: [
//             uintCV(contractId),
//             uintCV(milestoneIndex),
//             stringUtf8CV(submissionNote)
//           ],
//           postConditions: [],
//           postConditionMode: PostConditionMode.Allow,
//           onFinish: (data: any) => {
//             console.log('✅ Milestone submitted successfully:', data);
//             setTransactionInProgress(false);
//             setTimeout(() => refreshContracts(), 2000);
//             resolve({ success: true, txId: data.txId });
//           },
//           onCancel: () => {
//             setTransactionInProgress(false);
//             resolve({ success: false, error: 'Transaction cancelled' });
//           }
//         });
//       });
//     } catch (error) {
//       setTransactionInProgress(false);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return { success: false, error: errorMessage };
//     }
//   }, [isSignedIn, userData, refreshContracts]);

//   // ✅ Approve milestone
//   const approveMilestone = useCallback(async (
//     contractId: number,
//     milestoneIndex: number
//   ): Promise<TransactionResponse> => {
    
//     if (!isSignedIn || !userData) {
//       return { success: false, error: 'Wallet not connected' };
//     }

//     setTransactionInProgress(true);

//     try {
//       return new Promise((resolve) => {
//         openContractCall({
//           network,
//           contractAddress: escrowContract.address,
//           contractName: escrowContract.name,
//           functionName: 'approve-milestone',
//           functionArgs: [
//             uintCV(contractId),
//             uintCV(milestoneIndex)
//           ],
//           postConditions: [],
//           postConditionMode: PostConditionMode.Allow,
//           onFinish: async (data: any) => {
//             console.log('✅ Milestone approved successfully:', data);
//             setTransactionInProgress(false);
            
//             // ✅ Clear specific contract cache for immediate refresh
//             Object.keys(contractCache).forEach(key => {
//               if (key.startsWith('contract-') || key.includes('user-contracts')) {
//                 delete contractCache[key];
//               }
//             });
            
//             // ✅ Immediate refresh without delay
//             await refreshContracts();
            
//             resolve({ success: true, txId: data.txId });
//           },
//           onCancel: () => {
//             setTransactionInProgress(false);
//             resolve({ success: false, error: 'Transaction cancelled' });
//           }
//         });
//       });
//     } catch (error) {
//       setTransactionInProgress(false);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return { success: false, error: errorMessage };
//     }
//   }, [isSignedIn, userData, refreshContracts]);

//   // ✅ Reject milestone
//   const rejectMilestone = useCallback(async (
//     contractId: number,
//     milestoneIndex: number,
//     rejectionReason: string
//   ): Promise<TransactionResponse> => {
    
//     if (!isSignedIn || !userData) {
//       return { success: false, error: 'Wallet not connected' };
//     }

//     setTransactionInProgress(true);

//     try {
//       return new Promise((resolve) => {
//         openContractCall({
//           network,
//           contractAddress: escrowContract.address,
//           contractName: escrowContract.name,
//           functionName: 'reject-milestone',
//           functionArgs: [
//             uintCV(contractId),
//             uintCV(milestoneIndex),
//             stringUtf8CV(rejectionReason)
//           ],
//           postConditions: [],
//           postConditionMode: PostConditionMode.Allow,
//           onFinish: (data: any) => {
//             console.log('✅ Milestone rejected successfully:', data);
//             setTransactionInProgress(false);
//             setTimeout(() => refreshContracts(), 2000);
//             resolve({ success: true, txId: data.txId });
//           },
//           onCancel: () => {
//             setTransactionInProgress(false);
//             resolve({ success: false, error: 'Transaction cancelled' });
//           }
//         });
//       });
//     } catch (error) {
//       setTransactionInProgress(false);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return { success: false, error: errorMessage };
//     }
//   }, [isSignedIn, userData, refreshContracts]);

//   // ✅ Debug function
//   const debugContractSystem = useCallback(async () => {
//     if (!userAddress) {
//       console.log('❌ No user address for debugging');
//       return;
//     }
    
//     console.log('🔧 COMPLETE CONTRACT SYSTEM DEBUG');
//     console.log('════════════════════════════════════');
//     console.log(`User Address: ${userAddress}`);
//     console.log(`Contract: ${escrowContract.address}.${escrowContract.name}`);
    
//     try {
//       // Test total contracts
//       const totalContracts = await getTotalContracts();
//       console.log(`📊 Total contracts: ${totalContracts}`);
      
//       // Test specific contracts
//       for (let i = 1; i <= Math.min(totalContracts, 5); i++) {
//         const contract = await fetchContractById(i);
//         if (contract) {
//           console.log(`✅ Contract ${i}:`, {
//             client: contract.client,
//             freelancer: contract.freelancer,
//             description: contract.description.substring(0, 30) + '...',
//             milestones: contract.milestones.length
//           });
//         }
//       }
//     } catch (error) {
//       console.error('❌ Debug failed:', error);
//     }
//   }, [userAddress, getTotalContracts, fetchContractById]);

//   return {
//     userData,
//     isSignedIn,
//     loading,
//     transactionInProgress,
//     userAddress,
//     clientContracts,
//     freelancerContracts,
//     allContracts: [...clientContracts, ...freelancerContracts],
//     network,
//     contracts: CONTRACTS,
//     isPollingEnabled,
//     connectWallet,
//     disconnectWallet,
//     refreshContracts,
//     fetchUserContracts,
//     fetchContractById,
//     fetchMilestonesByContract,
//     createEscrow,
//     addMilestone,
//     submitMilestone,
//     approveMilestone,
//     rejectMilestone,
//     debugContractSystem,
//     enableRealTimeUpdates,
//     disableRealTimeUpdates,
//   };
// };
