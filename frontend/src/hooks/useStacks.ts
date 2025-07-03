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
  PostConditionMode
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { Contract, Milestone, MilestoneStatus, TransactionResponse } from '@/types';

// // Rate limiting protection
// const API_CALL_DELAY = 1000; // 1 second between API calls
// let lastApiCall = 0;

// const delayApiCall = async () => {
//   const now = Date.now();
//   const timeSinceLastCall = now - lastApiCall;
//   if (timeSinceLastCall < API_CALL_DELAY) {
//     await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY - timeSinceLastCall));
//   }
//   lastApiCall = Date.now();
// };

// Initialize App Config and Session
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Network configuration with Hiro API key
const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY;
  
  console.log(`🌐 Network: ${networkType}, API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}`);
  
  // Get the base network configuration
  const baseNetwork = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
  
  // If no API key, return the base network
  if (!apiKey) {
    console.log('⚠️ No API key found - using default network configuration');
    return baseNetwork;
  }
  
  // Create enhanced network configuration with API key
  const enhancedNetwork = {
    ...baseNetwork,
    // Add custom fetch function that includes the API key
    fetchFn: async (url: string, init?: RequestInit) => {
      const headers = {
        ...init?.headers,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      };
      
      console.log(`📡 Making API call to: ${url.split('?')[0]} with API key`);
      
      return fetch(url, {
        ...init,
        headers,
      });
    }
  };
  
  return enhancedNetwork;
};

const network = getNetwork();

// Enhanced API call function with rate limiting and API key support
const makeApiCall = async (apiCall: () => Promise<any>, retries = 3): Promise<any> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add delay between calls to avoid rate limiting
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await apiCall();
      
      if (attempt > 1) {
        console.log(`✅ API call succeeded on attempt ${attempt}/${retries}`);
      }
      
      return result;
    } catch (error: any) {
      console.log(`❌ API call attempt ${attempt}/${retries} failed:`, error?.message || error);
      
      // If this was the last retry, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Check if it's a rate limit error
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.log('🚦 Rate limit detected, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
};

// Contract Configuration - UPDATED WITH NEW CONTRACT ADDRESS
const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow-v2',
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments',
  DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
};

// Parse contract address and name
const parseContractId = (contractId: string) => {
  const [address, name] = contractId.split('.');
  return { address, name };
};

const escrowContract = parseContractId(CONTRACTS.ESCROW);

// App Details
const appDetails = {
  name: 'WorkShield',
  icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.ico' : '',
};

interface ContractCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// ✅ Enhanced caching with longer cache times
const CACHE_DURATION = 30000; // 30 seconds cache
const isDataFresh = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};
// Rate limiting and caching
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));



const contractCache: ContractCache = {};
// const CACHE_TTL = 30000; // 30 seconds

// Helper functions
// const isDataFresh = (timestamp: number): boolean => {
//   return Date.now() - timestamp < CACHE_TTL;
// };

interface UseStacksReturn {
  userData: any;
  isSignedIn: boolean;
  loading: boolean;
  transactionInProgress: boolean;
  userAddress: string | null;
  
  // Contract arrays - separated by role
  clientContracts: Contract[];
  freelancerContracts: Contract[];
  allContracts: Contract[];
  
  // Network and contracts
  network: any;
  contracts: typeof CONTRACTS;
  
  // Actions
  connectWallet: () => void;
  disconnectWallet: () => void;
  refreshContracts: () => Promise<void>;
  
  // Contract operations
  fetchUserContracts: (userAddress: string) => Promise<Contract[]>;
  fetchContractById: (contractId: number) => Promise<Contract | null>;
  fetchMilestonesByContract: (contractId: number) => Promise<Milestone[]>;
  
  // Enhanced contract creation
  createEscrow: (client: string, freelancer: string, description: string, endDate: number, totalAmount: number) => Promise<TransactionResponse>;
  
  // Milestone operations
  addMilestone: (contractId: number, description: string, amount: number, deadline: number) => Promise<TransactionResponse>;
  submitMilestone: (contractId: number, milestoneIndex: number, submissionNote: string) => Promise<TransactionResponse>;
  approveMilestone: (contractId: number, milestoneIndex: number) => Promise<TransactionResponse>;
  rejectMilestone: (contractId: number, milestoneIndex: number, rejectionReason: string) => Promise<TransactionResponse>;
  
  // Debug function
  debugContractSystem: () => Promise<void>;

  isPollingEnabled: boolean;
  enableRealTimeUpdates: () => void;
  disableRealTimeUpdates: () => void;
}

export const useStacks = (): UseStacksReturn => {
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [clientContracts, setClientContracts] = useState<Contract[]>([]);
  const [freelancerContracts, setFreelancerContracts] = useState<Contract[]>([]);
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);

  // Initialize authentication
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        if (userSession.isSignInPending()) {
          const userData = await userSession.handlePendingSignIn();
          setUserData(userData);
          setIsSignedIn(true);
        } else if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          setUserData(userData);
          setIsSignedIn(true);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Get user address
  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || null;

  // ✅ NEW: Get total contracts using the new contract function
  const getTotalContracts = useCallback(async (): Promise<number> => {
    try {
      console.log('📊 Fetching total contract count from blockchain...');
      
      const result = await fetchCallReadOnlyFunction({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'get-total-contracts',
        functionArgs: [],
        senderAddress: escrowContract.address,
      });

      const totalContractsData = cvToJSON(result);
      const totalContracts = totalContractsData?.value ? parseInt(totalContractsData.value) : 0;
      
      console.log(`📊 Total contracts on blockchain: ${totalContracts}`);
      return totalContracts;
    } catch (error) {
      console.error('❌ Error fetching total contracts:', error);
      return 0;
    }
  }, []);

  // ✅ OPTIMIZED: Fetch milestone by contract and milestone ID
  const fetchMilestoneById = useCallback(async (contractId: number, milestoneId: number): Promise<Milestone | null> => {
    try {
      console.log(`🔍 [DEBUG] Fetching milestone ${contractId}-${milestoneId}`);
      
      const result = await fetchCallReadOnlyFunction({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'get-milestone',
        functionArgs: [uintCV(contractId), uintCV(milestoneId)],
        senderAddress: escrowContract.address,
      });

      const milestoneData = cvToJSON(result);
      
      console.log(`📊 [DEBUG] Raw milestone ${milestoneId} response:`, milestoneData);
      console.log(`📊 [DEBUG] milestoneData.value:`, milestoneData?.value);
      console.log(`📊 [DEBUG] milestoneData.value.value:`, milestoneData?.value?.value);
      
      // Check if milestone exists (handle optional return)
      if (!milestoneData || !milestoneData.value) {
        console.log(`❌ [DEBUG] No milestone data found for ${contractId}-${milestoneId}`);
        return null;
      }
      
      // Handle different possible data structures
      let data;
      if (milestoneData.value.value) {
        // Double nested structure
        data = milestoneData.value.value;
        console.log(`📊 [DEBUG] Using double nested structure:`, data);
      } else {
        // Single nested structure
        data = milestoneData.value;
        console.log(`📊 [DEBUG] Using single nested structure:`, data);
      }
      
      // Log each field individually to see exact structure
      console.log(`📊 [DEBUG] data.status:`, data.status);
      console.log(`📊 [DEBUG] data.amount:`, data.amount);
      console.log(`📊 [DEBUG] data.description:`, data.description);
      console.log(`📊 [DEBUG] data.deadline:`, data.deadline);
      
      // Extract values with fallbacks
      const statusValue = data.status?.value || data.status;
      const amountValue = data.amount?.value || data.amount;
      const descriptionValue = data.description?.value || data.description;
      const deadlineValue = data.deadline?.value || data.deadline;
      
      console.log(`📊 [DEBUG] Extracted values:`);
      console.log(`  status: ${statusValue} (type: ${typeof statusValue})`);
      console.log(`  amount: ${amountValue} (type: ${typeof amountValue})`);
      console.log(`  description: ${descriptionValue} (type: ${typeof descriptionValue})`);
      console.log(`  deadline: ${deadlineValue} (type: ${typeof deadlineValue})`);
      
      const milestone: Milestone = {
        id: milestoneId,
        description: String(descriptionValue || ''),
        amount: parseInt(String(amountValue || '0')),
        deadline: parseInt(String(deadlineValue || '0')),
        status: parseInt(String(statusValue || '0')) as MilestoneStatus,
        submissionNotes: data['submission-note']?.value || data['submission-note'] || undefined,
        rejectionReason: data['rejection-reason']?.value || data['rejection-reason'] || undefined,
        submittedAt: undefined,
        approvedAt: undefined,
      };
      
      console.log(`✅ [DEBUG] Final milestone object:`, milestone);
      console.log(`✅ [DEBUG] milestone.status type check:`, typeof milestone.status, milestone.status);
      
      // Validate that all critical fields are primitive values
      if (typeof milestone.status === 'object') {
        console.error(`🚨 [ERROR] milestone.status is still an object!`, milestone.status);
        throw new Error('Milestone status parsing failed - still an object');
      }
      
      if (typeof milestone.amount === 'object') {
        console.error(`🚨 [ERROR] milestone.amount is still an object!`, milestone.amount);
        throw new Error('Milestone amount parsing failed - still an object');
      }
      
      return milestone;
      
    } catch (error) {
      console.error(`❌ [ERROR] Error fetching milestone ${contractId}-${milestoneId}:`, error);
      return null;
    }
  }, []);

  // ✅ OPTIMIZED: Fetch all milestones for a contract
  const fetchMilestonesByContract = useCallback(async (contractId: number): Promise<Milestone[]> => {
    try {

      // await delayApiCall();
      // First get the milestone count
      const countResult = await makeApiCall(() => fetchCallReadOnlyFunction({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'get-milestone-count',
        functionArgs: [uintCV(contractId)],
        senderAddress: escrowContract.address,
      }));

      const milestoneCount = cvToJSON(countResult);
      const count = milestoneCount?.value ? parseInt(milestoneCount.value) : 0;

      if (count === 0) return [];

      // Fetch all milestones
      const milestones: Milestone[] = [];
      for (let i = 1; i <= count; i++) {
        const milestone = await fetchMilestoneById(contractId, i);
        if (milestone) {
          milestones.push(milestone);
        }
      }

      return milestones;
    } catch (error) {
      console.error(`❌ Error fetching milestones for contract ${contractId}:`, error);
      return [];
    }
  }, [fetchMilestoneById]);

  // ✅ SUPER OPTIMIZED: Fetch contract by ID with milestone loading
  const fetchContractById = useCallback(async (contractId: number): Promise<Contract | null> => {
    const cacheKey = `contract-${contractId}`;
    const cached = contractCache[cacheKey];
    
    if (cached && isDataFresh(cached.timestamp)) {
      return cached.data;
    }

    try {
      console.log(`🔍 Fetching contract ID: ${contractId}`);

      // await delayApiCall();

      const result = await makeApiCall(() => fetchCallReadOnlyFunction({
        network,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'get-contract',
        functionArgs: [uintCV(contractId)],
        senderAddress: escrowContract.address,
      }));

      const contractData = cvToJSON(result);
      console.log(`📊 Raw contract data for ID ${contractId}:`, contractData); // ADD THIS
      
      if (contractData && contractData.value && contractData.value.value) {
        // Fetch milestones for this contract
        const milestones = await fetchMilestonesByContract(contractId);
        
        // 🔧 FIX: Access the nested value structure
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
        
        console.log(`✅ Parsed contract ${contractId}:`, contract);
        console.log(`🔍 Client: ${contract.client}, User: ${userAddress}, Match: ${contract.client === userAddress}`);
        
        contractCache[cacheKey] = { data: contract, timestamp: Date.now() };
        return contract;
      } else {
        console.log(`❌ No contract data found for ID ${contractId}`); // ADD THIS
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error fetching contract ${contractId}:`, error);
      return null;
    }
  }, [fetchMilestonesByContract, userAddress]); // ADD userAddress to dependencies

  const fetchUserContracts = useCallback(async (userAddress: string): Promise<Contract[]> => {
    if (!userAddress) return [];
    
    const cacheKey = `user-contracts-${userAddress}`;
    const cached = contractCache[cacheKey];
    
    if (cached && isDataFresh(cached.timestamp)) {
      console.log(`📋 Using cached contracts for ${userAddress.slice(0, 8)}...`);
      return cached.data;
    }

    console.log(`🚀 SIMPLE: Fetching contracts for user ${userAddress}`);
    
    try {
      const totalContracts = await getTotalContracts();
      console.log(`📊 Checking ${totalContracts} contracts for user involvement...`);
      
      const contracts: Contract[] = [];
      
      for (let i = 1; i <= totalContracts; i++) {
        try {
          const contract = await fetchContractById(i);
          if (contract && (contract.client === userAddress || contract.freelancer === userAddress)) {
            contracts.push(contract);
            console.log(`✅ Added contract ${i} (user is ${contract.client === userAddress ? 'client' : 'freelancer'})`);
          }
        } catch (error) {
          console.error(`❌ Error fetching contract ${i}:`, error);
        }
      }
      
      console.log(`🎯 RESULT: Found ${contracts.length} contracts for user`);
      
      // Cache the results
      contractCache[cacheKey] = { data: contracts, timestamp: Date.now() };
      return contracts;
      
    } catch (error) {
      console.error(`❌ Error in fetchUserContracts:`, error);
      return [];
    }
  }, [fetchContractById, getTotalContracts]);

  // 🔄 KEEP AS FALLBACK: Original method
  const fetchUserContractsFallback = useCallback(async (userAddress: string): Promise<Contract[]> => {
    console.log(`🔄 FALLBACK: Using iteration method for ${userAddress.slice(0, 8)}...`);
    
    try {
      const totalContracts = await getTotalContracts();
      if (totalContracts === 0) return [];
      
      const contracts: Contract[] = [];
      
      for (let i = 1; i <= totalContracts; i++) {
        try {
          const contract = await fetchContractById(i);
          if (contract && (contract.client === userAddress || contract.freelancer === userAddress)) {
            contracts.push(contract);
          }
        } catch (error) {
          console.error(`❌ Error fetching contract ${i}:`, error);
        }
      }
      
      return contracts;
    } catch (error) {
      console.error(`❌ Error in fallback method:`, error);
      return [];
    }
  }, [fetchContractById, getTotalContracts]);

  // Connect wallet
  const connectWallet = useCallback(() => {
    showConnect({
      appDetails,
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
    setClientContracts([]);
    setFreelancerContracts([]);
    window.location.reload();
  }, []);

  // Refresh contracts
  const refreshContracts = useCallback(async () => {
    if (!userAddress) return;
    
    // Clear cache
    Object.keys(contractCache).forEach(key => {
      if (key.includes(userAddress)) {
        delete contractCache[key];
      }
    });
    
    const contracts = await fetchUserContracts(userAddress);
    
    const clientContracts = contracts.filter(c => c.client === userAddress);
    const freelancerContracts = contracts.filter(c => c.freelancer === userAddress);
    
    setClientContracts(clientContracts);
    setFreelancerContracts(freelancerContracts);
  }, [userAddress, fetchUserContracts]);

  useEffect(() => {
    if (!isPollingEnabled || !isSignedIn) return;

    const pollForUpdates = async () => {
      console.log('🔄 Polling for contract updates...');
      
      // Clear some cache to get fresh data (but not all to avoid rate limits)
      const cacheKeys = Object.keys(contractCache);
      const oldCacheKeys = cacheKeys.filter(key => 
        !isDataFresh(contractCache[key].timestamp)
      );
      
      oldCacheKeys.forEach(key => delete contractCache[key]);
      
      // Refresh contracts
      await refreshContracts();
    };

    // Poll every 30 seconds
    const interval = setInterval(pollForUpdates, 30000);

    return () => clearInterval(interval);
  }, [isPollingEnabled, isSignedIn, refreshContracts]);

  // ✅ Enable polling when user navigates to contract details
  const enableRealTimeUpdates = useCallback(() => {
    setIsPollingEnabled(true);
  }, []);

  const disableRealTimeUpdates = useCallback(() => {
    setIsPollingEnabled(false);
  }, []);

  // Load contracts when user is signed in
  useEffect(() => {
    if (isSignedIn && userAddress) {
      refreshContracts();
    }
  }, [isSignedIn, userAddress, refreshContracts]);

  // ✅ ENHANCED: Create escrow with better error handling
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
            
            // 🔧 FIX: Clear cache and refresh multiple times
            Object.keys(contractCache).forEach(key => {
              delete contractCache[key];
            });
            
            // Multiple refresh attempts
            console.log('🔄 Refreshing contracts...');
            setTimeout(() => refreshContracts(), 2000);
            setTimeout(() => refreshContracts(), 5000);
            setTimeout(() => refreshContracts(), 10000);
            
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
  }, [isSignedIn, userData, refreshContracts]);

  // ✅ Add milestone
  const addMilestone = useCallback(async (
    contractId: number,
    description: string,
    amount: number,
    deadline: number
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
    }

    setTransactionInProgress(true);

    try {
      return new Promise((resolve) => {
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
            console.log('✅ Milestone added successfully:', data);
            setTransactionInProgress(false);
            setTimeout(() => refreshContracts(), 2000);
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
  }, [isSignedIn, userData, refreshContracts]);

  // ✅ Submit milestone
  const submitMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number,
    submissionNote: string
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
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
            console.log('✅ Milestone submitted successfully:', data);
            setTransactionInProgress(false);
            setTimeout(() => refreshContracts(), 2000);
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
  }, [isSignedIn, userData, refreshContracts]);

  // ✅ Approve milestone
  const approveMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
    }

    setTransactionInProgress(true);

    try {
      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'approve-milestone',
          functionArgs: [
            uintCV(contractId),
            uintCV(milestoneIndex)
          ],
          postConditions: [],
          postConditionMode: PostConditionMode.Allow,
          onFinish: async (data: any) => {
            console.log('✅ Milestone approved successfully:', data);
            setTransactionInProgress(false);
            
            // ✅ Clear specific contract cache for immediate refresh
            Object.keys(contractCache).forEach(key => {
              if (key.startsWith('contract-') || key.includes('user-contracts')) {
                delete contractCache[key];
              }
            });
            
            // ✅ Immediate refresh without delay
            await refreshContracts();
            
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
  }, [isSignedIn, userData, refreshContracts]);

  // ✅ Reject milestone
  const rejectMilestone = useCallback(async (
    contractId: number,
    milestoneIndex: number,
    rejectionReason: string
  ): Promise<TransactionResponse> => {
    
    if (!isSignedIn || !userData) {
      return { success: false, error: 'Wallet not connected' };
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
            console.log('✅ Milestone rejected successfully:', data);
            setTransactionInProgress(false);
            setTimeout(() => refreshContracts(), 2000);
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
  }, [isSignedIn, userData, refreshContracts]);

  // ✅ Debug function
  const debugContractSystem = useCallback(async () => {
    if (!userAddress) {
      console.log('❌ No user address for debugging');
      return;
    }
    
    console.log('🔧 COMPLETE CONTRACT SYSTEM DEBUG');
    console.log('════════════════════════════════════');
    console.log(`User Address: ${userAddress}`);
    console.log(`Contract: ${escrowContract.address}.${escrowContract.name}`);
    
    try {
      // Test total contracts
      const totalContracts = await getTotalContracts();
      console.log(`📊 Total contracts: ${totalContracts}`);
      
      // Test specific contracts
      for (let i = 1; i <= Math.min(totalContracts, 5); i++) {
        const contract = await fetchContractById(i);
        if (contract) {
          console.log(`✅ Contract ${i}:`, {
            client: contract.client,
            freelancer: contract.freelancer,
            description: contract.description.substring(0, 30) + '...',
            milestones: contract.milestones.length
          });
        }
      }
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  }, [userAddress, getTotalContracts, fetchContractById]);

  return {
    userData,
    isSignedIn,
    loading,
    transactionInProgress,
    userAddress,
    clientContracts,
    freelancerContracts,
    allContracts: [...clientContracts, ...freelancerContracts],
    network,
    contracts: CONTRACTS,
    isPollingEnabled,
    connectWallet,
    disconnectWallet,
    refreshContracts,
    fetchUserContracts,
    fetchContractById,
    fetchMilestonesByContract,
    createEscrow,
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    debugContractSystem,
    enableRealTimeUpdates,
    disableRealTimeUpdates,
  };
};
