'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { isValidStacksAddress, stxToMicroStx, isValidStxAmount, isValidDeadline } from '@/lib/utils';
import { Calendar, User, FileText, DollarSign, AlertCircle } from 'lucide-react';
import DebugStatus from '@/components/debug/debug-status';

interface FormData {
  freelancer: string;
  description: string;
  totalAmount: string;
  endDate: string;
}

interface FormErrors {
  freelancer?: string;
  description?: string;
  totalAmount?: string;
  endDate?: string;
}

export default function CreateContractPage() {
  const { isSignedIn, userData, createEscrow, loading, transactionInProgress } = useStacks();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    freelancer: '',
    description: '',
    totalAmount: '',
    endDate: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate freelancer address
    if (!formData.freelancer.trim()) {
      newErrors.freelancer = 'Freelancer address is required';
    } else if (!isValidStacksAddress(formData.freelancer.trim())) {
      newErrors.freelancer = 'Invalid Stacks address. Must be 41 characters and start with ST or SP';
    } else if (formData.freelancer.trim() === userData?.profile?.stxAddress?.testnet || 
               formData.freelancer.trim() === userData?.profile?.stxAddress?.mainnet) {
      newErrors.freelancer = 'Cannot create contract with yourself';
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Validate amount
    if (!formData.totalAmount.trim()) {
      newErrors.totalAmount = 'Total amount is required';
    } else if (!isValidStxAmount(formData.totalAmount)) {
      newErrors.totalAmount = 'Invalid amount. Must be a positive number up to 1,000,000 STX';
    }

    // Validate end date
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      const endDateTimestamp = new Date(formData.endDate).getTime();
      if (!isValidDeadline(endDateTimestamp)) {
        newErrors.endDate = 'End date must be between 1 day and 1 year from now';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted with data:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    if (!isSignedIn || !userData) {
      console.log('❌ User not signed in');
      alert('Please connect your wallet first');
      return;
    }

    setSubmitting(true);

    try {
      const clientAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
      const endDateTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000); // Convert to seconds
      const totalAmountMicroStx = stxToMicroStx(parseFloat(formData.totalAmount));

      console.log('📋 Processed form data:', {
        clientAddress,
        freelancer: formData.freelancer.trim(),
        description: formData.description.trim(),
        endDateTimestamp,
        totalAmountMicroStx
      });

      createEscrow(
        clientAddress!,
        formData.freelancer.trim(),
        formData.description.trim(),
        endDateTimestamp,
        totalAmountMicroStx,
        (data) => {
          console.log('✅ Contract created successfully:', data);
          setSubmitting(false);
          // Show success message and redirect
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        },
        () => {
          console.log('❌ Contract creation cancelled');
          setSubmitting(false);
        }
      );
    } catch (error: unknown) {
      console.error('❌ Error creating contract:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrors({ description: `Failed to create contract: ${errorMessage}` });
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-lg rounded-xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Contract</h1>
            <p className="text-gray-600">
              Set up a secure escrow contract with milestone-based payments
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Freelancer Address */}
            <div>
              <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Freelancer Stacks Address
              </label>
              <input
                type="text"
                id="freelancer"
                value={formData.freelancer}
                onChange={handleInputChange('freelancer')}
                placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.freelancer ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.freelancer && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.freelancer}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the freelancer's Stacks address (41 characters, starts with ST or SP)
              </p>
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Project Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Describe the project scope, deliverables, and requirements..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Total Amount */}
            <div>
              <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Total Contract Amount (STX)
              </label>
              <input
                type="number"
                id="totalAmount"
                value={formData.totalAmount}
                onChange={handleInputChange('totalAmount')}
                placeholder="100"
                min="0"
                step="0.000001"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.totalAmount ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.totalAmount && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.totalAmount}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Total amount to be paid upon project completion
              </p>
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Project End Date
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={handleInputChange('endDate')}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} // Tomorrow
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} // 1 year from now
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.endDate}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Final deadline for project completion
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting || transactionInProgress}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || transactionInProgress}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting || transactionInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {transactionInProgress ? 'Confirm in Wallet...' : 'Creating Contract...'}
                  </>
                ) : (
                  'Create Contract'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      
      {/* Debug component for development */}
      <DebugStatus />
    </div>
  );
}
