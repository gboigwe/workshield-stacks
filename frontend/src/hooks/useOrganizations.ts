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
import { getNetwork, CONTRACTS, parseContractId, makeSmartApiCall, getCachedData, setCachedData, contractCache } from './useStacksNetwork';

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

export function useOrganizations() {
  const { isSignedIn, userData } = useStacks();
  const network = getNetwork();
  const escrowContract = parseContractId(CONTRACTS.ESCROW);
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  // Fetch total organizations count 
  const fetchTotalOrganizations = useCallback(async (): Promise<number> => {
    const cacheKey = 'totalOrganizations';
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log('🔍 Fetching total organizations from:', `${escrowContract.address}.${escrowContract.name}`);
      
      const result = await makeSmartApiCall(
        () => fetchCallReadOnlyFunction({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-next-organization-id',
          functionArgs: [],
          senderAddress: escrowContract.address,
        }),
        '/get-next-organization-id',
        {
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-next-organization-id',
          functionArgs: [],
          senderAddress: escrowContract.address,
        }
      );

      const totalOrgs = result.value ? parseInt(result.value) - 1 : 0; // next-id - 1 = total created
      console.log('📊 Total organizations found:', totalOrgs);
      
      setCachedData(cacheKey, totalOrgs);
      return totalOrgs;
    } catch (error: any) {
      console.warn('⚠️ Could not fetch total organizations:', error.message);
      return 0;
    }
  }, [escrowContract.address, escrowContract.name, network]);

  // Fetch organization by ID
  const fetchOrganizationById = useCallback(async (orgId: number): Promise<Organization | null> => {
    const cacheKey = `organization-${orgId}`;
    const cached = getCachedData<Organization>(cacheKey);
    if (cached !== null) return cached;

    try {
      console.log('🔍 Fetching organization ID:', orgId);

      const result = await makeSmartApiCall(
        () => fetchCallReadOnlyFunction({
          network,
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-organization',
          functionArgs: [uintCV(orgId)],
          senderAddress: escrowContract.address,
        }),
        '/get-organization',
        {
          contractAddress: escrowContract.address,
          contractName: escrowContract.name,
          functionName: 'get-organization',
          functionArgs: [orgId],
          senderAddress: escrowContract.address,
        }
      );

      if (result && result.value) {
        const orgData = cvToJSON(result);
        const data = orgData.value.value || orgData.value;
        
        // Check if user is member/owner of this org
        const membershipResult = await makeSmartApiCall(
          () => fetchCallReadOnlyFunction({
            network,
            contractAddress: escrowContract.address,
            contractName: escrowContract.name,
            functionName: 'get-organization-member',
            functionArgs: [uintCV(orgId), principalCV(userAddress!)],
            senderAddress: escrowContract.address,
          }),
          '/get-organization-member',
          {
            contractAddress: escrowContract.address,
            contractName: escrowContract.name,
            functionName: 'get-organization-member',
            functionArgs: [orgId, userAddress],
            senderAddress: escrowContract.address,
          }
        );

        const memberData = membershipResult && membershipResult.value ? cvToJSON(membershipResult) : null;
        const isOwner = data.owner?.value === userAddress || data.owner === userAddress;
        const role = memberData?.value?.value?.role?.value || memberData?.value?.role || (isOwner ? 'owner' : 'member');

        const organization: Organization = {
          id: orgId,
          name: data.name?.value || data.name || '',
          description: data.description?.value || data.description || '',
          owner: data.owner?.value || data.owner || '',
          active: data.active?.value ?? data.active ?? true,
          createdAt: parseInt(data['created-at']?.value || data['created-at'] || '0') * 1000, // Convert to JS timestamp
          memberCount: 1, // TODO: Implement proper member count
          isOwner,
          role: role as 'owner' | 'admin' | 'member'
        };

        console.log('✅ Fetched organization:', organization);
        setCachedData(cacheKey, organization);
        return organization;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Error fetching organization:', orgId, error);
      return null;
    }
  }, [escrowContract.address, escrowContract.name, network, userAddress]);

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

  // Create new organization
  const createOrganization = useCallback(async (params: CreateOrganizationParams) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      // Use the openContractCall pattern from existing hooks
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'create-organization',
        functionArgs: [
          stringAsciiCV(params.name),
          stringUtf8CV(params.description)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Organization creation transaction:', data.txId);
          // Clear cache and refresh organizations list after transaction
          contractCache.clear();
          setTimeout(() => {
            // Clear specific caches
            contractCache.delete('totalOrganizations');
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
  }, [isSignedIn, userData, network, loadOrganizations]);

  // Add member to organization
  const addMember = useCallback(async (params: AddMemberParams) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'add-organization-member',
        functionArgs: [
          uintCV(params.orgId),
          principalCV(params.address),
          stringAsciiCV(params.role)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Add member transaction:', data.txId);
          // Clear organization cache and reload
          contractCache.delete(`organization-${params.orgId}`);
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
  }, [isSignedIn, userData, network, loadOrganizations]);

  // Remove member from organization  
  const removeMember = useCallback(async (orgId: number, address: string) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'remove-organization-member',
        functionArgs: [
          uintCV(orgId),
          principalCV(address)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Remove member transaction:', data.txId);
          // Clear organization cache and reload
          contractCache.delete(`organization-${orgId}`);
          setTimeout(() => loadOrganizations(), 2000);
        },
        onCancel: () => {
          console.log('Remove member cancelled');
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to remove member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userData, network, loadOrganizations]);

  // Update organization details
  const updateOrganization = useCallback(async (orgId: number, name: string, description: string) => {
    if (!isSignedIn || !userData) throw new Error('User not signed in');
    
    try {
      setLoading(true);
      
      await openContractCall({
        network,
        anchorMode: AnchorMode.Any,
        contractAddress: escrowContract.address,
        contractName: escrowContract.name,
        functionName: 'update-organization',
        functionArgs: [
          uintCV(orgId),
          stringAsciiCV(name),
          stringUtf8CV(description)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log('Update organization transaction:', data.txId);
          // Clear organization cache and reload
          contractCache.delete(`organization-${orgId}`);
          setTimeout(() => loadOrganizations(), 2000);
        },
        onCancel: () => {
          console.log('Update organization cancelled');
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to update organization:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userData, network, loadOrganizations]);

  // Load organization members
  const loadMembers = useCallback(async (orgId: number): Promise<OrganizationMember[]> => {
    if (!isSignedIn) return [];
    
    try {
      // TODO: In a real implementation, we would need to track members
      // For now, return mock data
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
  }, [isSignedIn, userAddress]); // Removed loadOrganizations to prevent infinite loop

  return {
    organizations,
    loading,
    error,
    loadOrganizations,
    createOrganization,
    addMember,
    removeMember,
    updateOrganization,
    loadMembers
  };
}