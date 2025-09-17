'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  AlertTriangle,
  Eye,
  Target,
  TrendingUp
} from 'lucide-react';
import {
  Contract,
  UserRole,
  formatSTX,
  formatDate,
  formatAddress,
  getContractStatusInfo,
  calculateContractProgress,
  MilestoneStatus
} from '@/types';

interface ContractCardProps {
  contract: Contract;
  userRole: UserRole;
  onViewDetails: (contractId: number) => void;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  userRole,
  onViewDetails
}) => {
  const statusInfo = getContractStatusInfo(contract.status);
  const progress = calculateContractProgress(contract.milestones);
  const isOverdue = contract.endDate < Date.now() && contract.status === 0; // Active but overdue

  // Calculate milestone stats
  const totalMilestones = contract.milestones.length;
  const completedMilestones = contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
  const pendingMilestones = contract.milestones.filter(m => m.status === MilestoneStatus.SUBMITTED).length;
  const totalEarned = contract.milestones
    .filter(m => m.status === MilestoneStatus.APPROVED)
    .reduce((sum, m) => sum + m.amount, 0);

  // Get other party info
  const otherParty = userRole === UserRole.CLIENT ? contract.freelancer : contract.client;
  const otherPartyLabel = userRole === UserRole.CLIENT ? 'Freelancer' : 'Client';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onViewDetails(contract.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Contract #{contract.id}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                Overdue
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {contract.description}
          </p>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(contract.id);
          }}
          className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar (only if there are milestones) */}
      {totalMilestones > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                progress.percentage === 100 
                  ? 'bg-green-500' 
                  : progress.percentage > 0 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                    : 'bg-gray-300'
              }`}
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Amount */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">Total Value</p>
            <p className="font-semibold text-gray-900 text-sm">{formatSTX(contract.totalAmount)}</p>
          </div>
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">End Date</p>
            <p className="font-semibold text-gray-900 text-sm">{formatDate(contract.endDate)}</p>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">Milestones</p>
            <p className="font-semibold text-gray-900 text-sm">
              {completedMilestones}/{totalMilestones}
            </p>
          </div>
        </div>

        {/* Other Party */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">{otherPartyLabel}</p>
            <p className="font-semibold text-gray-900 text-sm font-mono">
              {formatAddress(otherParty, 4, 4)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {/* Earnings/Payments */}
          {totalEarned > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-gray-600">
                {userRole === UserRole.FREELANCER ? 'Earned: ' : 'Paid: '}
              </span>
              <span className="font-semibold text-green-600">
                {formatSTX(totalEarned)}
              </span>
            </div>
          )}

          {/* Pending Reviews */}
          {pendingMilestones > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600">
                {pendingMilestones} pending review{pendingMilestones !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* No milestones indicator */}
          {totalMilestones === 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <AlertTriangle className="w-3 h-3" />
              <span>No milestones set</span>
            </div>
          )}
        </div>

        {/* Action indicator */}
        <div className="text-xs text-gray-500">
          Click to view details
        </div>
      </div>

      {/* Action Items (what user needs to do) */}
      {(() => {
        const actionItems = [];
        
        if (userRole === UserRole.CLIENT) {
          if (totalMilestones === 0) {
            actionItems.push("Add milestones to start the project");
          }
          if (pendingMilestones > 0) {
            actionItems.push(`Review ${pendingMilestones} submitted milestone${pendingMilestones !== 1 ? 's' : ''}`);
          }
        } else {
          const pendingWork = contract.milestones.filter(m => m.status === MilestoneStatus.PENDING).length;
          if (pendingWork > 0) {
            actionItems.push(`${pendingWork} milestone${pendingWork !== 1 ? 's' : ''} ready to work on`);
          }
        }

        if (actionItems.length > 0) {
          return (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Action Required:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {actionItems.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      })()}
    </motion.div>
  );
};
