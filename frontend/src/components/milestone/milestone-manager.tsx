'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Send,
  Eye,
  Edit3,
  X,
  FileText,
  Loader2
} from 'lucide-react';
import {
  Contract,
  Milestone,
  MilestoneStatus,
  UserRole,
  formatSTX,
  formatDate,
  getMilestoneStatusInfo,
  isMilestoneOverdue,
  stxToMicroStx,
  microStxToStx,
  isValidSTXAmount,
  isValidDescription,
  isValidDeadline
} from '@/types';

interface MilestoneManagerProps {
  contract: Contract;
  userRole: UserRole;
  onContractUpdate: () => void;
}

export const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  contract,
  userRole,
  onContractUpdate
}) => {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { 
    addMilestone, 
    submitMilestone, 
    approveMilestone, 
    rejectMilestone,
    transactionInProgress 
  } = useStacks();

  const handleAddMilestone = async (milestoneData: {
    description: string;
    amount: number;
    deadline: Date;
  }) => {
    try {
      setLoading(true);
      const deadlineTimestamp = milestoneData.deadline.getTime();
      const amountInMicroStx = stxToMicroStx(milestoneData.amount);

      const result = await addMilestone(
        contract.id,
        milestoneData.description,
        amountInMicroStx,
        deadlineTimestamp
      );

      if (result.success) {
        setShowAddMilestone(false);
        onContractUpdate();
      } else {
        alert(`Error adding milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding milestone:', error);
      alert('Failed to add milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneId: number, submissionNote: string) => {
    try {
      setLoading(true);
      const result = await submitMilestone(contract.id, milestoneId, submissionNote);

      if (result.success) {
        onContractUpdate();
        setSelectedMilestone(null);
      } else {
        alert(`Error submitting milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting milestone:', error);
      alert('Failed to submit milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    try {
      setLoading(true);
      const result = await approveMilestone(contract.id, milestoneId);

      if (result.success) {
        onContractUpdate();
      } else {
        alert(`Error approving milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving milestone:', error);
      alert('Failed to approve milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectMilestone = async (milestoneId: number, rejectionReason: string) => {
    try {
      setLoading(true);
      const result = await rejectMilestone(contract.id, milestoneId, rejectionReason);

      if (result.success) {
        onContractUpdate();
      } else {
        alert(`Error rejecting milestone: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting milestone:', error);
      alert('Failed to reject milestone');
    } finally {
      setLoading(false);
    }
  };

  const canAddMilestone = userRole === UserRole.CLIENT && contract.status === 0; // Active status
  const totalMilestoneAmount = contract.milestones.reduce((sum, m) => sum + m.amount, 0);
  const remainingBudget = contract.totalAmount - totalMilestoneAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Project Milestones</h3>
          <p className="text-sm text-gray-600">
            {contract.milestones.length} milestone{contract.milestones.length !== 1 ? 's' : ''} • 
            Remaining budget: {formatSTX(remainingBudget)}
          </p>
        </div>
        
        {canAddMilestone && (
          <button
            onClick={() => setShowAddMilestone(true)}
            disabled={transactionInProgress || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
          </div>
        )}
        
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
          <AnimatePresence>
            {contract.milestones.map((milestone, index) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                index={index}
                userRole={userRole}
                onSubmit={handleSubmitMilestone}
                onApprove={handleApproveMilestone}
                onReject={handleRejectMilestone}
                isSelected={selectedMilestone === milestone.id}
                onSelect={() => setSelectedMilestone(
                  selectedMilestone === milestone.id ? null : milestone.id
                )}
                transactionInProgress={transactionInProgress || loading}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {showAddMilestone && (
          <AddMilestoneModal
            contractBudget={contract.totalAmount}
            usedBudget={totalMilestoneAmount}
            contractEndDate={contract.endDate}
            onAdd={handleAddMilestone}
            onCancel={() => setShowAddMilestone(false)}
            isSubmitting={transactionInProgress || loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual milestone card component
interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  userRole: UserRole;
  onSubmit: (milestoneId: number, note: string) => void;
  onApprove: (milestoneId: number) => void;
  onReject: (milestoneId: number, reason: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  transactionInProgress: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  index,
  userRole,
  onSubmit,
  onApprove,
  onReject,
  isSelected,
  onSelect,
  transactionInProgress
}) => {
  const [submissionNote, setSubmissionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const statusInfo = getMilestoneStatusInfo(milestone.status);
  const canSubmit = userRole === UserRole.FREELANCER && milestone.status === MilestoneStatus.PENDING;
  const canApprove = userRole === UserRole.CLIENT && milestone.status === MilestoneStatus.SUBMITTED;
  const canReject = userRole === UserRole.CLIENT && milestone.status === MilestoneStatus.SUBMITTED;

  const isOverdue = isMilestoneOverdue(milestone.deadline, milestone.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
      } ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
      onClick={onSelect}
    >
      {/* Milestone Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-500">
              Milestone {index + 1}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                Overdue
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">{milestone.description}</h4>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
            <DollarSign className="w-4 h-4" />
            {formatSTX(milestone.amount)}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="w-3 h-3" />
            Due {formatDate(milestone.deadline)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        {canSubmit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSubmitForm(true);
            }}
            disabled={transactionInProgress}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit Work
          </button>
        )}
        
        {canApprove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(milestone.id);
            }}
            disabled={transactionInProgress}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        )}
        
        {canReject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRejectForm(true);
            }}
            disabled={transactionInProgress}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        )}
      </div>

      {/* Submission Note */}
      {milestone.submissionNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h5 className="font-medium text-blue-900 mb-1">Submission Note:</h5>
          <p className="text-blue-800 text-sm">{milestone.submissionNotes}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {milestone.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <h5 className="font-medium text-red-900 mb-1">Rejection Reason:</h5>
          <p className="text-red-800 text-sm">{milestone.rejectionReason}</p>
        </div>
      )}

      {/* Submit Form */}
      {showSubmitForm && (
        <div className="border-t pt-4 mt-4" onClick={(e) => e.stopPropagation()}>
          <h5 className="font-medium text-gray-900 mb-2">Submit your work:</h5>
          <textarea
            value={submissionNote}
            onChange={(e) => setSubmissionNote(e.target.value)}
            placeholder="Describe the completed work, include links to deliverables..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                onSubmit(milestone.id, submissionNote);
                setShowSubmitForm(false);
                setSubmissionNote('');
              }}
              disabled={!submissionNote.trim() || transactionInProgress}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setShowSubmitForm(false);
                setSubmissionNote('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="border-t pt-4 mt-4" onClick={(e) => e.stopPropagation()}>
          <h5 className="font-medium text-gray-900 mb-2">Reason for rejection:</h5>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain what needs to be changed or improved..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                onReject(milestone.id, rejectionReason);
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              disabled={!rejectionReason.trim() || transactionInProgress}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              Reject
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Add Milestone Modal Component
interface AddMilestoneModalProps {
  contractBudget: number;
  usedBudget: number;
  contractEndDate: number;
  onAdd: (milestoneData: { description: string; amount: number; deadline: Date }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
  contractBudget,
  usedBudget,
  contractEndDate,
  onAdd,
  onCancel,
  isSubmitting
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const remainingBudget = microStxToStx(contractBudget - usedBudget);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!isValidDescription(description)) {
      newErrors.description = 'Description must be between 10 and 300 characters';
    }

    if (!isValidSTXAmount(amount)) {
      newErrors.amount = 'Please enter a valid STX amount';
    } else if (parseFloat(amount) > remainingBudget) {
      newErrors.amount = `Amount cannot exceed remaining budget (${remainingBudget.toFixed(6)} STX)`;
    }

    const deadlineTimestamp = new Date(deadline).getTime();
    if (!isValidDeadline(deadlineTimestamp)) {
      newErrors.deadline = 'Deadline must be between 1 day and 1 year from now';
    } else if (deadlineTimestamp >= contractEndDate) {
      newErrors.deadline = 'Deadline must be before contract end date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      deadline: new Date(deadline)
    });
  };

  // Get min and max dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  
  const maxDate = new Date(contractEndDate);
  maxDate.setDate(maxDate.getDate() - 1); // Must be before contract end
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Milestone</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be delivered..."
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (STX)
            </label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              max={remainingBudget}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.5"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Remaining budget: {remainingBudget.toFixed(6)} STX
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              min={minDate}
              max={maxDateString}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.deadline ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.deadline && (
              <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !description || !amount || !deadline}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </div>
              ) : (
                'Add Milestone'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
