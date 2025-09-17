'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Briefcase, 
  Eye 
} from 'lucide-react';
import { Contract } from '@/types';

// Enum definitions for compatibility
enum UserRole {
  CLIENT = 'client',
  FREELANCER = 'freelancer'
}

enum ContractStatus {
  ACTIVE = 0,
  COMPLETED = 1,
  DISPUTED = 2
}

enum MilestoneStatus {
  PENDING = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  REJECTED = 3
}

// Helper functions
const formatToken = (amount: number, tokenType?: string) => {
  const stxAmount = amount / 1000000; // Convert microSTX to STX
  return `${stxAmount.toFixed(2)} ${tokenType || 'STX'}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString();
};

interface DashboardContractCardProps {
  contract: Contract;
  role: UserRole;
}

export default function DashboardContractCard({ contract, role }: DashboardContractCardProps) {
  const router = useRouter();
  
  const progress = contract.milestones?.length > 0 
    ? (contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length / contract.milestones.length) * 100 
    : 0;

  const getStatusColor = (status: number) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case ContractStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ContractStatus.DISPUTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'Active';
      case ContractStatus.COMPLETED:
        return 'Completed';
      case ContractStatus.DISPUTED:
        return 'Disputed';
      default:
        return 'Unknown';
    }
  };

  // Determine role based on user address comparison
  const getUserRole = (): UserRole => {
    return role; // Use the passed role directly
  };

  const userRole = getUserRole();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/contracts/${contract.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {contract.description}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(contract.status)}`}>
                {getStatusText(contract.status)}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 border border-purple-200">
                STX
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              {userRole === UserRole.CLIENT ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              <span>
                {userRole === UserRole.CLIENT 
                  ? `Freelancer: ${contract.freelancer.slice(0, 8)}...` 
                  : `Client: ${contract.client.slice(0, 8)}...`
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(contract.endDate)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
            <DollarSign className="w-4 h-4" />
            {formatToken(contract.totalAmount)}
          </div>
          <div className="text-sm text-gray-600">
            {formatToken(contract.remainingBalance)} remaining
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {contract.milestones && contract.milestones.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length} completed</span>
            <span>{contract.milestones.length} total milestones</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Created {formatDate(contract.createdAt || Date.now())}</span>
          <span>ID: {contract.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">View Details</span>
        </div>
      </div>
    </motion.div>
  );
}