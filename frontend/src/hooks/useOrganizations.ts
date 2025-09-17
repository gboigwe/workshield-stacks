'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStacks } from './useStacks';
import { 
  fetchCallReadOnlyFunction,
  cvToJSON,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  principalCV
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';

// Advanced caching and retry system
const organizationCache = new Map<string, { data: any; timestamp: number; attempts: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_CACHE_DURATION = 30 * 1000; // 30 seconds for failed requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Enhanced cache functions with retry tracking
const getCachedData = <T>(key: string): T | null => {
  const cached = organizationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = <T>(key: string, data: T, isError = false) => {
  const attempts = organizationCache.get(key)?.attempts || 0;
  organizationCache.set(key, { 
    data, 
    timestamp: Date.now(), 
    attempts: isError ? attempts + 1 : 0 
  });
};

const shouldRetry = (key: string): boolean => {
  const cached = organizationCache.get(key);
  if (!cached) return true;
  
  const timeSinceLastAttempt = Date.now() - cached.timestamp;
  const hasRecentError = timeSinceLastAttempt < RETRY_CACHE_DURATION;
  const hasExceededRetries = cached.attempts >= MAX_RETRIES;
  
  return !hasRecentError || !hasExceededRetries;
};

// Retry helper function
const withRetry = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.log(`⏳ Retrying operation in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 1.5); // Exponential backoff
    }
    throw error;
  }
};

export interface Organization {
  id: number;
  name: string;
  description: string;
  owner: string;
  active: boolean;
  createdAt: number;
  memberCount: number;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'member';
}

export interface OrganizationMember {
  address: string;
  role: 'owner' | 'admin' | 'member';
  addedAt: number;
  addedBy: string;
}

export interface CreateOrganizationParams {
  name: string;
  description: string;
}

export interface AddMemberParams {
  orgId: number;
  address: string;
  role: 'admin' | 'member';
}

export interface PaginatedOrganizationsResult {
  organizations: Organization[];
  hasMore: boolean;
  total?: number;
  offset: number;
  limit: number;
}

export interface OrganizationsFetchOptions {
  offset?: number;
  limit?: number;
  userAddress?: string;
}

export function useOrganizations() {
  const { isSignedIn, userData, network, contracts } = useStacks();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
  
  // Parse contract address from the contracts object
  const escrowContractId = contracts?.ESCROW || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-test-v3';
  const [contractAddress, contractName] = escrowContractId.split('.');

  // Advanced fetch total organizations with retry logic
  const fetchTotalOrganizations = useCallback(async (): Promise<number> => {
    const cacheKey = 'totalOrganizations';
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;

    if (!shouldRetry(cacheKey)) {
      console.log('🚫 Skipping total organizations fetch - too many recent failures');
      return 0;
    }

    try {
      console.log('🔍 Fetching total organizations from:', `${contractAddress}.${contractName}`);
      
      const result = await withRetry(async () => {
        return await fetchCallReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-next-organization-id',
          functionArgs: [],
          senderAddress: contractAddress,
        });
      });

      const totalOrgs = result ? parseInt(cvToJSON(result).value) - 1 : 0;
      console.log('✅ Total organizations found:', totalOrgs);
      
      setCachedData(cacheKey, totalOrgs);
      return totalOrgs;
    } catch (error: any) {
      console.error('❌ Failed to fetch total organizations after retries:', error.message);
      setCachedData(cacheKey, 0, true); // Cache error state
      return 0;
    }
  }, [contractAddress, contractName, network]);

  // Fetch organization by ID
  const fetchOrganizationById = useCallback(async (orgId: number): Promise<Organization | null> => {
    const cacheKey = `organization-${orgId}`;
    const cached = getCachedData<Organization>(cacheKey);
    if (cached !== null) return cached;

    if (!shouldRetry(cacheKey)) {
      console.log(`🚫 Skipping organization ${orgId} fetch - too many recent failures`);
      return null;
    }

    try {
      console.log('🔍 Fetching organization ID:', orgId);

      const result = await withRetry(async () => {
        return await fetchCallReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-organization',
          functionArgs: [uintCV(orgId)],
          senderAddress: contractAddress,
        });
      });

      if (result) {
        const orgData = cvToJSON(result);
        const data = orgData.value?.value || orgData.value;
        
        // Only check membership if user is signed in and we have an address
        let memberData = null;
        let isOwner = false;
        let role = 'member';
        
        if (userAddress) {
          try {
            const membershipResult = await withRetry(async () => {
              return await fetchCallReadOnlyFunction({
                network,
                contractAddress,
                contractName,
                functionName: 'get-organization-member',
                functionArgs: [uintCV(orgId), principalCV(userAddress)],
                senderAddress: contractAddress,
              });
            });
            
            memberData = membershipResult ? cvToJSON(membershipResult) : null;
            isOwner = data.owner?.value === userAddress || data.owner === userAddress;
            role = memberData?.value?.value?.role?.value || memberData?.value?.role || (isOwner ? 'owner' : 'member');
          } catch (memberError) {
            console.warn(`⚠️ Could not fetch membership for org ${orgId}:`, memberError);
            isOwner = data.owner?.value === userAddress || data.owner === userAddress;
            role = isOwner ? 'owner' : 'member';
          }
        }

        const organization: Organization = {
          id: orgId,
          name: data.name?.value || data.name || `Organization ${orgId}`,
          description: data.description?.value || data.description || '',
          owner: data.owner?.value || data.owner || '',
          active: data.active?.value ?? data.active ?? true,
          createdAt: parseInt(data['created-at']?.value || data['created-at'] || '0') * 1000 || Date.now(),
          memberCount: parseInt(data['member-count']?.value || data['member-count'] || '1'),
          isOwner,
          role: role as 'owner' | 'admin' | 'member'
        };

        console.log(`✅ Fetched organization ${orgId}:`, organization.name);
        setCachedData(cacheKey, organization);
        return organization;
      }
      
      console.log(`❌ No data found for organization ${orgId}`);
      setCachedData(cacheKey, null, true);
      return null;
    } catch (error: any) {
      console.error(`❌ Error fetching organization: ${orgId}`, error);
      setCachedData(cacheKey, null, true);
      return null;
    }
  }, [contractAddress, contractName, network, userAddress]);

  // Load user's organizations
  const loadOrganizations = useCallback(async () => {
    if (!isSignedIn || !userAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Loading organizations for user:', userAddress);
      
      const totalOrgs = await fetchTotalOrganizations();
      console.log('📊 Checking', totalOrgs, 'organizations for user membership...');
      
      const userOrganizations: Organization[] = [];
      
      // Check each organization to see if user is a member
      for (let i = 1; i <= totalOrgs; i++) {
        const org = await fetchOrganizationById(i);
        if (org && (org.owner === userAddress || org.isOwner || org.role === 'admin' || org.role === 'owner')) {
          userOrganizations.push(org);
          console.log('✅ User is member of organization:', org.name, '(Role:', org.role + ')');
        }
      }
      
      console.log('🎯 RESULT: Found', userOrganizations.length, 'organizations for user');
      setOrganizations(userOrganizations);
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userAddress, fetchTotalOrganizations, fetchOrganizationById]);

  // Advanced paginated organizations with timeout and better error handling
  const loadOrganizationsPaginated = useCallback(async (options: OrganizationsFetchOptions): Promise<PaginatedOrganizationsResult> => {
    const { offset = 0, limit = 10, userAddress: targetAddress } = options;
    const address = targetAddress || userAddress;
    
    if (!isSignedIn || !address) {
      return {
        organizations: [],
        hasMore: false,
        total: 0,
        offset,
        limit
      };
    }

    const TIMEOUT_MS = 15000; // 15 second timeout
    const timeoutPromise = new Promise<PaginatedOrganizationsResult>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out - please check your network connection')), TIMEOUT_MS);
    });

    const fetchPromise = async (): Promise<PaginatedOrganizationsResult> => {
      try {
        console.log(`📄 Fetching paginated organizations for user ${address} (offset: ${offset}, limit: ${limit})`);
        
        const totalOrgs = await fetchTotalOrganizations();
        console.log(`📊 Total organizations on blockchain: ${totalOrgs}`);
        
        if (totalOrgs === 0) {
          return {
            organizations: [],
            hasMore: false,
            total: 0,
            offset,
            limit
          };
        }
        
        const userOrganizations: Organization[] = [];
        let foundOrganizations = 0;
        const maxScan = Math.min(totalOrgs, 50); // Limit scanning to 50 orgs for performance
        
        // Process organizations in batches for better performance
        const batchSize = 5;
        for (let i = 1; i <= maxScan; i += batchSize) {
          const batch = [];
          for (let j = i; j < Math.min(i + batchSize, maxScan + 1); j++) {
            batch.push(fetchOrganizationById(j));
          }
          
          const batchResults = await Promise.allSettled(batch);
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) {
              const org = result.value;
              if (org.owner === address || org.isOwner || org.role === 'admin' || org.role === 'owner') {
                // Check if this organization should be included based on pagination
                if (foundOrganizations >= offset && userOrganizations.length < limit) {
                  userOrganizations.push(org);
                  console.log(`✅ Added paginated organization ${org.name} (${userOrganizations.length}/${limit})`);
                }
                foundOrganizations++;
                
                // Stop if we've collected enough organizations for this page
                if (userOrganizations.length >= limit) {
                  break;
                }
              }
            }
          }
          
          // Break out of outer loop if we have enough
          if (userOrganizations.length >= limit) {
            break;
          }
          
          // Add a small delay between batches to avoid overwhelming the API
          if (i + batchSize <= maxScan) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        const hasMore = foundOrganizations > offset + limit;
        
        console.log(`🎯 ORGANIZATION PAGINATION RESULT: Found ${foundOrganizations} total user organizations, returning ${userOrganizations.length} (offset: ${offset}, hasMore: ${hasMore})`);
        
        return {
          organizations: userOrganizations,
          hasMore,
          total: foundOrganizations,
          offset,
          limit
        };
      } catch (error: any) {
        console.error('❌ Error fetching paginated organizations:', error);
        throw new Error(`Failed to load organizations: ${error.message}`);
      }
    };

    try {
      return await Promise.race([fetchPromise(), timeoutPromise]);
    } catch (error: any) {
      console.error('❌ Organization loading failed:', error);
      return {
        organizations: [],
        hasMore: false,
        total: 0,
        offset,
        limit
      };
    }
  }, [isSignedIn, userAddress, fetchTotalOrganizations, fetchOrganizationById]);

  // Create new organization
  const createOrganization = useCallback(async (params: CreateOrganizationParams) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress,
        contractName,
        functionName: 'create-organization',
        functionArgs: [
          stringAsciiCV(params.name),
          stringUtf8CV(params.description)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Organization creation transaction:', data.txId);
          organizationCache.clear();
          setTimeout(() => {
            organizationCache.delete('totalOrganizations');
            loadOrganizations();
          }, 2000);
        },
        onCancel: () => {
          console.log('Organization creation cancelled');
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to create organization:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userData, network, contractAddress, contractName, loadOrganizations]);

  // Add member to organization
  const addMember = useCallback(async (params: AddMemberParams) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress,
        contractName,
        functionName: 'add-organization-member',
        functionArgs: [
          uintCV(params.orgId),
          principalCV(params.address),
          stringAsciiCV(params.role)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Add member transaction:', data.txId);
          organizationCache.delete(`organization-${params.orgId}`);
          setTimeout(() => loadOrganizations(), 2000);
        },
        onCancel: () => {
          console.log('Add member cancelled');
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to add member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userData, network, contractAddress, contractName, loadOrganizations]);

  // Load organization members
  const loadMembers = useCallback(async (orgId: number): Promise<OrganizationMember[]> => {
    if (!isSignedIn) return [];
    
    try {
      // For now, return simplified mock data since full member tracking requires additional backend
      // TODO: Implement proper member fetching using orgId
      console.log('Loading members for organization:', orgId);
      const mockMembers: OrganizationMember[] = [
        {
          address: userAddress || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
          role: "owner",
          addedAt: Date.now() - 86400000 * 30,
          addedBy: userAddress || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
        }
      ];
      
      return mockMembers;
    } catch (err) {
      console.error('Failed to load members:', err);
      return [];
    }
  }, [isSignedIn, userAddress]);

  // Auto-load organizations when user signs in
  useEffect(() => {
    if (isSignedIn && userAddress) {
      loadOrganizations();
    }
  }, [isSignedIn, userAddress, loadOrganizations]);

  return {
    organizations,
    loading,
    error,
    loadOrganizations,
    loadOrganizationsPaginated,
    createOrganization,
    addMember,
    loadMembers,
    fetchTotalOrganizations,
    fetchOrganizationById
  };
}