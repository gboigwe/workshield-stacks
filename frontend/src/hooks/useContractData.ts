'use client';

import { useCallback } from 'react';
import { 
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
} from '@stacks/transactions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract, Milestone } from '@/types';
import { 
  getNetwork, 
  CONTRACTS, 
  parseContractId, 
  makeSmartApiCall, 
  convertSmartContractTimeToTimestamp,
  getCachedData,
  setCachedData,
  contractCache
} from './useStacksNetwork';
import { QUERY_KEYS, QUERY_CONFIG } from './useStacksQuery';

const network = getNetwork();
const escrowContract = parseContractId(CONTRACTS.ESCROW);

export const useContractData = (userAddress: string | null, isSignedIn: boolean) => {
  const queryClient = useQueryClient();

  // Core fetch functions
  const fetchTotalContractsCount = useCallback(async (): Promise<number> => {
    const cacheKey = 'totalContracts';
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log('🔍 Attempting to fetch total contracts from:', `${escrowContract.address}.${escrowContract.name}`);
      
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
    } catch (error: any) {
      console.warn('⚠️ Could not fetch total contracts, using fallback. Error:', error.message);
      
      // If the function doesn't exist, return a reasonable fallback
      if (error.message?.includes('NoSuchFunction') || error.message?.includes('NoSuchContract')) {
        console.log('📝 Contract function not available, using mock data for testing');
        return 2; // Return mock count for testing
      }
      
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
          functionArgs: [contractId, milestoneId],
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
          functionArgs: [contractId],
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

  // React Query hook for contracts
  const {
    data: allContracts = [],
    isLoading: contractsLoading,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: QUERY_KEYS.contracts(userAddress || ''),
    queryFn: () => fetchUserContractsInternal(userAddress!),
    enabled: !!userAddress && isSignedIn,
    ...QUERY_CONFIG,
  });

  // Derived state
  const clientContracts = allContracts.filter(contract => contract.client === userAddress);
  const freelancerContracts = allContracts.filter(contract => contract.freelancer === userAddress);

  // Refresh function
  const refreshContracts = useCallback(async () => {
    if (!userAddress) return;
    
    console.log('🔄 Refreshing contracts...');
    contractCache.clear();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(userAddress) });
    await refetchContracts();
  }, [userAddress, queryClient, refetchContracts]);

  return {
    // Data
    allContracts,
    clientContracts,
    freelancerContracts,
    
    // Loading state
    loading: contractsLoading,
    
    // Functions
    fetchUserContracts: fetchUserContractsInternal,
    fetchContractById: fetchContractByIdInternal,
    fetchMilestonesByContract,
    refreshContracts,
    refetchContracts,
  };
};