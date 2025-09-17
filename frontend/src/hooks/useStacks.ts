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

import { Contract, Milestone, TransactionResponse, isValidStacksAddress } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Initialize App Config and Session
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

function convertSmartContractTimeToTimestamp(value: number): number {
  if (!value || value === 0) {
    return Date.now(); 
  }

  if (value > 1000000000) {
    console.log(`🕐 Detected Unix timestamp: ${value} (${new Date(value * 1000).toISOString()})`);
    return value * 1000;
    
  } else if (value >= 100000 && value <= 300000) {
    console.log(`🧱 Detected block height: ${value}`);
    return convertBlockHeightToTimestamp(value);
    
  } else {
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

// ✅ NETWORK CONFIGURATION with API Key Headers
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY || '49c6e72fb90e5b04c2f53721cd1f9a59';

  console.log(`🌐 Network: ${networkType}, API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}`);

  // Get base network using new v7 static objects
  const baseNetwork = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

  // ✅ ADD: Custom fetch function with API key headers
  if (apiKey) {
    const customFetch = async (url: string, init?: RequestInit) => {
      const headers = {
        ...init?.headers,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...init,
        headers,
      });
    };

    return {
      ...baseNetwork,
      fetchFn: customFetch,
    };
  }

  return baseNetwork;
};

// ✅ FALLBACK: Proxy-based API calls for CORS issues
const makeProxyApiCall = async (endpoint: string, body?: any) => {
  const proxyUrl = `/api/stacks${endpoint}`;

  try {

    // ✅ FIX: Handle BigInt serialization
    const serializedBody = body ? JSON.stringify(body, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ) : undefined;

    const response = await fetch(proxyUrl, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: serializedBody })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if it's a Cloudflare block
      if (errorText.includes('Cloudflare') || errorText.includes('blocked')) {
        console.warn('🛡️ Request blocked by Cloudflare protection');
        console.warn('💡 Solutions: Use VPN, different network, or contact the API provider');
      }
      
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
    console.warn('⚠️ Direct call failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error
    });

    if (fallbackEndpoint) {
      try {
        console.log('🔄 Trying proxy fallback for:', fallbackEndpoint);
        return await makeProxyApiCall(fallbackEndpoint, fallbackBody);
      } catch (proxyError: any) {
        console.error('❌ API calls blocked - likely Cloudflare protection:', {
          directError: error.message,
          proxyError: proxyError.message,
          fallbackEndpoint,
          solution: 'Try using VPN or different network'
        });
        
        // In development, return mock data to prevent crashes
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development mode: returning mock data');
          return { type: 'uint', value: 0 }; // Mock empty response
        }
        throw proxyError;
      }
    } else {
      console.error('❌ API call failed - no fallback available:', error.message);
      
      // In development, return mock data to prevent crashes
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: returning mock data');
        return { type: 'uint', value: 0 }; // Mock empty response
      }
      throw error;
    }
  }
};

const network = getNetwork();

// Contract Configuration
const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-test-v3',
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

// Pagination Support Interfaces
export interface PaginatedContractsResult {
  contracts: Contract[];
  hasMore: boolean;
  total?: number;
  offset: number;
  limit: number;
}

export interface PaginatedMilestonesResult {
  milestones: Milestone[];
  hasMore: boolean;
  total?: number;
  offset: number;
  limit: number;
}

export interface ContractsFetchOptions {
  offset?: number;
  limit?: number;
  userAddress?: string;
}

export interface MilestonesFetchOptions {
  offset?: number;
  limit?: number;
  contractId: number;
}

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
          functionArgs: [contractId, milestoneId], // ✅ FIX: Use plain numbers instead of uintCV for proxy
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

  // Paginated version for milestones
  const fetchMilestonesPaginated = useCallback(async (options: MilestonesFetchOptions): Promise<PaginatedMilestonesResult> => {
    const { offset = 0, limit = 10, contractId } = options;
    const cacheKey = `milestones-paginated-${contractId}-${offset}-${limit}`;
    const cached = getCachedData<PaginatedMilestonesResult>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log(`📄 Fetching paginated milestones for contract ${contractId} (offset: ${offset}, limit: ${limit})`);
      
      const milestones: Milestone[] = [];
      let foundMilestones = 0;
      let totalMilestones = 0;
      
      // Scan through milestones to find total and paginate
      for (let i = 1; i <= 100; i++) { // Reasonable upper limit
        const milestone = await fetchMilestoneById(contractId, i);
        if (milestone === null) break; // No more milestones
        
        totalMilestones++;
        
        // Check if this milestone should be included based on pagination
        if (foundMilestones >= offset && milestones.length < limit) {
          milestones.push(milestone);
          console.log(`✅ Added paginated milestone ${milestone.id} (${milestones.length}/${limit})`);
        }
        foundMilestones++;
        
        // Stop if we've collected enough milestones for this page
        if (milestones.length >= limit && foundMilestones > offset + limit) {
          break;
        }
      }
      
      const hasMore = totalMilestones > offset + limit;
      
      const result: PaginatedMilestonesResult = {
        milestones,
        hasMore,
        total: totalMilestones,
        offset,
        limit
      };
      
      console.log(`🎯 MILESTONE PAGINATION RESULT: Found ${totalMilestones} total milestones, returning ${milestones.length} (offset: ${offset}, hasMore: ${hasMore})`);
      
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching paginated milestones for contract ${contractId}:`, error);
      return {
        milestones: [],
        hasMore: false,
        total: 0,
        offset,
        limit
      };
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
          functionArgs: [contractId], // ✅ FIX: Use plain number instead of uintCV for proxy
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

  // Paginated version for contracts
  const fetchUserContractsPaginated = useCallback(async (options: ContractsFetchOptions): Promise<PaginatedContractsResult> => {
    const { offset = 0, limit = 10, userAddress: targetAddress } = options;
    const address = targetAddress || userAddress;
    
    if (!address) {
      return {
        contracts: [],
        hasMore: false,
        total: 0,
        offset,
        limit
      };
    }

    try {
      console.log(`📄 Fetching paginated contracts for user ${address} (offset: ${offset}, limit: ${limit})`);
      
      const totalContracts = await fetchTotalContractsCount();
      console.log(`📊 Total contracts on blockchain: ${totalContracts}`);
      
      const userContracts: Contract[] = [];
      let foundContracts = 0;
      
      // We need to scan through contracts to find user's contracts since we can't directly query by user
      // Start scanning from contract 1, but collect based on pagination of found contracts
      const batchSize = 3;
      let shouldStop = false;
      
      for (let i = 1; i <= totalContracts && !shouldStop; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, totalContracts + 1); j++) {
          batch.push(fetchContractByIdInternal(j));
        }
        
        const batchResults = await Promise.all(batch);
        
        for (const contract of batchResults) {
          if (contract && (contract.client === address || contract.freelancer === address)) {
            // Check if this contract should be included based on pagination
            if (foundContracts >= offset && userContracts.length < limit) {
              userContracts.push(contract);
              console.log(`✅ Added paginated contract ${contract.id} (${userContracts.length}/${limit})`);
            }
            foundContracts++;
            
            // Stop if we've collected enough contracts for this page
            if (userContracts.length >= limit) {
              shouldStop = true;
              break;
            }
          }
        }
        
        // Add delay between batches
        if (i + batchSize <= totalContracts && !shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const hasMore = foundContracts > offset + limit;
      
      console.log(`🎯 PAGINATION RESULT: Found ${foundContracts} total user contracts, returning ${userContracts.length} (offset: ${offset}, hasMore: ${hasMore})`);
      
      return {
        contracts: userContracts,
        hasMore,
        total: foundContracts,
        offset,
        limit
      };
    } catch (error) {
      console.error('❌ Error fetching paginated user contracts:', error);
      return {
        contracts: [],
        hasMore: false,
        total: 0,
        offset,
        limit
      };
    }
  }, [fetchTotalContractsCount, fetchContractByIdInternal, userAddress]);

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
    // refetchInterval: isPollingEnabled ? 30000 : false, // Poll every 30 seconds if enabled
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
  }, [isSignedIn, userData, userAddress, queryClient]); // ✅ FIXED: Proper dependencies

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
  }, [isSignedIn, userData, userAddress, queryClient]);

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
  }, [isSignedIn, userData, userAddress, queryClient]);

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
      fetchUserContractsPaginated: () => Promise.resolve({
        contracts: [],
        hasMore: false,
        total: 0,
        offset: 0,
        limit: 10
      }),
      fetchMilestonesPaginated: () => Promise.resolve({
        milestones: [],
        hasMore: false,
        total: 0,
        offset: 0,
        limit: 10
      }),
      fetchTotalContractsCount: () => Promise.resolve(0),
      createEscrow: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      addMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      submitMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      approveMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      rejectMilestone: () => Promise.resolve({ success: false, error: 'Not mounted' }),
      enableRealTimeUpdates: () => {},
      disableRealTimeUpdates: () => {},
      isPollingEnabled: false,
      validateAddress: () => false,
      enableActivePolling: () => {},
      disableActivePolling: () => {},
      debugContractSystem: () => {},
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
    
    // Paginated operations
    fetchUserContractsPaginated,
    fetchMilestonesPaginated,
    fetchTotalContractsCount,
    
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
