'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/useStacks';
import ContractList from '@/components/contract/contract-list';
import { Contract, ContractStatus } from '@/types';

export default function ContractsPage() {
  const { userData, isSignedIn } = useStacks();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  useEffect(() => {
    const fetchContracts = async () => {
      if (!userAddress) return;
      
      setLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock expanded contracts data - in production, this would fetch from Stacks blockchain
        const mockContracts: Contract[] = [
          {
            id: 1,
            client: userAddress,
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
            client: 'ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ',
            freelancer: userAddress,
            totalAmount: 25000000, // 25 STX
            remainingBalance: 0,
            status: ContractStatus.COMPLETED,
            createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            endDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
            description: 'Smart contract audit and security optimization for DeFi protocol'
          },
          {
            id: 3,
            client: userAddress,
            freelancer: 'ST39MJ145BR6S8C315AG2BD61SJ16E208P1FDK3AK',
            totalAmount: 75000000, // 75 STX
            remainingBalance: 75000000,
            status: ContractStatus.ACTIVE,
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
            endDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
            description: 'Mobile app UI/UX design and development for e-commerce platform'
          },
          {
            id: 4,
            client: 'ST1HJBQZK9V7S9G7E55X4F71D37PH2G9JX8A9QT3',
            freelancer: userAddress,
            totalAmount: 35000000, // 35 STX
            remainingBalance: 10000000,
            status: ContractStatus.ACTIVE,
            createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
            endDate: Date.now() + 16 * 24 * 60 * 60 * 1000,
            description: 'WordPress website development and SEO optimization'
          },
          {
            id: 5,
            client: userAddress,
            freelancer: 'ST1HJBQZK9V7S9G7E55X4F71D37PH2G9JX8A9QT3',
            totalAmount: 20000000, // 20 STX
            remainingBalance: 0,
            status: ContractStatus.COMPLETED,
            createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
            endDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
            description: 'Logo design and brand identity creation'
          },
          {
            id: 6,
            client: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
            freelancer: userAddress,
            totalAmount: 40000000, // 40 STX
            remainingBalance: 40000000,
            status: ContractStatus.DISPUTED,
            createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
            endDate: Date.now() + 9 * 24 * 60 * 60 * 1000,
            description: 'Blockchain integration for existing web application'
          },
          {
            id: 7,
            client: userAddress,
            freelancer: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
            totalAmount: 15000000, // 15 STX
            remainingBalance: 15000000,
            status: ContractStatus.CANCELLED,
            createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
            endDate: Date.now() - 55 * 24 * 60 * 60 * 1000,
            description: 'Social media marketing strategy and implementation'
          }
        ];

        setContracts(mockContracts);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn && userAddress) {
      fetchContracts();
    }
  }, [isSignedIn, userAddress]);

  // Filter contracts based on search term
  const filteredContracts = contracts.filter(contract => 
    contract.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.id.toString().includes(searchTerm) ||
    contract.client.includes(searchTerm) ||
    contract.freelancer.includes(searchTerm)
  );

  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh delay
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            All Contracts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all your contracts in one place
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg 
              className={`-ml-1 mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <a
            href="/dashboard/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Contract
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-lg">
              <label htmlFor="search" className="sr-only">
                Search contracts
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  name="search"
                  type="text"
                  placeholder="Search by contract ID, description, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                {filteredContracts.length} of {contracts.length} contracts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <ContractList 
        contracts={filteredContracts}
        userAddress={userAddress || ''}
        loading={loading}
      />
    </div>
  );
}
