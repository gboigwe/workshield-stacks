import { CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import React from 'react';

export interface Milestone {
  id: number;
  description: string;
  amount: number; // in microSTX
  deadline: number; // timestamp in milliseconds
  status: MilestoneStatus;
  submissionNotes?: string; // Keep existing naming
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
  createdAt?: number; // timestamp in milliseconds
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

// Dashboard statistics
export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalEarned: number;
  pendingPayments: number;
  overdueItems: number;
  openDisputes?: number; // For backward compatibility
  totalEarnings?: number; // For backward compatibility
  // ✅ NEW: Added for enhanced dashboard
  totalValue: number;
  completedMilestones: number;
  totalMilestones: number;
}

// Transaction response types
export interface TransactionResponse {
  success: boolean;
  txId?: string;
  error?: string;
}

// Contract fetching cache interface
export interface ContractCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// Milestone form data
export interface MilestoneFormData {
  description: string;
  amount: string;
  deadline: string;
}

// Contract creation form data
export interface ContractFormData {
  freelancer: string;
  description: string;
  totalAmount: string;
  endDate: string;
}

// Form validation errors
export interface FormErrors {
  freelancer?: string;
  description?: string;
  totalAmount?: string;
  endDate?: string;
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

// ===============================================
// UTILITY FUNCTIONS - Enhanced & Complete
// ===============================================

// STX formatting with better precision
export function formatSTX(microStx: number): string {
  const stx = microStx / 1000000;
  if (stx >= 1000000) {
    return `${(stx / 1000000).toFixed(2)}M STX`;
  } else if (stx >= 1000) {
    return `${(stx / 1000).toFixed(2)}K STX`;
  } else if (stx >= 1) {
    return `${stx.toFixed(2)} STX`;
  } else {
    return `${stx.toFixed(6)} STX`;
  }
}

// Date formatting
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Address formatting
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// ✅ ENHANCED: Contract status utilities
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
        description: 'Unknown contract status',
        icon: Clock
      };
  }
}

// ✅ NEW: Milestone status utilities
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
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Waiting for freelancer to submit work',
        icon: Clock
      };
    case MilestoneStatus.SUBMITTED:
      return {
        text: 'Awaiting Review',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Submitted by freelancer, awaiting client approval',
        icon: AlertTriangle
      };
    case MilestoneStatus.APPROVED:
      return {
        text: 'Approved',
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Work approved and payment released',
        icon: CheckCircle
      };
    case MilestoneStatus.REJECTED:
      return {
        text: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Work rejected, needs revision',
        icon: X
      };
    default:
      return {
        text: 'Unknown',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        description: 'Unknown milestone status',
        icon: Clock
      };
  }
}

// ✅ NEW: Calculate contract progress
export function calculateContractProgress(milestones: Milestone[]): {
  total: number;
  completed: number;
  percentage: number;
  submitted: number;
  pending: number;
} {
  if (!milestones || milestones.length === 0) {
    return { total: 0, completed: 0, percentage: 0, submitted: 0, pending: 0 };
  }
  
  const total = milestones.length;
  const completed = milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
  const submitted = milestones.filter(m => m.status === MilestoneStatus.SUBMITTED).length;
  const pending = milestones.filter(m => m.status === MilestoneStatus.PENDING).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { total, completed, percentage, submitted, pending };
}

// ✅ NEW: Calculate dashboard stats
export function calculateDashboardStats(contracts: Contract[], role: UserRole): DashboardStats {
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE).length;
  const completedContracts = contracts.filter(c => c.status === ContractStatus.COMPLETED).length;
  const totalValue = contracts.reduce((sum, c) => sum + c.totalAmount, 0);
  
  // Calculate milestone stats
  const allMilestones = contracts.flatMap(c => c.milestones || []);
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
  
  // Calculate earnings/payments based on role
  let totalEarned = 0;
  let pendingPayments = 0;
  
  if (role === UserRole.FREELANCER) {
    // For freelancers: earned = approved milestones, pending = submitted milestones
    totalEarned = allMilestones
      .filter(m => m.status === MilestoneStatus.APPROVED)
      .reduce((sum, m) => sum + m.amount, 0);
    pendingPayments = allMilestones
      .filter(m => m.status === MilestoneStatus.SUBMITTED)
      .reduce((sum, m) => sum + m.amount, 0);
  } else {
    // For clients: earned = total paid out, pending = awaiting approval
    totalEarned = allMilestones
      .filter(m => m.status === MilestoneStatus.APPROVED)
      .reduce((sum, m) => sum + m.amount, 0);
    pendingPayments = allMilestones
      .filter(m => m.status === MilestoneStatus.SUBMITTED)
      .reduce((sum, m) => sum + m.amount, 0);
  }
  
  // Calculate overdue items
  const now = Date.now();
  const overdueItems = allMilestones.filter(m => 
    m.status === MilestoneStatus.PENDING && m.deadline < now
  ).length;

  return {
    totalContracts,
    activeContracts,
    completedContracts,
    totalValue,
    totalEarned,
    pendingPayments,
    completedMilestones,
    totalMilestones,
    overdueItems,
    // Backward compatibility
    openDisputes: 0,
    totalEarnings: totalEarned
  };
}

// ===============================================
// CONVERSION UTILITIES
// ===============================================

export function stxToMicroStx(stx: number | string): number {
  const amount = typeof stx === 'string' ? parseFloat(stx) : stx;
  return Math.floor(amount * 1000000);
}

export function microStxToStx(microStx: number | string): number {
  const amount = typeof microStx === 'string' ? parseFloat(microStx) : microStx;
  return amount / 1000000;
}

// ===============================================
// VALIDATION UTILITIES
// ===============================================

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

// ✅ NEW: Enhanced validation functions
export function isValidSTXAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000;
}

export function isValidDeadline(timestamp: number): boolean {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneYear = 365 * oneDay;
  return timestamp > now + oneDay && timestamp < now + oneYear;
}

export function isValidDescription(description: string): boolean {
  return description.length >= 10 && description.length <= 500;
}

export function isMilestoneOverdue(deadline: number, status: MilestoneStatus): boolean {
  return deadline < Date.now() && status === MilestoneStatus.PENDING;
}

// ===============================================
// ADDRESS UTILITIES
// ===============================================

// Address utilities
export function shortenAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  return formatAddress(address, startChars, endChars);
}

// ===============================================
// TIME UTILITIES
// ===============================================

// ✅ NEW: Time utilities
export function getTimeUntilDeadline(deadline: number): {
  text: string;
  isOverdue: boolean;
  color: string;
} {
  const now = Date.now();
  const diff = deadline - now;
  
  if (diff < 0) {
    const overdueDays = Math.floor(Math.abs(diff) / (24 * 60 * 60 * 1000));
    return {
      text: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
      isOverdue: true,
      color: 'text-red-600'
    };
  }
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return {
      text: `${days} day${days !== 1 ? 's' : ''} left`,
      isOverdue: false,
      color: days <= 3 ? 'text-yellow-600' : 'text-green-600'
    };
  } else if (hours > 0) {
    return {
      text: `${hours} hour${hours !== 1 ? 's' : ''} left`,
      isOverdue: false,
      color: 'text-red-600'
    };
  } else {
    return {
      text: 'Due soon',
      isOverdue: false,
      color: 'text-red-600'
    };
  }
}

// ===============================================
// EXPORT CONSTANTS
// ===============================================

// ✅ NEW: Useful constants
export const STACKS_NETWORKS = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet'
} as const;

export const CONTRACT_STATUSES = {
  ACTIVE: 0,
  COMPLETED: 1,
  DISPUTED: 2,
  CANCELLED: 3
} as const;

export const MILESTONE_STATUSES = {
  PENDING: 0,
  SUBMITTED: 1,
  APPROVED: 2,
  REJECTED: 3
} as const;
