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

// Dashboard statistics - MISSING INTERFACE
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

// Address formatting - MISSING FUNCTION
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// ✅ ENHANCED: Contract status utilities - MISSING FUNCTION
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
        color: 'text-green-600 bg-green-50 border-green-200',
        description: 'Contract is currently active',
        icon: CheckCircle
      };
    case ContractStatus.COMPLETED:
      return {
        text: 'Completed',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        description: 'Contract has been completed successfully',
        icon: CheckCircle
      };
    case ContractStatus.DISPUTED:
      return {
        text: 'Disputed',
        color: 'text-red-600 bg-red-50 border-red-200',
        description: 'Contract is under dispute',
        icon: AlertTriangle
      };
    case ContractStatus.CANCELLED:
      return {
        text: 'Cancelled',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        description: 'Contract has been cancelled',
        icon: X
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        description: 'Unknown contract status',
        icon: AlertTriangle
      };
  }
}

// ✅ ENHANCED: Milestone status utilities - MISSING FUNCTION
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
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        description: 'Awaiting work submission',
        icon: Clock
      };
    case MilestoneStatus.SUBMITTED:
      return {
        text: 'Submitted',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        description: 'Work submitted, awaiting approval',
        icon: Clock
      };
    case MilestoneStatus.APPROVED:
      return {
        text: 'Approved',
        color: 'text-green-600 bg-green-50 border-green-200',
        description: 'Work approved and payment released',
        icon: CheckCircle
      };
    case MilestoneStatus.REJECTED:
      return {
        text: 'Rejected',
        color: 'text-red-600 bg-red-50 border-red-200',
        description: 'Work rejected, requires revision',
        icon: X
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        description: 'Unknown milestone status',
        icon: AlertTriangle
      };
  }
}

// ✅ ENHANCED: Progress calculation - MISSING FUNCTION
export function calculateContractProgress(milestones: Milestone[]): {
  percentage: number;
  completed: number;
  total: number;
  earnedAmount: number;
  totalAmount: number;
} {
  const total = milestones.length;
  if (total === 0) {
    return { percentage: 0, completed: 0, total: 0, earnedAmount: 0, totalAmount: 0 };
  }
  
  const completed = milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
  const percentage = Math.round((completed / total) * 100);
  
  const earnedAmount = milestones
    .filter(m => m.status === MilestoneStatus.APPROVED)
    .reduce((sum, m) => sum + m.amount, 0);
    
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  
  return { percentage, completed, total, earnedAmount, totalAmount };
}

// ===============================================
// STX CONVERSION UTILITIES - MISSING FUNCTIONS
// ===============================================

export function stxToMicroStx(stx: string | number): number {
  const amount = typeof stx === 'string' ? parseFloat(stx) : stx;
  return Math.floor(amount * 1000000);
}

export function microStxToStx(microStx: number | string): number {
  const amount = typeof microStx === 'string' ? parseFloat(microStx) : microStx;
  return amount / 1000000;
}

// ===============================================
// VALIDATION UTILITIES - MISSING FUNCTIONS
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

// ✅ NEW: Enhanced validation functions - MISSING FUNCTIONS
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
// COMPARISON UTILITIES
// ===============================================

export function compareContracts(a: Contract, b: Contract, sortBy: 'date' | 'amount' | 'status' = 'date'): number {
  switch (sortBy) {
    case 'date':
      return (b.createdAt || 0) - (a.createdAt || 0);
    case 'amount':
      return b.totalAmount - a.totalAmount;
    case 'status':
      return a.status - b.status;
    default:
      return 0;
  }
}























