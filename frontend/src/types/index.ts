export interface Contract {
  id: number;
  client: string;
  freelancer: string;
  totalAmount: number;
  remainingBalance: number;
  status: ContractStatus;
  createdAt: number;
  endDate: number;
  description: string;
}

export interface Milestone {
  id: number;
  contractId: number;
  description: string;
  amount: number;
  deadline: number;
  status: MilestoneStatus;
  submissionNotes?: string;
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
  resolution: DisputeResolution;
  createdAt: number;
  resolvedAt?: number;
}

// Enums
export enum ContractStatus {
  ACTIVE = 0,
  COMPLETED = 1,
  CANCELLED = 2,
  DISPUTED = 3
}

export enum MilestoneStatus {
  PENDING = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  REJECTED = 3,
  OVERDUE = 4
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

// User role context
export enum UserRole {
  CLIENT = 'client',
  FREELANCER = 'freelancer'
}

// Dashboard view types
export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalEarnings: number;
  pendingPayments: number;
  openDisputes: number;
}

export interface ContractSummary {
  contract: Contract;
  milestoneCount: number;
  completedMilestones: number;
  pendingMilestones: number;
  nextDeadline?: number;
}

// Form types
export interface CreateContractForm {
  freelancer: string;
  description: string;
  endDate: string;
  totalAmount: string;
}

export interface AddMilestoneForm {
  description: string;
  amount: string;
  deadline: string;
}

export interface SubmitMilestoneForm {
  submissionNotes: string;
}

export interface RejectMilestoneForm {
  rejectionReason: string;
}