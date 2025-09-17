'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import { PaginationState } from '@/hooks/usePagination';

interface LoadMoreButtonProps {
  pagination: PaginationState;
  onLoadMore: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function LoadMoreButton({ 
  pagination, 
  onLoadMore, 
  className = "",
  children 
}: LoadMoreButtonProps) {
  if (!pagination.hasMore) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={pagination.loading}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
      >
        {pagination.loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            <span>{children || 'Load More'}</span>
          </>
        )}
      </button>
      
      {pagination.total && (
        <p className="text-sm text-gray-500">
          Showing {Math.min(pagination.offset, pagination.total)} of {pagination.total} items
        </p>
      )}
    </div>
  );
}

interface PaginationInfoProps {
  pagination: PaginationState;
  itemName?: string;
}

export function PaginationInfo({ pagination, itemName = "items" }: PaginationInfoProps) {
  const { offset, limit, total } = pagination;
  const currentItems = Math.min(offset, total || offset);
  
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>
        {total ? (
          <>Showing {currentItems} of {total} {itemName}</>
        ) : (
          <>Loaded {currentItems} {itemName}</>
        )}
      </span>
      
      {total && (
        <span>
          Page {Math.floor(offset / limit) + 1}
          {total && ` of ${Math.ceil(total / limit)}`}
        </span>
      )}
    </div>
  );
}