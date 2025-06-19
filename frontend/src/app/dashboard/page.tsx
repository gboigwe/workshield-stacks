'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/useStacks';
import StatsCards from '@/components/dashboard/stats-cards';
import ContractList from '@/components/contract/contract-list';
import { Contract, DashboardStats, ContractStatus, UserRole } from '@/types';

export default function DashboardPage() {
  const { userData, isSignedIn } = useStacks();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    openDisputes: 0
  });

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  // Mock data for development - replace with actual contract fetching
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userAddress) return;
      
      setLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock contracts data - in production, this would fetch from Stacks blockchain
        const mockContracts: Contract[] = [
          {
            id: 1,
            client: userAddress,
            freelancer: 'ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ',
            totalAmount: 50000000, // 50 STX
            remainingBalance: 30000000, // 30 STX
            status: ContractStatus.ACTIVE,
            createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            endDate: Date.now() + 23 * 24 * 60 * 60 * 1000, // 23 days from now
            description: 'Full-stack web application development'
          },
          {
            id: 2,
            client: 'ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ',
            freelancer: userAddress,
            totalAmount: 25000000, // 25 STX
            remainingBalance: 0,
            status: ContractStatus.COMPLETED,
            createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
            endDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
            description: 'Smart contract audit and optimization'
          },
          {
            id: 3,
            client: userAddress,
            freelancer: 'ST39MJ145BR6S8C315AG2BD61SJ16E208P1FDK3AK',
            totalAmount: 75000000, // 75 STX
            remainingBalance: 75000000, // 75 STX
            status: ContractStatus.ACTIVE,
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
            endDate: Date.now() + 45 * 24 * 60 * 60 * 1000, // 45 days from now
            description: 'Mobile app UI/UX design and development'
          }
        ];

        // Calculate stats based on user role in each contract
        const userAsClient = mockContracts.filter(c => c.client === userAddress);
        const userAsFreelancer = mockContracts.filter(c => c.freelancer === userAddress);
        
        const totalContracts = userAsClient.length + userAsFreelancer.length;
        const activeContracts = mockContracts.filter(c => 
          (c.client === userAddress || c.freelancer === userAddress) && 
          c.status === ContractStatus.ACTIVE
        ).length;
        
        const completedContracts = mockContracts.filter(c => 
          (c.client === userAddress || c.freelancer === userAddress) && 
          c.status === ContractStatus.COMPLETED
        ).length;

        // Total earnings for freelancer work
        const totalEarnings = userAsFreelancer
          .filter(c => c.status === ContractStatus.COMPLETED)
          .reduce((sum, c) => sum + (c.totalAmount - c.remainingBalance), 0);

        // Pending payments (as client - remaining balances of active contracts)
        const pendingPayments = userAsClient
          .filter(c => c.status === ContractStatus.ACTIVE)
          .reduce((sum, c) => sum + c.remainingBalance, 0);

        setContracts(mockContracts);
        setStats({
          totalContracts,
          activeContracts,
          completedContracts,
          totalEarnings,
          pendingPayments,
          openDisputes: 0 // Would be calculated from actual dispute data
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn && userAddress) {
      fetchDashboardData();
    }
  }, [isSignedIn, userAddress]);

  // Determine primary user role based on contracts
  const getUserPrimaryRole = (): 'client' | 'freelancer' => {
    const clientContracts = contracts.filter(c => c.client === userAddress).length;
    const freelancerContracts = contracts.filter(c => c.freelancer === userAddress).length;
    
    return clientContracts >= freelancerContracts ? 'client' : 'freelancer';
  };

  const primaryRole = getUserPrimaryRole();
  
  // Get recent contracts (max 6 for dashboard overview)
  const recentContracts = contracts
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your contracts.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} userRole={primaryRole} />

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/dashboard/create"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Contract
            </a>
            
            <a
              href="/dashboard/contracts"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View All Contracts
            </a>

            <button
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics (Soon)
            </button>

            <button
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings (Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Contracts
            </h3>
            {contracts.length > 6 && (
              <a
                href="/dashboard/contracts"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all →
              </a>
            )}
          </div>
          
          <ContractList 
            contracts={recentContracts}
            userAddress={userAddress || ''}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
