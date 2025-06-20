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

export interface Contract {
  id: number;
  client: string;
  freelancer: string;
  totalAmount: number; // in microSTX
  remainingBalance: number; // in microSTX
  status: ContractStatus;
  createdAt: number; // timestamp
  endDate: number; // timestamp
  description: string;
}

export interface Milestone {
  id: number;
  contractId: number;
  description: string;
  amount: number; // in microSTX
  status: MilestoneStatus;
  deadline: number; // timestamp
  submissionNote?: string;
  rejectionReason?: string;
  submittedAt?: number;
  approvedAt?: number;
}

export interface Dispute {
  id: number;
  contractId: number;
  openedBy: string;
  client: string;
  freelancer: string;
  reason: string;
  clientEvidence?: string;
  freelancerEvidence?: string;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  createdAt: number;
  resolvedAt?: number;
}

export enum DisputeStatus {
  OPEN = 0,
  RESOLVED = 1,
  WITHDRAWN = 2
}

export enum DisputeResolution {
  PENDING = 0,
  CLIENT_WINS = 1,
  FREELANCER_WINS = 2,
  SPLIT = 3
}

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalEarnings: number; // in microSTX
  pendingPayments: number; // in microSTX
  openDisputes: number;
}

export interface User {
  address: string;
  tier: UserTier;
  stats: UserStats;
  createdAt: number;
}

export enum UserTier {
  FREE = 0,
  PRO = 1
}

export interface UserStats {
  totalContracts: number;
  totalVolume: number; // in microSTX
  contractsThisMonth: number;
  lastReset: number;
}

export interface NetworkInfo {
  network: 'mainnet' | 'testnet';
  apiUrl: string;
  explorerUrl: string;
}

export interface Transaction {
  txId: string;
  status: 'pending' | 'success' | 'failed';
  type: string;
  timestamp: number;
  amount?: number;
  contractId?: number;
  milestoneId?: number;
}

// Form interfaces
export interface CreateContractForm {
  freelancer: string;
  description: string;
  totalAmount: string;
  endDate: string;
}

export interface CreateMilestoneForm {
  description: string;
  amount: string;
  deadline: string;
}

export interface SubmitMilestoneForm {
  submissionNote: string;
}

export interface RejectMilestoneForm {
  rejectionReason: string;
}

export interface CreateDisputeForm {
  reason: string;
}

export interface SubmitEvidenceForm {
  evidence: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  limit: number;
}

export interface MilestoneListResponse {
  milestones: Milestone[];
  total: number;
}

// Wallet interfaces
export interface WalletAccount {
  address: string;
  balance: number;
  network: 'mainnet' | 'testnet';
}

export interface StacksAddress {
  mainnet?: string;
  testnet?: string;
}

export interface UserData {
  profile: {
    stxAddress: StacksAddress;
  };
}

// Component prop interfaces
export interface ContractCardProps {
  contract: Contract;
  userRole: UserRole;
  onView?: (contractId: number) => void;
}

export interface MilestoneCardProps {
  milestone: Milestone;
  userRole: UserRole;
  onSubmit?: (milestoneId: number) => void;
  onApprove?: (milestoneId: number) => void;
  onReject?: (milestoneId: number) => void;
}

export interface StatsCardProps {
  stats: DashboardStats;
  role: UserRole;
}
