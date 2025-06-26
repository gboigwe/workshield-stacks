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
  X
} from 'lucide-react';
import {
  Contract,
  Milestone,
  MilestoneStatus,
  formatSTX,
  formatDate,
  getMilestoneStatusInfo,
  UserRole,
  isValidSTXAmount,
  isValidDeadline,
  stxToMicroStx
} from '@/types';

export default function ContractDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;
  
  const { 
    userData, 
    isSignedIn, 
    addMilestone, 
    submitMilestone, 
    approveMilestone,
    rejectMilestone,
    fetchContractById,
    transactionInProgress 
  } = useStacks();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState<number | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

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

  useEffect(() => {
    if (isSignedIn && userData && contractId) {
      const loadContract = async () => {
        setLoading(true);
        try {
          const fetchedContract = await fetchContractById(parseInt(contractId));
          setContract(fetchedContract);
          
          if (fetchedContract) {
            // Determine user role
            const userAddress = userData.profile.stxAddress?.testnet || userData.profile.stxAddress?.mainnet;
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
    }
  }, [isSignedIn, userData, contractId, fetchContractById]);

  const handleAddMilestone = async () => {
    if (!contract || !milestoneForm.description || !milestoneForm.amount || !milestoneForm.deadline) {
      alert('Please fill in all fields');
      return;
    }

    if (!isValidSTXAmount(milestoneForm.amount)) {
      alert('Please enter a valid STX amount');
      return;
    }

    const deadlineTimestamp = new Date(milestoneForm.deadline).getTime();
    if (!isValidDeadline(deadlineTimestamp)) {
      alert('Please select a deadline between 1 day and 1 year from now');
      return;
    }

    try {
      const amountInMicroStx = stxToMicroStx(parseFloat(milestoneForm.amount));
      const deadlineInSeconds = Math.floor(deadlineTimestamp / 1000);
      
      const result = await addMilestone(
        contract.id,
        milestoneForm.description,
        amountInMicroStx,
        deadlineInSeconds
      );

      if (result.success) {
        alert('Milestone added successfully!');
        setShowAddMilestone(false);
        setMilestoneForm({ description: '', amount: '', deadline: '' });
        // Refresh contract data
        const updatedContract = await fetchContractById(contract.id);
        setContract(updatedContract);
      } else {
        alert(`Failed to add milestone: ${result.error}`);
      }
    } catch (error) {
      alert(`Error adding milestone: ${error}`);
    }
  };

  const handleSubmitMilestone = async (milestoneId: number) => {
    if (!submissionForm.notes.trim()) {
      alert('Please add submission notes');
      return;
    }

    try {
      const result = await submitMilestone(
        contract!.id,
        milestoneId,
        submissionForm.notes
      );

      if (result.success) {
        alert('Milestone submitted successfully!');
        setShowSubmitForm(null);
        setSubmissionForm({ notes: '' });
        // Refresh contract data
        const updatedContract = await fetchContractById(contract!.id);
        setContract(updatedContract);
      } else {
        alert(`Failed to submit milestone: ${result.error}`);
      }
    } catch (error) {
      alert(`Error submitting milestone: ${error}`);
    }
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    try {
      const result = await approveMilestone(contract!.id, milestoneId);

      if (result.success) {
        alert('Milestone approved successfully!');
        // Refresh contract data
        const updatedContract = await fetchContractById(contract!.id);
        setContract(updatedContract);
      } else {
        alert(`Failed to approve milestone: ${result.error}`);
      }
    } catch (error) {
      alert(`Error approving milestone: ${error}`);
    }
  };

  const handleRejectMilestone = async (milestoneId: number) => {
    if (!rejectionForm.reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const result = await rejectMilestone(contract!.id, milestoneId, rejectionForm.reason);

      if (result.success) {
        alert('Milestone rejected successfully!');
        setShowRejectForm(null);
        setRejectionForm({ reason: '' });
        // Refresh contract data
        const updatedContract = await fetchContractById(contract!.id);
        setContract(updatedContract);
      } else {
        alert(`Failed to reject milestone: ${result.error}`);
      }
    } catch (error) {
      alert(`Error rejecting milestone: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Contract Not Found</h1>
          <button
            onClick={() => router.push('/contracts')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/contracts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Contracts
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.id}</h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>

            <p className="text-gray-700 mb-6">{contract.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold">{formatSTX(contract.totalAmount)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold">{formatDate(contract.endDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    {userRole === 'client' ? 'Freelancer' : 'Client'}
                  </p>
                  <p className="font-semibold font-mono text-sm">
                    {userRole === 'client' 
                      ? `${contract.freelancer.slice(0, 8)}...`
                      : `${contract.client.slice(0, 8)}...`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="font-semibold">
                    {contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length} / {contract.milestones.length} milestones
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Milestones Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
            {userRole === 'client' && (
              <button
                onClick={() => setShowAddMilestone(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Milestone
              </button>
            )}
          </div>

          {/* Add Milestone Form */}
          <AnimatePresence>
            {showAddMilestone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Milestone</h3>
                  <button
                    onClick={() => setShowAddMilestone(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={milestoneForm.description}
                      onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Milestone description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (STX)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={milestoneForm.amount}
                      onChange={(e) => setMilestoneForm({...milestoneForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={milestoneForm.deadline}
                    onChange={(e) => setMilestoneForm({...milestoneForm, deadline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddMilestone}
                    disabled={transactionInProgress}
                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {transactionInProgress ? 'Adding...' : 'Add Milestone'}
                  </button>
                  <button
                    onClick={() => setShowAddMilestone(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Milestones List */}
          <div className="space-y-4">
            {contract.milestones.map((milestone, index) => {
              const statusInfo = getMilestoneStatusInfo(milestone.status);
              const StatusIcon = statusInfo.icon;
              const isOverdue = milestone.deadline < Date.now() && milestone.status === MilestoneStatus.PENDING;

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {milestone.description}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSTX(milestone.amount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {formatDate(milestone.deadline)}
                          {isOverdue && <span className="text-red-500 font-medium ml-1">(Overdue)</span>}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} flex items-center gap-1`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.text}
                      </span>
                      
                      {/* Action buttons */}
                      {userRole === 'freelancer' && milestone.status === MilestoneStatus.PENDING && (
                        <button
                          onClick={() => setShowSubmitForm(milestone.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Submit Work
                        </button>
                      )}
                      
                      {userRole === 'client' && milestone.status === MilestoneStatus.SUBMITTED && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveMilestone(milestone.id)}
                            disabled={transactionInProgress}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setShowRejectForm(milestone.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission notes */}
                  {milestone.submissionNotes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Submission notes:</strong> {milestone.submissionNotes}
                      </p>
                      {milestone.submittedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted on {formatDate(milestone.submittedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {milestone.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Rejection reason:</strong> {milestone.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Submission form */}
                  <AnimatePresence>
                    {showSubmitForm === milestone.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <h4 className="font-medium text-gray-900 mb-3">Submit Milestone</h4>
                        <textarea
                          value={submissionForm.notes}
                          onChange={(e) => setSubmissionForm({notes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                          rows={3}
                          placeholder="Describe your completed work..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSubmitMilestone(milestone.id)}
                            disabled={transactionInProgress}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            {transactionInProgress ? 'Submitting...' : 'Submit'}
                          </button>
                          <button
                            onClick={() => setShowSubmitForm(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rejection form */}
                  <AnimatePresence>
                    {showRejectForm === milestone.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-red-50 rounded-lg"
                      >
                        <h4 className="font-medium text-gray-900 mb-3">Reject Milestone</h4>
                        <textarea
                          value={rejectionForm.reason}
                          onChange={(e) => setRejectionForm({reason: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-3"
                          rows={3}
                          placeholder="Explain why you're rejecting this milestone..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectMilestone(milestone.id)}
                            disabled={transactionInProgress}
                            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            {transactionInProgress ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => setShowRejectForm(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
