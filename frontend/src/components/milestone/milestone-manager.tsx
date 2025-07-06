import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Contract, Milestone, MilestoneStatus } from '../../types';
import { stxToMicroStx } from '../../types';

interface MilestoneManagerProps {
  contract: Contract;
  milestones: Milestone[];
  onContractUpdate: () => void;
  addMilestone: (contractId: number, description: string, amount: number, deadline: number) => Promise<{ success: boolean; txId?: string; error?: string }>;
  submitMilestone: (contractId: number, milestoneId: number, submissionNote: string) => Promise<{ success: boolean; error?: string }>;
  approveMilestone: (contractId: number, milestoneId: number) => Promise<{ success: boolean; error?: string }>;
  rejectMilestone: (contractId: number, milestoneId: number, rejectionReason: string) => Promise<{ success: boolean; error?: string }>;
}

interface MilestoneFormData {
  description: string;
  amount: number;
  deadline: Date;
}

export default function MilestoneManager({
  contract,
  milestones,
  onContractUpdate,
  addMilestone,
  submitMilestone,
  approveMilestone,
  rejectMilestone
}: MilestoneManagerProps) {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [milestoneData, setMilestoneData] = useState<MilestoneFormData>({
    description: '',
    amount: 0,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default: 1 week from now
  });

  const handleAddMilestone = async () => {
    if (!milestoneData.description.trim() || milestoneData.amount <= 0) {
      alert('Please fill in all milestone details');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ CONVERT TO UNIX TIMESTAMP IN SECONDS (not milliseconds!)
      const deadlineTimestamp = Math.floor(milestoneData.deadline.getTime() / 1000); // Convert to seconds
      const amountInMicroStx = stxToMicroStx(milestoneData.amount);

      // ✅ Validation: Check remaining balance
      if (amountInMicroStx > contract.remainingBalance) {
        alert(`Error: Milestone amount (${milestoneData.amount} STX) exceeds remaining contract balance (${contract.remainingBalance / 1000000} STX)`);
        return;
      }

      const result = await addMilestone(
        contract.id,
        milestoneData.description,
        amountInMicroStx,
        deadlineTimestamp  // ✅ FIXED: Now using Unix timestamp (seconds since epoch)
      );
      
      if (result.success) {
        setShowAddMilestone(false);
        onContractUpdate();
      } else {
        alert(`Error adding milestone: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to add milestone: ' + (error as Error).message);
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

  return (
    <div className="space-y-6">
      {/* Add Milestone Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Milestones</h3>
          <button
            onClick={() => setShowAddMilestone(!showAddMilestone)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </button>
        </div>

        {showAddMilestone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t pt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={milestoneData.description}
                onChange={(e) => setMilestoneData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the milestone deliverables..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (STX)
                </label>
                <input
                  type="number"
                  value={milestoneData.amount}
                  onChange={(e) => setMilestoneData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  step="0.000001"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={milestoneData.deadline.toISOString().slice(0, 16)}
                  onChange={(e) => setMilestoneData(prev => ({ ...prev, deadline: new Date(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddMilestone(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMilestone}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Milestone'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Existing Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {milestone.description}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {(milestone.amount / 1000000).toFixed(6)} STX
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(milestone.deadline * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {milestone.status === MilestoneStatus.PENDING && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </span>
                )}
                {milestone.status === MilestoneStatus.SUBMITTED && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Submitted
                  </span>
                )}
                {milestone.status === MilestoneStatus.APPROVED && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </span>
                )}
                {milestone.status === MilestoneStatus.REJECTED && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Rejected
                  </span>
                )}
              </div>
            </div>

            {/* Milestone Actions */}
            {milestone.status === MilestoneStatus.PENDING && (
              <div className="border-t pt-4">
                <button
                  onClick={() => {
                    const submissionNote = prompt('Enter submission note:');
                    if (submissionNote) handleSubmitMilestone(index, submissionNote);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Work
                </button>
              </div>
            )}

            {milestone.status === MilestoneStatus.SUBMITTED && (
              <div className="border-t pt-4 flex space-x-3">
                <button
                  onClick={() => handleApproveMilestone(index)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const rejectionReason = prompt('Enter rejection reason:');
                    if (rejectionReason) handleRejectMilestone(index, rejectionReason);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
