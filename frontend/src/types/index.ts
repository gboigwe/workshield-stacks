// /frontend/src/types/index.ts
// Contract and Milestone Types for WorkShield

import { CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import React from 'react';

export interface Milestone {
  id: number;
  description: string;
  amount: number; // in microSTX
  deadline: number; // timestamp in milliseconds
  status: MilestoneStatus;
  submissionNotes?: string;
  rejectionReason?: string;
  submittedAt?: number; // timestamp in milliseconds
  approvedAt?: number; // timestamp in milliseconds
}

export interface Contract {
  id: number;
  client: string;
  freelancer: string;
  description: string;
  totalAmount: number; // in microSTX
  remainingBalance: number; // in microSTX
  endDate: number; // timestamp in milliseconds
  status: ContractStatus;
  milestones: Milestone[];
}

export enum ContractStatus {
  ACTIVE = 0,
  COMPLETED = 1,
  DISPUTED = 2,
  CANCELLED = 3
}

export enum MilestoneStatus {
  PENDING = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  REJECTED = 3
}

export enum UserRole {
  CLIENT = 'client',
  FREELANCER = 'freelancer'
}

// Utility functions for formatting and display
export function formatSTX(microStx: number): string {
  return (microStx / 1000000).toFixed(2) + ' STX';
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function getContractStatusInfo(status: ContractStatus): { 
  text: string; 
  color: string; 
  description: string; 
  icon: React.ElementType;
} {
  switch (status) {
    case ContractStatus.ACTIVE:
      return { 
        text: 'Active', 
        color: 'bg-green-100 text-green-800',
        description: 'Contract is currently active and work is in progress',
        icon: CheckCircle
      };
    case ContractStatus.COMPLETED:
      return { 
        text: 'Completed', 
        color: 'bg-blue-100 text-blue-800',
        description: 'All milestones have been completed and approved',
        icon: CheckCircle
      };
    case ContractStatus.DISPUTED:
      return { 
        text: 'Disputed', 
        color: 'bg-red-100 text-red-800',
        description: 'Contract is under dispute resolution',
        icon: AlertTriangle
      };
    case ContractStatus.CANCELLED:
      return { 
        text: 'Cancelled', 
        color: 'bg-gray-100 text-gray-800',
        description: 'Contract has been cancelled',
        icon: X
      };
    default:
      return { 
        text: 'Unknown', 
        color: 'bg-gray-100 text-gray-800',
        description: 'Contract status is unknown',
        icon: Clock
      };
  }
}

export function getMilestoneStatusInfo(status: MilestoneStatus): { 
  text: string; 
  color: string; 
  description: string; 
  icon: React.ElementType;
} {
  switch (status) {
    case MilestoneStatus.PENDING:
      return { 
        text: 'Pending', 
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Waiting for freelancer to submit work',
        icon: Clock
      };
    case MilestoneStatus.SUBMITTED:
      return { 
        text: 'Submitted', 
        color: 'bg-blue-100 text-blue-800',
        description: 'Work submitted, waiting for client approval',
        icon: AlertTriangle
      };
    case MilestoneStatus.APPROVED:
      return { 
        text: 'Approved', 
        color: 'bg-green-100 text-green-800',
        description: 'Work approved and payment released',
        icon: CheckCircle
      };
    case MilestoneStatus.REJECTED:
      return { 
        text: 'Rejected', 
        color: 'bg-red-100 text-red-800',
        description: 'Work rejected, needs revision',
        icon: X
      };
    default:
      return { 
        text: 'Unknown', 
        color: 'bg-gray-100 text-gray-800',
        description: 'Milestone status is unknown',
        icon: Clock
      };
  }
}

// Helper functions for contract management
export function calculateContractProgress(milestones: Milestone[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  const total = milestones.length;
  const completed = milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return { total, completed, percentage };
}

export function getNextMilestone(milestones: Milestone[]): Milestone | null {
  // Find the first pending or submitted milestone
  return milestones.find(m => 
    m.status === MilestoneStatus.PENDING || 
    m.status === MilestoneStatus.SUBMITTED
  ) || null;
}

export function calculateEarnedAmount(milestones: Milestone[]): number {
  return milestones
    .filter(m => m.status === MilestoneStatus.APPROVED)
    .reduce((total, m) => total + m.amount, 0);
}

export function calculatePendingAmount(milestones: Milestone[]): number {
  return milestones
    .filter(m => m.status === MilestoneStatus.SUBMITTED)
    .reduce((total, m) => total + m.amount, 0);
}

export function isContractOverdue(endDate: number): boolean {
  return Date.now() > endDate;
}

export function isMilestoneOverdue(deadline: number, status: MilestoneStatus): boolean {
  return Date.now() > deadline && status === MilestoneStatus.PENDING;
}

// Form validation helpers
export function isValidSTXAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M STX
}

export function isValidDeadline(timestamp: number): boolean {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneYear = 365 * oneDay;
  
  return timestamp > now + oneDay && timestamp < now + oneYear;
}

export function isValidDescription(description: string): boolean {
  return description.trim().length >= 10 && description.trim().length <= 500;
}

// STX conversion utilities
export function stxToMicroStx(stx: number | string): number {
  const amount = typeof stx === 'string' ? parseFloat(stx) : stx;
  return Math.floor(amount * 1000000);
}

export function microStxToStx(microStx: number | string): number {
  const amount = typeof microStx === 'string' ? parseFloat(microStx) : microStx;
  return amount / 1000000;
}

// Address utilities
export function shortenAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function isValidStacksAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Remove any whitespace
  const cleanAddress = address.trim();

  // Check length (should be 41 characters)
  if (cleanAddress.length !== 41) {
    return false;
  }

  // Check if it starts with ST (mainnet) or SP (testnet)
  if (!cleanAddress.startsWith('ST') && !cleanAddress.startsWith('SP')) {
    return false;
  }

  // Check if the rest contains only valid characters (alphanumeric, case-insensitive)
  const addressPattern = /^S[TP][A-Z0-9]{39}$/i;
  return addressPattern.test(cleanAddress);
}

// Error handling types
export interface TransactionError {
  code: string;
  message: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: TransactionError;
}

// Component prop types
export interface ContractCardProps {
  contract: Contract;
  userRole: UserRole;
  onViewDetails: (contractId: number) => void;
}

export interface MilestoneCardProps {
  milestone: Milestone;
  contractId: number;
  userRole: UserRole;
  onSubmit?: (milestoneId: number, notes: string) => void;
  onApprove?: (milestoneId: number) => void;
  onReject?: (milestoneId: number, reason: string) => void;
}

// Dashboard statistics
export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalEarned: number;
  pendingPayments: number;
  overdueItems: number;
}

export function calculateDashboardStats(contracts: Contract[], userRole: UserRole): DashboardStats {
  const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE);
  const completedContracts = contracts.filter(c => c.status === ContractStatus.COMPLETED);
  
  let totalEarned = 0;
  let pendingPayments = 0;
  let overdueItems = 0;

  contracts.forEach(contract => {
    contract.milestones.forEach(milestone => {
      if (milestone.status === MilestoneStatus.APPROVED) {
        totalEarned += milestone.amount;
      }
      if (milestone.status === MilestoneStatus.SUBMITTED) {
        pendingPayments += milestone.amount;
      }
      if (isMilestoneOverdue(milestone.deadline, milestone.status)) {
        overdueItems++;
      }
    });
  });

  return {
    totalContracts: contracts.length,
    activeContracts: activeContracts.length,
    completedContracts: completedContracts.length,
    totalEarned,
    pendingPayments,
    overdueItems
  };
}
