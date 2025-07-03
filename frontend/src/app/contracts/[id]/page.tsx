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
    // isPollingEnabled,
    // enableRealTimeUpdates,
    // disableRealTimeUpdates
  } = useStacks();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Modal states
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState<number | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  const parseStacksValue = (value: any): any => {
    // Handle Stacks Clarity wrapped values like {type: "uint", value: "123"}
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value;
    }
    return value;
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
        setContract(fetchedContract);
        
        if (fetchedContract && userAddress) {
          // Determine user role
          if (fetchedContract.client === userAddress) {
            setUserRole(UserRole.CLIENT);
          } else if (fetchedContract.freelancer === userAddress) {
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

  // useEffect(() => {
  //   // Enable real-time updates when viewing contract details
  //   enableRealTimeUpdates();
    
  //   return () => {
  //     // Disable when leaving the page
  //     disableRealTimeUpdates();
  //   };
  // }, [enableRealTimeUpdates, disableRealTimeUpdates]);

  // Refresh contract data
  const refreshContract = async () => {
    if (!contractId) return;
    const updatedContract = await fetchContractById(parseInt(contractId));
    setContract(updatedContract);
  };

  // Handle add milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      const deadlineTimestamp = Math.floor(new Date(milestoneForm.deadline).getTime() / 1000);
      const amountInMicroStx = Math.floor(parseFloat(milestoneForm.amount) * 1000000);

      const result = await addMilestone(
        contract.id,
        milestoneForm.description,
        amountInMicroStx,
        deadlineTimestamp
      );

      if (result.success) {
        setShowAddMilestone(false);
        setMilestoneForm({ description: '', amount: '', deadline: '' });
        await refreshContract();
      } else {
        alert(`Error adding milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding milestone:', error);
      alert('Failed to add milestone');
    }
  };

  // Handle submit milestone
  const handleSubmitMilestone = async (milestoneId: number, submissionNote: string) => {
    if (!contract) return;

    try {
      const result = await submitMilestone(contract.id, milestoneId, submissionNote);

      if (result.success) {
        setShowSubmitForm(null);
        setSubmissionForm({ notes: '' });
        await refreshContract();
      } else {
        alert(`Error submitting milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting milestone:', error);
      alert('Failed to submit milestone');
    }
  };

  // Handle approve milestone
  const handleApproveMilestone = async (milestoneId: number) => {
    if (!contract) return;

    try {
      const result = await approveMilestone(contract.id, milestoneId);

      if (result.success) {
        await refreshContract();
      } else {
        alert(`Error approving milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving milestone:', error);
      alert('Failed to approve milestone');
    }
  };

  // Handle reject milestone
  const handleRejectMilestone = async (milestoneId: number, rejectionReason: string) => {
    if (!contract) return;

    try {
      const result = await rejectMilestone(contract.id, milestoneId, rejectionReason);

      if (result.success) {
        setShowRejectForm(null);
        setRejectionForm({ reason: '' });
        await refreshContract();
      } else {
        alert(`Error rejecting milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting milestone:', error);
      alert('Failed to reject milestone');
    }
  };

  const getMilestoneStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case MilestoneStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case MilestoneStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case MilestoneStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMilestoneStatusText = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return 'Pending';
      case MilestoneStatus.SUBMITTED:
        return 'Awaiting Review';
      case MilestoneStatus.APPROVED:
        return 'Approved';
      case MilestoneStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const getContractStatusColor = (status: ContractStatus) => {
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

  const getContractStatusText = (status: ContractStatus) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
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
  const totalMilestoneAmount = contract.milestones?.reduce((sum, m) => sum + m.amount, 0) || 0;
  const remainingBudget = contract.totalAmount - totalMilestoneAmount;
  const progress = contract.milestones?.length > 0 
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
                {formatSTX(contract.totalAmount)}
              </div>
              <p className="text-sm text-gray-600">
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
              <p className="text-gray-700">{contract.description}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Contract Parties</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Client:</span>
                    <span className="font-mono text-xs">{contract.client.slice(0, 8)}...{contract.client.slice(-6)}</span>
                    {userRole === UserRole.CLIENT && <span className="text-green-600">(You)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Freelancer:</span>
                    <span className="font-mono text-xs">{contract.freelancer.slice(0, 8)}...{contract.freelancer.slice(-6)}</span>
                    {userRole === UserRole.FREELANCER && <span className="text-green-600">(You)</span>}
                  </div>
                </div>
              </div>

              {/* {isPollingEnabled && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-3 py-1 rounded-lg text-sm">
                  🔄 Live updates enabled
                </div>
              )}
              */}
              
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Timeline</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {formatDate(contract.createdAt || Date.now())}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Deadline: {formatDate(contract.endDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {contract.milestones && contract.milestones.length > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-orange-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length} completed</span>
                <span>{contract.milestones.length} total milestones</span>
              </div>
            </div>
          )}
        </div>

        {/* Milestones Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Milestones</h2>
              <p className="text-sm text-gray-600">
                {contract.milestones?.length || 0} milestone{(contract.milestones?.length || 0) !== 1 ? 's' : ''} • 
                Remaining budget: {formatSTX(remainingBudget)}
              </p>
            </div>
            
            {canAddMilestone && (
              <button
                onClick={() => setShowAddMilestone(true)}
                disabled={transactionInProgress}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            )}
          </div>

          {/* Milestones List */}
          {!contract.milestones || contract.milestones.length === 0 ? (
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
            <div className="space-y-4">
              {contract.milestones.map((milestone, index) => {
              // 🔧 SAFETY: Ensure milestone properties are primitive values
              const safeMilestone: Milestone = {
                id: milestone.id,
                description: String(parseStacksValue(milestone.description) || ''),
                amount: parseInt(String(parseStacksValue(milestone.amount) || '0')),
                deadline: parseInt(String(parseStacksValue(milestone.deadline) || '0')),
                status: parseInt(String(parseStacksValue(milestone.status) || '0')) as MilestoneStatus,
                submissionNotes: parseStacksValue(milestone.submissionNotes),
                rejectionReason: parseStacksValue(milestone.rejectionReason),
                submittedAt: milestone.submittedAt,
                approvedAt: milestone.approvedAt,
              };
              
              return (
                <MilestoneCard
                  key={milestone.id}
                  milestone={safeMilestone}
                  index={index}
                  userRole={userRole}
                  contractId={contract.id}
                  onSubmit={handleSubmitMilestone}
                  onApprove={handleApproveMilestone}
                  onReject={handleRejectMilestone}
                  showSubmitForm={showSubmitForm}
                  setShowSubmitForm={setShowSubmitForm}
                  showRejectForm={showRejectForm}
                  setShowRejectForm={setShowRejectForm}
                  submissionForm={submissionForm}
                  setSubmissionForm={setSubmissionForm}
                  rejectionForm={rejectionForm}
                  setRejectionForm={setRejectionForm}
                  transactionInProgress={transactionInProgress}
                  getMilestoneStatusColor={getMilestoneStatusColor}
                  getMilestoneStatusText={getMilestoneStatusText}
                />
              );
            })}
            </div>
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
                <h3 className="text-lg font-semibold text-gray-900">Add Milestone</h3>
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
                    placeholder="Describe what needs to be completed for this milestone..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    min="0.000001"
                    max={remainingBudget / 1000000}
                    value={milestoneForm.amount}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available budget: {formatSTX(remainingBudget)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={milestoneForm.deadline}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, deadline: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    max={new Date(contract.endDate).toISOString().slice(0, 16)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {transactionInProgress ? 'Adding...' : 'Add Milestone'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Milestone Card Component
interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  userRole: UserRole | null;
  contractId: number;
  onSubmit: (milestoneId: number, note: string) => void;
  onApprove: (milestoneId: number) => void;
  onReject: (milestoneId: number, reason: string) => void;
  showSubmitForm: number | null;
  setShowSubmitForm: (id: number | null) => void;
  showRejectForm: number | null;
  setShowRejectForm: (id: number | null) => void;
  submissionForm: { notes: string };
  setSubmissionForm: (form: { notes: string }) => void;
  rejectionForm: { reason: string };
  setRejectionForm: (form: { reason: string }) => void;
  transactionInProgress: boolean;
  getMilestoneStatusColor: (status: MilestoneStatus) => string;
  getMilestoneStatusText: (status: MilestoneStatus) => string;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  index,
  userRole,
  onSubmit,
  onApprove,
  onReject,
  showSubmitForm,
  setShowSubmitForm,
  showRejectForm,
  setShowRejectForm,
  submissionForm,
  setSubmissionForm,
  rejectionForm,
  setRejectionForm,
  transactionInProgress,
  getMilestoneStatusColor,
  getMilestoneStatusText
}) => {

    // 🔍 DEBUG: Log milestone data at render time
  console.log(`🎯 [RENDER] MilestoneCard rendering milestone:`, milestone);
  console.log(`🎯 [RENDER] milestone.status:`, milestone.status, typeof milestone.status);
  console.log(`🎯 [RENDER] milestone.amount:`, milestone.amount, typeof milestone.amount);
  
  // Safety check before rendering
  if (typeof milestone.status === 'object') {
    console.error(`🚨 [RENDER ERROR] milestone.status is an object!`, milestone.status);
    return (
      <div className="border rounded-lg p-4 bg-red-50 border-red-200">
        <p className="text-red-800">Error: Milestone data is corrupted</p>
        <pre className="text-xs">{JSON.stringify(milestone, null, 2)}</pre>
      </div>
    );
  }

  const canSubmit = userRole === UserRole.FREELANCER && milestone.status === MilestoneStatus.PENDING;
  const canApprove = userRole === UserRole.CLIENT && milestone.status === MilestoneStatus.SUBMITTED;
  const canReject = userRole === UserRole.CLIENT && milestone.status === MilestoneStatus.SUBMITTED;

  const isOverdue = milestone.deadline < Math.floor(Date.now() / 1000) && 
                   milestone.status === MilestoneStatus.PENDING;

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Milestone Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-500">
              Milestone {index + 1}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
              getMilestoneStatusColor(milestone.status)
            }`}>
              {getMilestoneStatusText(milestone.status)}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                Overdue
              </span>
            )}
          </div>
          <h4 className="font-medium text-gray-900 mb-1">{milestone.description}</h4>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
            <DollarSign className="w-4 h-4" />
            {formatSTX(milestone.amount)}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="w-3 h-3" />
            Due {formatDate(milestone.deadline * 1000)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(canSubmit || canApprove || canReject) && (
        <div className="flex gap-2 mb-3">
          {canSubmit && (
            <button
              onClick={() => setShowSubmitForm(milestone.id)}
              disabled={transactionInProgress}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit Work
            </button>
          )}
          
          {canApprove && (
            <button
              onClick={() => onApprove(milestone.id)}
              disabled={transactionInProgress}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          
          {canReject && (
            <button
              onClick={() => setShowRejectForm(milestone.id)}
              disabled={transactionInProgress}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          )}
        </div>
      )}

      {/* Submission Note */}
      {milestone.submissionNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <h5 className="font-medium text-blue-900 mb-1">Submission Note:</h5>
          <p className="text-blue-800 text-sm">{milestone.submissionNotes}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {milestone.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <h5 className="font-medium text-red-900 mb-1">Rejection Reason:</h5>
          <p className="text-red-800 text-sm">{milestone.rejectionReason}</p>
        </div>
      )}

      {/* Submit Form */}
      {showSubmitForm === milestone.id && (
        <div className="border-t pt-3 mt-3">
          <h5 className="font-medium text-gray-900 mb-2">Submit your work:</h5>
          <textarea
            value={submissionForm.notes}
            onChange={(e) => setSubmissionForm({ notes: e.target.value })}
            placeholder="Describe the completed work, include links to deliverables..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                onSubmit(milestone.id, submissionForm.notes);
                setSubmissionForm({ notes: '' });
              }}
              disabled={!submissionForm.notes.trim() || transactionInProgress}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setShowSubmitForm(null);
                setSubmissionForm({ notes: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm === milestone.id && (
        <div className="border-t pt-3 mt-3">
          <h5 className="font-medium text-gray-900 mb-2">Reason for rejection:</h5>
          <textarea
            value={rejectionForm.reason}
            onChange={(e) => setRejectionForm({ reason: e.target.value })}
            placeholder="Explain what needs to be changed or improved..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                onReject(milestone.id, rejectionForm.reason);
                setRejectionForm({ reason: '' });
              }}
              disabled={!rejectionForm.reason.trim() || transactionInProgress}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              Reject
            </button>
            <button
              onClick={() => {
                setShowRejectForm(null);
                setRejectionForm({ reason: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
