'use client';

import { Contract, ContractStatus, UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { formatAddress, formatStxAmount, formatDate, getDaysUntilDeadline } from '@/lib/utils';
import { Calendar, User, DollarSign, Clock } from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  userRole: UserRole;
}

export default function ContractCard({ contract, userRole }: ContractCardProps) {
  const router = useRouter();

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

  const handleCardClick = () => {
    router.push(`/dashboard/contracts/${contract.id}`);
  };

  const otherParty = userRole === UserRole.CLIENT ? contract.freelancer : contract.client;
  const otherPartyRole = userRole === UserRole.CLIENT ? 'Freelancer' : 'Client';
  const progressPercentage = Math.round(((contract.totalAmount - contract.remainingBalance) / contract.totalAmount) * 100);
  const daysUntilDeadline = getDaysUntilDeadline(contract.endDate);
  const isUrgent = daysUntilDeadline <= 7 && contract.status === ContractStatus.ACTIVE;

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-orange-300"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              Contract #{contract.id}
            </h3>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {contract.description}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
              {getStatusText(contract.status)}
            </span>
          </div>
        </div>

        {/* Contract Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">{otherPartyRole}</p>
              <p className="text-sm text-gray-900 font-mono">{formatAddress(otherParty)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Total Value</p>
              <p className="text-sm text-gray-900 font-semibold">{formatStxAmount(contract.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {contract.status === ContractStatus.ACTIVE && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Progress</span>
              <span className="text-gray-900">{progressPercentage}% completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {formatStxAmount(contract.totalAmount - contract.remainingBalance)} of {formatStxAmount(contract.totalAmount)} paid
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(contract.createdAt)}</span>
            </div>
          </div>
          
          {contract.status === ContractStatus.ACTIVE && (
            <div className="flex items-center space-x-1 text-sm">
              <Clock className="w-4 h-4" />
              <span className={`${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {daysUntilDeadline > 0 
                  ? `${daysUntilDeadline} days left`
                  : 'Overdue'
                }
              </span>
            </div>
          )}
        </div>

        {/* Action Hint */}
        <div className="mt-3 text-xs text-gray-400 text-center">
          Click to view details and manage milestones
        </div>
      </div>
    </div>
  );
}
