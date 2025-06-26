'use client';

import { useState } from 'react';
import { Contract, ContractStatus, UserRole } from '@/types';
import ContractCard from './contract-card';

interface ContractListProps {
  contracts: Contract[];
  userRole: UserRole;
  userAddress: string;
  loading?: boolean;
}

export default function ContractList({ contracts, userRole, userAddress, loading = false }: ContractListProps) {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount' | 'deadline'>('newest');

  // Filter contracts based on status
  const filteredContracts = contracts.filter(contract => {
    if (statusFilter === 'all') return true;
    return contract.status === statusFilter;
  });

  // Sort contracts
  const sortedContracts = [...filteredContracts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'amount':
        return b.totalAmount - a.totalAmount;
      case 'deadline':
        return a.endDate - b.endDate;
      default:
        return 0;
    }
  });

  const getStatusCount = (status: ContractStatus | 'all') => {
    if (status === 'all') return contracts.length;
    return contracts.filter(c => c.status === status).length;
  };

  const getStatusName = (status: ContractStatus | 'all') => {
    switch (status) {
      case 'all': return 'All';
      case ContractStatus.ACTIVE: return 'Active';
      case ContractStatus.COMPLETED: return 'Completed';
      case ContractStatus.DISPUTED: return 'Disputed';
      case ContractStatus.CANCELLED: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contracts</h3>
        <p className="mt-1 text-sm text-gray-500">
          {userRole === UserRole.CLIENT 
            ? 'Get started by creating your first contract.'
            : 'Contracts assigned to you will appear here.'
          }
        </p>
        {userRole === UserRole.CLIENT && (
          <div className="mt-6">
            <a
              href="/dashboard/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Contract
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex flex-wrap gap-2">
              {(['all', ContractStatus.ACTIVE, ContractStatus.COMPLETED, ContractStatus.DISPUTED] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getStatusName(status)} ({getStatusCount(status)})
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
              <option value="deadline">Nearest deadline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contract Cards */}
      {sortedContracts.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No contracts match the selected filters.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sortedContracts.map((contract) => (
            <ContractCard 
              key={contract.id} 
              contract={contract} 
              userRole={userRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
