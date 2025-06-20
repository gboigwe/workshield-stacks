'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import StatsCards from '@/components/dashboard/stats-card';
import ContractList from '@/components/contract/contract-list';
import { Contract, DashboardStats, ContractStatus, UserRole } from '@/types';
import { formatAddress } from '@/lib/utils';
import { Plus, User, Briefcase } from 'lucide-react';

export default function DashboardPage() {
  const { userData, isSignedIn, loading } = useStacks();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.CLIENT);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    openDisputes: 0
  });

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  useEffect(() => {
    if (userAddress) {
      fetchContracts();
    }
  }, [userAddress, activeTab]);

  const fetchContracts = async () => {
    if (!userAddress) return;
    
    setContractsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Suppose to fetch from the Stacks blockchain ............. IN VIEW
      // For now, we'll use static mock data that doesn't change randomly
      const allContracts: Contract[] = [
        {
          id: 1,
          client: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          freelancer: 'ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ',
          totalAmount: 50000000, // 50 STX
          remainingBalance: 30000000, // 30 STX
          status: ContractStatus.ACTIVE,
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          endDate: Date.now() + 23 * 24 * 60 * 60 * 1000,
          description: 'Full-stack web application development with React and Node.js'
        },
        {
          id: 2,
          client: 'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ',
          freelancer: userAddress,
          totalAmount: 25000000, // 25 STX
          remainingBalance: 10000000, // 10 STX
          status: ContractStatus.ACTIVE,
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          endDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
          description: 'Mobile app UI/UX design for e-commerce platform'
        },
        {
          id: 3,
          client: userAddress,
          freelancer: 'ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK',
          totalAmount: 75000000, // 75 STX
          remainingBalance: 0,
          status: ContractStatus.COMPLETED,
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
          description: 'Smart contract audit and security review'
        }
      ];

      // Filter contracts based on active tab
      let filteredContracts;
      if (activeTab === UserRole.CLIENT) {
        // Show contracts where user is the client
        filteredContracts = allContracts.filter(contract => contract.client === userAddress);
      } else {
        // Show contracts where user is the freelancer
        filteredContracts = allContracts.filter(contract => contract.freelancer === userAddress);
      }

      setContracts(filteredContracts);

      // Calculate stats based on filtered contracts
      const activeContracts = filteredContracts.filter(c => c.status === ContractStatus.ACTIVE).length;
      const completedContracts = filteredContracts.filter(c => c.status === ContractStatus.COMPLETED).length;
      const totalEarnings = filteredContracts
        .filter(c => c.status === ContractStatus.COMPLETED)
        .reduce((sum, c) => sum + c.totalAmount, 0);
      const pendingPayments = filteredContracts
        .filter(c => c.status === ContractStatus.ACTIVE)
        .reduce((sum, c) => sum + c.remainingBalance, 0);

      setStats({
        totalContracts: filteredContracts.length,
        activeContracts,
        completedContracts,
        totalEarnings,
        pendingPayments,
        openDisputes: 0 // TODO: Calculate from disputes
      });

    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setContractsLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {formatAddress(userAddress || '')}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/create')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Contract
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
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
                <User className="w-4 h-4 inline mr-2" />
                As Client
              </button>
              <button
                onClick={() => setActiveTab(UserRole.FREELANCER)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === UserRole.FREELANCER
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                As Freelancer
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards stats={stats} role={activeTab} />
        </div>

        {/* Contracts Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === UserRole.CLIENT ? 'Your Contracts' : 'Assigned Contracts'}
            </h2>
            <span className="text-sm text-gray-500">
              {contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'}
            </span>
          </div>

          {contractsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : contracts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-white rounded-lg shadow-sm"
            >
              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  {activeTab === UserRole.CLIENT ? (
                    <Briefcase className="w-16 h-16 text-gray-300 mx-auto" />
                  ) : (
                    <User className="w-16 h-16 text-gray-300 mx-auto" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === UserRole.CLIENT 
                    ? 'No contracts created yet' 
                    : 'No contracts assigned to you'
                  }
                </h3>
                <p className="text-gray-500 mb-6">
                  {activeTab === UserRole.CLIENT
                    ? 'Create your first contract to start working with freelancers securely.'
                    : 'Contracts assigned to your address will appear here.'
                  }
                </p>
                {activeTab === UserRole.CLIENT && (
                  <button
                    onClick={() => router.push('/dashboard/create')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create First Contract
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <ContractList contracts={contracts} userRole={activeTab} userAddress={userAddress || ''} />
          )}
        </div>
      </div>
    </div>
  );
}
