'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { useOrganizations, Organization, OrganizationMember } from '@/hooks/useOrganizations';
import { usePagination } from '@/hooks/usePagination';
import { LoadMoreButton } from '@/components/ui/LoadMoreButton';
import { OrganizationSkeleton, ErrorState } from '@/components/ui/LoadingSkeleton';
import { 
  Users, 
  Plus,
  Building,
  Crown,
  Shield,
  Calendar,
  Edit3,
  Trash2,
  UserPlus,
  Search
} from 'lucide-react';

export default function OrganizationsPage() {
  const router = useRouter();
  const { isSignedIn, loading } = useStacks();
  const { 
    loadOrganizationsPaginated,
    createOrganization,
    addMember: addOrgMember,
    loadMembers 
  } = useOrganizations();
  
  const [mounted, setMounted] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Pagination setup for organizations
  const { pagination, actions } = usePagination(
    { limit: 6, initialOffset: 0 },
    async (offset, limit) => {
      const result = await loadOrganizationsPaginated({ offset, limit });
      return {
        hasMore: result.hasMore,
        total: result.total
      };
    }
  );

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });
  const [memberForm, setMemberForm] = useState({
    address: '',
    role: 'member' as 'admin' | 'member'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  // Advanced load organizations with error handling
  const loadOrganizations = async () => {
    if (!isSignedIn || isLoadingOrgs) return;
    
    try {
      setIsLoadingOrgs(true);
      actions.setLoading(true);
      setLoadingError(null);
      
      console.log('📋 Loading organizations with pagination...');
      const result = await loadOrganizationsPaginated({ 
        offset: pagination.offset, 
        limit: pagination.limit 
      });
      
      if (pagination.offset === 0) {
        // First load - replace organizations
        setAllOrganizations(result.organizations);
        console.log(`✅ Loaded ${result.organizations.length} organizations`);
      } else {
        // Load more - append organizations
        setAllOrganizations(prev => {
          const newOrgs = [...prev, ...result.organizations];
          console.log(`✅ Added ${result.organizations.length} more organizations (total: ${newOrgs.length})`);
          return newOrgs;
        });
      }
      
      actions.setHasMore(result.hasMore);
      if (result.total !== undefined) {
        actions.setTotal(result.total);
      }
      
      // Success - no need to track retry count
    } catch (error: any) {
      console.error('❌ Failed to load organizations:', error);
      setLoadingError(error.message || 'Failed to load organizations');
      
      // If this is the first load and it failed, show empty state
      if (pagination.offset === 0) {
        setAllOrganizations([]);
      }
    } finally {
      setIsLoadingOrgs(false);
      actions.setLoading(false);
    }
  };

  // Retry function
  const handleRetry = () => {
    setLoadingError(null);
    actions.reset();
    setAllOrganizations([]);
    setIsLoadingOrgs(false); // Reset loading guard
    setHasInitiallyLoaded(false); // Allow retry to reload
    setTimeout(() => {
      loadOrganizations();
    }, 100);
  };

  // Load more organizations
  const handleLoadMore = async () => {
    await actions.loadMore();
    await loadOrganizations();
  };

  // Initial load - only run once
  useEffect(() => {
    if (mounted && isSignedIn && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
      loadOrganizations();
    }
  }, [mounted, isSignedIn, hasInitiallyLoaded]); // Only depend on basic conditions

  // Reset when user changes
  useEffect(() => {
    if (isSignedIn) {
      actions.reset();
      setAllOrganizations([]);
      setHasInitiallyLoaded(false); // Allow reload for new user
    }
  }, [isSignedIn]); // Remove actions dependency

  const loadMembersForOrg = async (orgId: number) => {
    try {
      const orgMembers = await loadMembers(orgId);
      setMembers(orgMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleCreateOrganization = async () => {
    if (!createForm.name.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await createOrganization({
        name: createForm.name,
        description: createForm.description
      });
      
      setCreateForm({ name: '', description: '' });
      setShowCreateModal(false);
      
      // Reset pagination and reload organizations
      actions.reset();
      setAllOrganizations([]);
      setTimeout(() => {
        loadOrganizations();
      }, 2000); // Wait for blockchain confirmation
      
    } catch (error) {
      console.error('Failed to create organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.address.trim() || !selectedOrg || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await addOrgMember({
        orgId: selectedOrg.id,
        address: memberForm.address,
        role: memberForm.role
      });
      
      setMemberForm({ address: '', role: 'member' });
      setShowMemberModal(false);
      
      // Reload members for the selected org
      if (selectedOrg) {
        await loadMembersForOrg(selectedOrg.id);
      }
      
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please check the address and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrganizations = allOrganizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
              <p className="text-gray-600 mt-1">
                Manage your organizations and team members
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organizations List */}
          <div className="lg:col-span-2">
            {/* Loading State */}
            {pagination.loading && pagination.offset === 0 ? (
              <OrganizationSkeleton count={3} />
            ) : loadingError ? (
              <ErrorState 
                message={`Network error: ${loadingError}. Please check your connection and try again.`}
                onRetry={handleRetry}
              />
            ) : filteredOrganizations.length === 0 && !pagination.loading ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Building className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No organizations found' : 'No organizations yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? `No organizations match "${searchTerm}"`
                    : "Create your first organization to start managing team contracts."
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Organization
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredOrganizations.map((org) => (
                    <motion.div
                      key={org.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedOrg?.id === org.id ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedOrg(org);
                        loadMembersForOrg(org.id);
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Building className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getRoleIcon(org.role)}
                              <span className="capitalize">{org.role}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {org.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {org.description}
                      </p>
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{org.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Created {formatDate(org.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          Owner: {formatAddress(org.owner)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Load More Button */}
                {!searchTerm && (
                  <LoadMoreButton
                    pagination={pagination}
                    onLoadMore={handleLoadMore}
                    className="mt-6"
                  >
                    Load More Organizations
                  </LoadMoreButton>
                )}
              </div>
            )}
          </div>

          {/* Organization Details Panel */}
          <div className="lg:col-span-1">
            {selectedOrg ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedOrg.name}
                  </h3>
                  {selectedOrg.isOwner && (
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-6">
                  {selectedOrg.description}
                </p>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900">Team Members</h4>
                    <div className="flex items-center gap-2">
                      {(selectedOrg.isOwner || selectedOrg.role === 'admin') && (
                        <button
                          onClick={() => setShowMemberModal(true)}
                          disabled={isProcessing}
                          className="text-orange-600 hover:text-orange-700 disabled:opacity-50 text-sm flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Add Member
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {members.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatAddress(member.address)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Added {formatDate(member.addedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          <span className="text-xs font-medium capitalize">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Select an organization to view details and manage members
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => !isProcessing && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Organization
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter organization name"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your organization"
                    disabled={isProcessing}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrganization}
                  disabled={!createForm.name.trim() || isProcessing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showMemberModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => !isProcessing && setShowMemberModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Team Member
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={memberForm.address}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' }))}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowMemberModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!memberForm.address.trim() || isProcessing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}