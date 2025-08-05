'use client';

import { useState, useCallback } from 'react';

// React Query Configuration
export const QUERY_KEYS = {
  contracts: (userAddress: string) => ['contracts', userAddress],
  contractDetails: (contractId: number) => ['contract', contractId],
  milestones: (contractId: number) => ['milestones', contractId],
  totalContracts: () => ['totalContracts']
};

export const QUERY_CONFIG = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

export const useStacksQuery = () => {
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);

  // Real-time controls
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

  return {
    // Configuration
    QUERY_KEYS,
    QUERY_CONFIG,
    
    // State
    isPollingEnabled,
    
    // Controls
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    enableActivePolling,
    disableActivePolling,
  };
};