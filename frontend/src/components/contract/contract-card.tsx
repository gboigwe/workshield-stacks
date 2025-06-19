'use client';

import { Contract, ContractStatus, UserRole } from '@/types';
import { useRouter } from 'next/navigation';

interface ContractCardProps {
  contract: Contract;
  userRole: UserRole;
  userAddress: string;
  milestoneCount?: number;
  completedMilestones?: number;
  nextDeadline?: number;
}

export default function ContractCard({ 
  contract, 
  userRole, 
  userAddress,
  milestoneCount = 0,
  completedMilestones = 0,
  nextDeadline 
}: ContractCardProps) {
  const router = useRouter();

  const formatSTX = (amount: number) => {
    return `${(amount / 1000000).toFixed(2)} STX`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case ContractStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case ContractStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      case ContractStatus.DISPUTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'Active';
      case ContractStatus.COMPLETED:
        return 'Completed';
      case ContractStatus.CANCELLED:
        return 'Cancelled';
      case ContractStatus.DISPUTED:
        return 'Disputed';
      default:
        return 'Unknown';
    }
  };

  const getProgressPercentage = () => {
    if (milestoneCount === 0) return 0;
    return Math.round((completedMilestones / milestoneCount) * 100);
  };

  const isUrgent = nextDeadline && nextDeadline < Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

  const handleCardClick = () => {
    router.push(`/dashboard/contracts/${contract.id}`);
  };

  const otherParty = userRole === UserRole.CLIENT ? contract.freelancer : contract.client;
  const otherPartyRole = userRole === UserRole.CLIENT ? 'Freelancer' : 'Client';

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
    >
      <div className="px-4 py-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              Contract #{contract.id}
            </h3>
            <p className="mt-1 text-sm text-gray-500 truncate">
              {contract.description}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
              {getStatusText(contract.status)}
            </span>
          </div>
        </div>

        {/* Contract Details */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{otherPartyRole}</p>
            <p className="text-sm text-gray-900 font-mono">{formatAddress(otherParty)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Value</p>
            <p className="text-sm text-gray-900 font-semibold">{formatSTX(contract.totalAmount)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {milestoneCount > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Progress</span>
              <span className="text-gray-900">{completedMilestones}/{milestoneCount} milestones</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {getProgressPercentage()}% complete
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {contract.status === ContractStatus.ACTIVE && (
              <div className="flex items-center text-sm text-gray-500">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {nextDeadline ? (
                  <span className={isUrgent ? 'text-red-600 font-medium' : ''}>
                    Due {new Date(nextDeadline).toLocaleDateString()}
                  </span>
                ) : (
                  <span>No upcoming deadlines</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {contract.remainingBalance > 0 && (
              <span className="text-xs text-gray-500">
                {formatSTX(contract.remainingBalance)} remaining
              </span>
            )}
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
