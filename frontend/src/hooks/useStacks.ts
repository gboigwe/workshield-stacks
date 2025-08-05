'use client';

import { getNetwork, CONTRACTS } from './useStacksNetwork';
import { useStacksAuth } from './useStacksAuth';
import { useStacksQuery } from './useStacksQuery';
import { useContractData } from './useContractData';
import { useContractActions } from './useContractActions';

export const useStacks = () => {
  // 1. Authentication & Session Management
  const {
    mounted,
    userData,
    isSignedIn,
    userAddress,
    connectWallet,
    disconnectWallet,
    validateAddress,
  } = useStacksAuth();

  // 2. Query Management & Real-time Controls
  const {
    isPollingEnabled,
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    enableActivePolling,
    disableActivePolling,
  } = useStacksQuery();

  // 3. Contract Data Fetching
  const {
    allContracts,
    clientContracts,
    freelancerContracts,
    loading,
    fetchUserContracts,
    fetchContractById,
    fetchMilestonesByContract,
    refreshContracts,
  } = useContractData(userAddress, isSignedIn);

  // 4. Contract Actions & Transactions
  const {
    transactionInProgress,
    createEscrow,
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    debugContractSystem,
  } = useContractActions(isSignedIn, userData, userAddress);

  // 5. Network Configuration
  const network = getNetwork();

  // Handle unmounted state - return safe defaults
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
      isPollingEnabled: false,
      validateAddress: () => false,
      enableActivePolling: () => {},
      disableActivePolling: () => {},
      debugContractSystem: () => {},
    };
  }

  // Return the complete interface - maintains backward compatibility
  return {
    // User & Authentication
    userData,
    isSignedIn,
    loading,
    transactionInProgress,
    userAddress,
    
    // Contract Arrays
    clientContracts,
    freelancerContracts,
    allContracts,
    
    // Network & Configuration
    network,
    contracts: CONTRACTS,
    
    // Authentication Actions
    connectWallet,
    disconnectWallet,
    refreshContracts,
    
    // Contract Data Operations
    fetchUserContracts,
    fetchContractById,
    fetchMilestonesByContract,
    
    // Contract Creation & Management
    createEscrow,
    
    // Milestone Operations
    addMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    
    // Real-time Controls
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    isPollingEnabled,
    
    // Utilities
    validateAddress,
    enableActivePolling,
    disableActivePolling,
    debugContractSystem,
  };
};