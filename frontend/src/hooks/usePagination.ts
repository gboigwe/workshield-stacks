'use client';

import { useState, useCallback } from 'react';

export interface PaginationConfig {
  limit: number;
  initialOffset?: number;
}

export interface PaginationState {
  offset: number;
  limit: number;
  loading: boolean;
  hasMore: boolean;
  total?: number;
}

export interface PaginationActions {
  loadMore: () => Promise<void>;
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setTotal: (total: number) => void;
}

export interface UsePaginationResult {
  pagination: PaginationState;
  actions: PaginationActions;
}

export function usePagination(
  config: PaginationConfig,
  onLoadMore?: (offset: number, limit: number) => Promise<{ hasMore: boolean; total?: number }>
): UsePaginationResult {
  const { limit, initialOffset = 0 } = config;

  const [state, setState] = useState<PaginationState>({
    offset: initialOffset,
    limit,
    loading: false,
    hasMore: true,
    total: undefined,
  });

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      if (onLoadMore) {
        const result = await onLoadMore(state.offset, state.limit);
        setState(prev => ({
          ...prev,
          offset: prev.offset + prev.limit,
          hasMore: result.hasMore,
          total: result.total ?? prev.total,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          offset: prev.offset + prev.limit,
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error loading more items:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.offset, state.limit, state.loading, state.hasMore, onLoadMore]);

  const reset = useCallback(() => {
    setState({
      offset: initialOffset,
      limit,
      loading: false,
      hasMore: true,
      total: undefined,
    });
  }, [initialOffset, limit]);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setHasMore = useCallback((hasMore: boolean) => {
    setState(prev => ({ ...prev, hasMore }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setState(prev => ({ ...prev, total }));
  }, []);

  return {
    pagination: state,
    actions: {
      loadMore,
      reset,
      setLoading,
      setHasMore,
      setTotal,
    },
  };
}

// Utility function for calculating pagination metadata
export function calculatePaginationMeta(offset: number, limit: number, total?: number) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = total ? Math.ceil(total / limit) : undefined;
  const hasNextPage = total ? offset + limit < total : true;
  const hasPreviousPage = offset > 0;

  return {
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    itemsShown: offset + limit,
    total,
  };
}

// Cache utility for pagination data
const paginationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedPaginationData<T>(key: string): T | null {
  const cached = paginationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

export function setCachedPaginationData<T>(key: string, data: T) {
  paginationCache.set(key, { data, timestamp: Date.now() });
}

export function clearPaginationCache(pattern?: string) {
  if (pattern) {
    for (const key of paginationCache.keys()) {
      if (key.includes(pattern)) {
        paginationCache.delete(key);
      }
    }
  } else {
    paginationCache.clear();
  }
}