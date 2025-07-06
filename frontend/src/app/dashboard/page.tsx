'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Eye,
  TrendingUp,
  FileText,
  Activity,
  Users
} from 'lucide-react';
import { 
  Contract, 
  Milestone, 
  MilestoneStatus, 
  ContractStatus, 
  formatSTX, 
  formatDate, 
  UserRole,
  // formatAmount,
  // getContractStatusText,
  // getContractStatusColor,
  // getMilestoneStatusText,
  // getMilestoneStatusColor
} from '@/types';

interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalValue: number;
  pendingPayments: number;
  completedMilestones: number;
  totalMilestones: number;
}

export default function EnhancedDashboardPage() {
  const router = useRouter();
  const { 
    userData, 
    isSignedIn, 
    loading, 
    connectWallet, 
    clientContracts, 
    freelancerContracts,
    transactionInProgress,
    refreshContracts,
    debugContractSystem,
  } = useStacks();

  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.CLIENT);
  const [contractsLoading, setContractsLoading] = useState(true);
  
  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  // Auto-determine primary role and set tab
  useEffect(() => {
    if (clientContracts.length > 0 && freelancerContracts.length === 0) {
      setActiveTab(UserRole.CLIENT);
    } else if (freelancerContracts.length > 0 && clientContracts.length === 0) {
      setActiveTab(UserRole.FREELANCER);
    }
    setContractsLoading(false);
  }, [clientContracts, freelancerContracts]);

  // Calculate dashboard statistics
  const calculateStats = (contracts: Contract[], role: UserRole): DashboardStats => {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE).length;
    const completedContracts = contracts.filter(c => c.status === ContractStatus.COMPLETED).length;
    const totalValue = contracts.reduce((sum, c) => sum + c.totalAmount, 0);
    
    // Calculate milestone stats
    const allMilestones = contracts.flatMap(c => c.milestones || []);
    const totalMilestones = allMilestones.length;
    const completedMilestones = allMilestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
    
    // Calculate pending payments (different for client vs freelancer)
    let pendingPayments = 0;
    if (role === UserRole.CLIENT) {
      // For clients: milestones submitted and awaiting approval
      pendingPayments = allMilestones
        .filter(m => m.status === MilestoneStatus.SUBMITTED)
        .reduce((sum, m) => sum + m.amount, 0);
    } else {
      // For freelancers: approved milestones not yet paid (shouldn't happen with auto-pay)
      pendingPayments = contracts.reduce((sum, c) => sum + c.remainingBalance, 0);
    }

    return {
      totalContracts,
      activeContracts,
      completedContracts,
      totalValue,
      pendingPayments,
      completedMilestones,
      totalMilestones
    };
  };

  const clientStats = calculateStats(clientContracts, UserRole.CLIENT);
  const freelancerStats = calculateStats(freelancerContracts, UserRole.FREELANCER);
  const currentStats = activeTab === UserRole.CLIENT ? clientStats : freelancerStats;
  const currentContracts = activeTab === UserRole.CLIENT ? clientContracts : freelancerContracts;

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }

  const StatCard = ({ title, value, icon: Icon, color, subtext }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtext?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full ${color === 'text-green-600' ? 'bg-green-100' : 
                                           color === 'text-blue-600' ? 'bg-blue-100' : 
                                           color === 'text-orange-600' ? 'bg-orange-100' : 
                                           'bg-gray-100'}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  const ContractCard = ({ contract, role }: { contract: Contract; role: UserRole }) => {
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
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(contract.status)}`}>
                {getStatusText(contract.status)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                {role === UserRole.CLIENT ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                <span>
                  {role === UserRole.CLIENT 
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
              {formatSTX(contract.totalAmount)}
            </div>
            <div className="text-sm text-gray-600">
              {formatSTX(contract.remainingBalance)} remaining
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">WorkShield Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back! Here's your contract overview.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Debug Button - Remove in production */}
              <button
                onClick={debugContractSystem}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔧 Debug
              </button>
              
              <button
                onClick={async () => {
                  setContractsLoading(true);
                  await refreshContracts();
                  setContractsLoading(false);
                }}
                disabled={contractsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {contractsLoading ? 'Refreshing...' : 'Refresh Contracts'}
              </button>
              
              <button
                onClick={() => router.push('/dashboard/create')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Contract
              </button>
            </div>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab(UserRole.CLIENT)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === UserRole.CLIENT
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Client Contracts ({clientContracts.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab(UserRole.FREELANCER)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === UserRole.FREELANCER
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Freelancer Contracts ({freelancerContracts.length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Contracts"
            value={currentStats.totalContracts}
            icon={FileText}
            color="text-blue-600"
          />
          <StatCard
            title="Active Projects"
            value={currentStats.activeContracts}
            icon={Activity}
            color="text-green-600"
          />
          <StatCard
            title="Total Value"
            value={formatSTX(currentStats.totalValue)}
            icon={DollarSign}
            color="text-orange-600"
          />
          <StatCard
            title="Milestone Progress"
            value={`${currentStats.completedMilestones}/${currentStats.totalMilestones}`}
            icon={CheckCircle}
            color="text-green-600"
            subtext={currentStats.totalMilestones > 0 ? `${Math.round((currentStats.completedMilestones / currentStats.totalMilestones) * 100)}% complete` : 'No milestones'}
          />
        </div>

        {/* Contract List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === UserRole.CLIENT ? 'Your Client Contracts' : 'Your Freelancer Contracts'}
            </h2>
            <div className="text-sm text-gray-600">
              {currentContracts.length} contract{currentContracts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {contractsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contracts...</p>
            </div>
          ) : currentContracts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {activeTab === UserRole.CLIENT ? <Briefcase className="w-6 h-6 text-gray-400" /> : <User className="w-6 h-6 text-gray-400" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === UserRole.CLIENT ? 'client' : 'freelancer'} contracts yet
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === UserRole.CLIENT 
                  ? "Start by creating your first contract to work with freelancers."
                  : "No contracts have been assigned to you as a freelancer yet."
                }
              </p>
              {activeTab === UserRole.CLIENT && (
                <button
                  onClick={() => router.push('/dashboard/create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create First Contract
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence>
                {currentContracts.map((contract) => (
                  <ContractCard 
                    key={contract.id} 
                    contract={contract} 
                    role={activeTab} 
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {currentContracts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {currentContracts.slice(0, 3).map((contract) => (
                <div key={contract.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Contract "{contract.description.slice(0, 30)}..." 
                    </p>
                    <p className="text-xs text-gray-600">
                      Created {formatDate(contract.createdAt || Date.now())} • {formatSTX(contract.totalAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
