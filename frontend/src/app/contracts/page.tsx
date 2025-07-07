'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Eye
} from 'lucide-react';
import {
  Contract,
  MilestoneStatus,
  formatSTX,
  formatDate,
  getContractStatusInfo,
  UserRole
} from '@/types';

export default function ContractListPage() {
  const router = useRouter();
  const { userData, isSignedIn, loading, connectWallet, fetchUserContracts } = useStacks();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const calculateProgress = (milestones: any[]) => {
    if (!milestones || milestones.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }
    
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  };

  useEffect(() => {
    if (isSignedIn && userData) {
      const loadContracts = async () => {
        const userAddress = userData.profile.stxAddress?.testnet || userData.profile.stxAddress?.mainnet;
      
        if (userAddress) {
          setLoadingContracts(true);
          try {
            const fetchedContracts = await fetchUserContracts(userAddress);
            setContracts(fetchedContracts);
            
            // Determine primary role
            const isClientInAnyContract = fetchedContracts.some(contract => contract.client === userAddress);
            const isFreelancerInAnyContract = fetchedContracts.some(contract => contract.freelancer === userAddress);
            
            if (isClientInAnyContract && !isFreelancerInAnyContract) {
              setUserRole(UserRole.CLIENT);
            } else if (isFreelancerInAnyContract && !isClientInAnyContract) {
              setUserRole(UserRole.FREELANCER);
            } else if (isClientInAnyContract && isFreelancerInAnyContract) {
              setUserRole(UserRole.CLIENT); // Default to client if both
            }
            
          } catch (error) {
          } finally {
            setLoadingContracts(false);
          }
        }
      };

      loadContracts();
    }
  }, [isSignedIn, userData, fetchUserContracts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">Please connect your Stacks wallet to view your contracts</p>
          <button
            onClick={connectWallet}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {userRole === UserRole.CLIENT ? 'My Contracts' : 'Assigned Contracts'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {userRole === UserRole.CLIENT 
                    ? 'Manage your projects and track milestone progress'
                    : 'View your assignments and submit work'
                  }
                </p>
              </div>
              
              {userRole === UserRole.CLIENT && (
                <button
                  onClick={() => router.push('/dashboard/create')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create New Contract
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Contracts Grid */}
        {loadingContracts ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-12 bg-white rounded-lg shadow-sm"
          >
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600 mb-6">
              {userRole === UserRole.CLIENT 
                ? "You haven't created any contracts yet. Start by creating your first project."
                : "You don't have any assigned contracts yet."
              }
            </p>
            {userRole === UserRole.CLIENT && (
              <button
                onClick={() => router.push('/dashboard/create')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Your First Contract
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contracts.map((contract, index) => {
              const statusInfo = getContractStatusInfo(contract.status);
              const progress = calculateProgress(contract.milestones);
              
              return (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} flex items-center gap-1`}>
                      <CheckCircle className="h-4 w-4" />
                      {statusInfo.text}
                    </span>
                    <span className="text-sm text-gray-500">#{contract.id}</span>
                  </div>

                  {/* Contract Description */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {contract.description}
                  </h3>

                  {/* Contract Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>Total: {formatSTX(contract.totalAmount)}</span>
                      <span className="text-gray-400">•</span>
                      <span>Remaining: {formatSTX(contract.remainingBalance)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Due: {formatDate(contract.endDate)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>
                        {userRole === UserRole.CLIENT 
                          ? `Freelancer: ${contract.freelancer.slice(0, 8)}...`
                          : `Client: ${contract.client.slice(0, 8)}...`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{progress.completed}/{progress.total} milestones</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
