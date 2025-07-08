'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  ArrowLeft,
  Send,
  FileText,
  Edit3,
  X,
  ExternalLink
} from 'lucide-react';
import {
  Contract,
  Milestone,
  MilestoneStatus,
  ContractStatus,
  formatSTX,
  formatDate,
  UserRole
} from '@/types';

export default function ContractDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;
  
  const { 
    userData, 
    isSignedIn, 
    fetchContractById,
    addMilestone, 
    submitMilestone, 
    approveMilestone,
    rejectMilestone,
    transactionInProgress,
  } = useStacks();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Modal states
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState<number | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  // ✅ ENHANCED: Comprehensive Clarity value parser
  const parseStacksValue = (value: any): any => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle Stacks Clarity wrapped values like {type: "uint", value: "123"}
    if (value && typeof value === 'object' && 'value' in value) {
      return parseStacksValue(value.value); // Recursive parsing for nested values
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(parseStacksValue);
    }
    
    // Handle objects
    if (value && typeof value === 'object') {
      const parsed: any = {};
      for (const [key, val] of Object.entries(value)) {
        parsed[key] = parseStacksValue(val);
      }
      return parsed;
    }
    
    return value;
  };

  // ✅ ENHANCED: Safe contract parser
  const parseContractData = (rawContract: any): Contract | null => {
    try {
      if (!rawContract) return null;
      
      // Parse the entire contract data structure
      const parsed = parseStacksValue(rawContract);
      
      // Ensure all numeric values are properly converted
      const safeContract: Contract = {
        id: parseInt(contractId),
        client: String(parsed.client || ''),
        freelancer: String(parsed.freelancer || ''),
        description: String(parsed.description || ''),
        totalAmount: parseInt(String(parsed.totalAmount || parsed['total-amount'] || '0')),
        remainingBalance: parseInt(String(parsed.remainingBalance || parsed['remaining-balance'] || '0')),
        endDate: parseInt(String(parsed.endDate || parsed['end-date'] || '0')),
        status: parseInt(String(parsed.status || '0')),
        createdAt: parseInt(String(parsed.createdAt || parsed['created-at'] || Date.now())),
        milestones: parsed.milestones ? parsed.milestones.map((m: any) => parseMilestoneData(m)) : []
      };
      
      return safeContract;
    } catch (error) {
      console.error('Error parsing contract data:', error);
      return null;
    }
  };

  // ✅ ENHANCED: Safe milestone parser
  const parseMilestoneData = (rawMilestone: any): Milestone => {
    const parsed = parseStacksValue(rawMilestone);
    
    return {
      id: parseInt(String(parsed.id || '0')),
      description: String(parsed.description || ''),
      amount: parseInt(String(parsed.amount || '0')),
      deadline: parseInt(String(parsed.deadline || '0')),
      status: parseInt(String(parsed.status || '0')) as MilestoneStatus,
      submissionNotes: String(parsed.submissionNotes || parsed['submission-notes'] || ''),
      rejectionReason: String(parsed.rejectionReason || parsed['rejection-reason'] || ''),
      submittedAt: parsed.submittedAt ? parseInt(String(parsed.submittedAt)) : undefined,
      approvedAt: parsed.approvedAt ? parseInt(String(parsed.approvedAt)) : undefined,
    };
  };

  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    description: '',
    amount: '',
    deadline: ''
  });
  const [submissionForm, setSubmissionForm] = useState({
    notes: ''
  });
  const [rejectionForm, setRejectionForm] = useState({
    reason: ''
  });

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  // Load contract data
  useEffect(() => {
    const loadContract = async () => {
      if (!contractId || !isSignedIn) return;
      
      setLoading(true);
      try {
        const fetchedContract = await fetchContractById(parseInt(contractId));
        
        // ✅ PARSE CONTRACT DATA SAFELY
        const safeContract = parseContractData(fetchedContract);
        setContract(safeContract);
        
        if (safeContract && userAddress) {
          // Determine user role
          if (safeContract.client === userAddress) {
            setUserRole(UserRole.CLIENT);
          } else if (safeContract.freelancer === userAddress) {
            setUserRole(UserRole.FREELANCER);
          }
        }
      } catch (error) {
        console.error('Error loading contract:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [contractId, isSignedIn, userAddress, fetchContractById]);

  // Helper functions for contract status
  const getContractStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'bg-green-50 text-green-700 border-green-200';
      case ContractStatus.COMPLETED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case ContractStatus.DISPUTED:
        return 'bg-red-50 text-red-700 border-red-200';
      case ContractStatus.CANCELLED:
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getContractStatusText = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'Active';
      case ContractStatus.COMPLETED:
        return 'Completed';
      case ContractStatus.DISPUTED:
        return 'Disputed';
      case ContractStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getMilestoneStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case MilestoneStatus.SUBMITTED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case MilestoneStatus.APPROVED:
        return 'bg-green-50 text-green-700 border-green-200';
      case MilestoneStatus.REJECTED:
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getMilestoneStatusText = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return 'Pending';
      case MilestoneStatus.SUBMITTED:
        return 'Submitted';
      case MilestoneStatus.APPROVED:
        return 'Approved';
      case MilestoneStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  // Handle form submissions
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      // ✅ FIX: Ensure user input is treated as STX, then converted to microSTX
      const amountInSTX = parseFloat(milestoneForm.amount); // User enters STX (like 5.0)
      const amountInMicroSTX = Math.floor(amountInSTX * 1000000); // Convert to microSTX

      const result = await addMilestone(
        contract.id,
        milestoneForm.description,
        amountInMicroSTX,
        Math.floor(new Date(milestoneForm.deadline).getTime() / 1000)  // Convert to seconds
      );

      if (result.success) {
        setShowAddMilestone(false);
        setMilestoneForm({ description: '', amount: '', deadline: '' });
        // Reload contract data
        const updatedContract = await fetchContractById(contract.id);
        setContract(parseContractData(updatedContract));
      }
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const handleSubmitMilestone = async (milestoneId: number, notes: string) => {
    if (!contract) return;

    try {
      const result = await submitMilestone(contract.id, milestoneId, notes);
      if (result.success) {
        setShowSubmitForm(null);
        setSubmissionForm({ notes: '' });
        // Reload contract data
        const updatedContract = await fetchContractById(contract.id);
        setContract(parseContractData(updatedContract));
      }
    } catch (error) {
      console.error('Error submitting milestone:', error);
    }
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    if (!contract) return;

    try {
      const result = await approveMilestone(contract.id, milestoneId);
      if (result.success) {
        // Reload contract data
        const updatedContract = await fetchContractById(contract.id);
        setContract(parseContractData(updatedContract));
      }
    } catch (error) {
      console.error('Error approving milestone:', error);
    }
  };

  const handleRejectMilestone = async (milestoneId: number, reason: string) => {
    if (!contract) return;

    try {
      const result = await rejectMilestone(contract.id, milestoneId, reason);
      if (result.success) {
        setShowRejectForm(null);
        setRejectionForm({ reason: '' });
        // Reload contract data
        const updatedContract = await fetchContractById(contract.id);
        setContract(parseContractData(updatedContract));
      }
    } catch (error) {
      console.error('Error rejecting milestone:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contract Not Found</h2>
          <p className="text-gray-600 mb-4">The contract you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canAddMilestone = userRole === UserRole.CLIENT && contract.status === ContractStatus.ACTIVE;
  const progress = contract.milestones.length > 0 
    ? (contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length / contract.milestones.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Contract Details</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getContractStatusColor(contract.status)}`}>
                  {getContractStatusText(contract.status)}
                </span>
              </div>
              <p className="text-gray-600">
                You are the <span className="font-medium">{userRole === UserRole.CLIENT ? 'Client' : 'Freelancer'}</span> in this contract
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                <DollarSign className="w-6 h-6" />
                {/* ✅ SAFE: formatSTX now receives proper number values */}
                {formatSTX(contract.totalAmount)}
              </div>
              <p className="text-sm text-gray-600">
                {/* ✅ SAFE: formatSTX now receives proper number values */}
                {formatSTX(contract.remainingBalance)} remaining
              </p>
            </div>
          </div>
        </div>

        {/* Contract Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              {/* ✅ SAFE: contract.description is now guaranteed to be a string */}
              <p className="text-gray-700">{contract.description}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Contract Parties</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Client:</span>
                    {/* ✅ SAFE: contract.client is now guaranteed to be a string */}
                    <span className="font-mono text-xs">{contract.client.slice(0, 8)}...{contract.client.slice(-4)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Freelancer:</span>
                    {/* ✅ SAFE: contract.freelancer is now guaranteed to be a string */}
                    <span className="font-mono text-xs">{contract.freelancer.slice(0, 8)}...{contract.freelancer.slice(-4)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Timeline</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {/* ✅ SAFE: contract.endDate is now guaranteed to be a number */}
                  <span>Due: {formatDate(contract.endDate)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
            {canAddMilestone && (
              <button
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            )}
          </div>

          <div className="space-y-4">
            {contract.milestones.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h4>
                <p className="text-gray-600 mb-4">
                  {userRole === UserRole.CLIENT 
                    ? 'Start by adding your first milestone to break down the project.'
                    : 'The client hasn\'t added any milestones yet.'
                  }
                </p>
                {canAddMilestone && (
                  <button
                    onClick={() => setShowAddMilestone(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Milestone
                  </button>
                )}
              </div>
            ) : (
              // ✅ SAFE: All milestone data is now properly parsed
              contract.milestones.map((milestone, index) => (
                <div key={milestone.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{milestone.description}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getMilestoneStatusColor(milestone.status)}`}>
                          {getMilestoneStatusText(milestone.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {/* ✅ SAFE: milestone.amount is now guaranteed to be a number */}
                          {formatSTX(milestone.amount)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {/* ✅ SAFE: milestone.deadline is now guaranteed to be a number */}
                          {formatDate(milestone.deadline)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons based on user role and milestone status */}
                  <div className="flex gap-2">
                    {userRole === UserRole.FREELANCER && milestone.status === MilestoneStatus.PENDING && (
                      <button
                        onClick={() => setShowSubmitForm(milestone.id)}
                        disabled={transactionInProgress}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {transactionInProgress ? 'Submitting...' : 'Submit Work'}
                      </button>
                    )}
                    
                    {userRole === UserRole.CLIENT && milestone.status === MilestoneStatus.SUBMITTED && (
                      <>
                        <button
                          onClick={() => handleApproveMilestone(milestone.id)}
                          disabled={transactionInProgress}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {transactionInProgress ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setShowRejectForm(milestone.id)}
                          disabled={transactionInProgress}
                          className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Submission Note */}
                  {milestone.submissionNotes && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800 mb-1">Submission Note:</p>
                      <p className="text-blue-700">{milestone.submissionNotes}</p>
                    </div>
                  )}
                  
                  {/* Rejection Reason */}
                  {milestone.rejectionReason && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-red-700">{milestone.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Milestone Modal */}
        <AnimatePresence>
          {showAddMilestone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg p-6 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Milestone</h3>
                  <button
                    onClick={() => setShowAddMilestone(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleAddMilestone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={milestoneForm.description}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (STX)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={milestoneForm.amount}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="5.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={milestoneForm.deadline}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddMilestone(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transactionInProgress}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {transactionInProgress ? 'Adding...' : 'Add Milestone'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Submit Work Modal */}
        <AnimatePresence>
          {showSubmitForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg p-6 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Submit Work</h3>
                  <button
                    onClick={() => setShowSubmitForm(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (showSubmitForm) {
                    handleSubmitMilestone(showSubmitForm, submissionForm.notes);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Submission Notes
                    </label>
                    <textarea
                      value={submissionForm.notes}
                      onChange={(e) => setSubmissionForm({ notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={4}
                      placeholder="Describe the work completed..."
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitForm(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transactionInProgress}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {transactionInProgress ? 'Submitting...' : 'Submit Work'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reject Work Modal */}
        <AnimatePresence>
          {showRejectForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg p-6 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Reject Work</h3>
                  <button
                    onClick={() => setShowRejectForm(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (showRejectForm) {
                    handleRejectMilestone(showRejectForm, rejectionForm.reason);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectionForm.reason}
                      onChange={(e) => setRejectionForm({ reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={4}
                      placeholder="Explain why the work needs to be revised..."
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transactionInProgress}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {transactionInProgress ? 'Rejecting...' : 'Reject Work'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
