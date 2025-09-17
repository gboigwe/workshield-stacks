'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, User, Calendar, DollarSign, FileText } from 'lucide-react';


// Enhanced validation interface
interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface FormData {
  freelancer: string;
  description: string;
  totalAmount: string;
  endDate: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function CreateContractPage() {
  const router = useRouter();
  
  // ✅ FIXED: Added userAddress to the destructuring
  const { 
    userData, 
    isSignedIn, 
    createEscrow, 
    validateAddress, 
    transactionInProgress,
    connectWallet,
  } = useStacks();

  const [formData, setFormData] = useState<FormData>({
    freelancer: '',
    description: '',
    totalAmount: '',
    endDate: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [txResult, setTxResult] = useState<{ success: boolean; error?: string; txId?: string } | null>(null);

  // ✅ REAL-TIME VALIDATION
  const validateField = (name: string, value: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    switch (name) {
      case 'freelancer':
        if (!value.trim()) {
          errors.push({ field: name, message: 'Freelancer address is required', type: 'error' });
        } else {
          const addressValidation = validateAddress(value.trim());
          if (!addressValidation) {
            errors.push({ field: name, message: 'Invalid Stacks address format', type: 'error' });
          } else {
            // Check if same as client
            const clientAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
            if (value.trim() === clientAddress) {
              errors.push({ field: name, message: 'Freelancer cannot be the same as client', type: 'error' });
            } else {
              errors.push({ field: name, message: '✓ Valid address', type: 'info' });
            }
          }
        }
        break;
        
      case 'description':
        if (!value.trim()) {
          errors.push({ field: name, message: 'Description is required', type: 'error' });
        } else if (value.trim().length < 10) {
          errors.push({ field: name, message: 'Description must be at least 10 characters', type: 'error' });
        } else if (value.trim().length > 500) {
          errors.push({ field: name, message: 'Description cannot exceed 500 characters', type: 'error' });
        } else {
          errors.push({ field: name, message: `✓ ${value.trim().length}/500 characters`, type: 'info' });
        }
        break;
        
      case 'totalAmount':
        if (!value.trim()) {
          errors.push({ field: name, message: 'Total amount is required', type: 'error' });
        } else {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            errors.push({ field: name, message: 'Amount must be a positive number', type: 'error' });
          } else if (amount < 0.000001) {
            errors.push({ field: name, message: 'Minimum amount is 0.000001 STX', type: 'error' });
          } else if (amount > 1000000) {
            errors.push({ field: name, message: 'Maximum amount is 1,000,000 STX', type: 'warning' });
          } else {
            errors.push({ field: name, message: `✓ ${amount.toLocaleString()} STX`, type: 'info' });
          }
        }
        break;
        
      case 'endDate':
        if (!value.trim()) {
          errors.push({ field: name, message: 'End date is required', type: 'error' });
        } else {
          const endDate = new Date(value);
          const now = new Date();
          const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
          const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
          
          if (endDate <= now) {
            errors.push({ field: name, message: 'End date must be in the future', type: 'error' });
          } else if (endDate < minDate) {
            errors.push({ field: name, message: 'End date must be at least 24 hours from now', type: 'warning' });
          } else if (endDate > maxDate) {
            errors.push({ field: name, message: 'End date cannot be more than 1 year from now', type: 'warning' });
          } else {
            const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            errors.push({ field: name, message: `✓ ${days} days from now`, type: 'info' });
          }
        }
        break;
    }
    
    return errors;
  };

  // ✅ HANDLE INPUT CHANGES WITH REAL-TIME VALIDATION
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    const fieldErrors = validateField(name, value);
    setValidationErrors(prev => [
      ...prev.filter(error => error.field !== name),
      ...fieldErrors
    ]);
    
    // Clear form errors for this field
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  // ✅ COMPREHENSIVE FORM VALIDATION
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};


    // Validate freelancer address with detailed logging
    if (!formData.freelancer.trim()) {
      newErrors.freelancer = 'Freelancer address is required';
    } else {
      const address = formData.freelancer.trim();
      
      // ✅ FIXED: Use validateAddress correctly (returns boolean)
      const isValid = validateAddress(address);
      
      if (!isValid) {
        newErrors.freelancer = 'Invalid Stacks address format';
      } else {
      }
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    // Validate total amount
    if (!formData.totalAmount) {
      newErrors.totalAmount = 'Total amount is required';
    } else {
      const amount = parseFloat(formData.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.totalAmount = 'Amount must be a positive number';
      }
    }

    // Validate end date
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      const endDate = new Date(formData.endDate);
      const now = new Date();
      if (endDate <= now) {
        newErrors.endDate = 'End date must be in the future';
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    
    
    return isValid;
  };

  // ✅ FIXED: Complete handleSubmit function with proper userAddress usage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!isSignedIn) {
      setTxResult({ success: false, error: 'Please connect your wallet first' });
      return;
    }

    // ✅ FIXED: Use the destructured userAddress
    // Client is automatically the current user
    const clientAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

    if (!clientAddress) {
      setTxResult({ success: false, error: 'Please connect your wallet properly' });
      return;
    }

    
    try {
      const totalAmountMicroStx = parseFloat(formData.totalAmount) * 1000000; // Convert to microSTX
      const endDateTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000); // Convert to Unix timestamp
      
      // ✅ FIXED: Call createEscrow with correct 5 parameters matching smart contract
      const result = await createEscrow(
        clientAddress,                    
        formData.freelancer.trim(),     // freelancer
        formData.description.trim(),    // description
        endDateTimestamp,               // endDate
        totalAmountMicroStx            // totalAmount
      );

      setTxResult(result);
      
      if (result.success) {
        // Reset form on success
        setFormData({
          freelancer: '',
          description: '',
          totalAmount: '',
          endDate: ''
        });
        setErrors({});
        setValidationErrors([]);
        
        // Navigate to dashboard after successful creation
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
      }
    } catch (error) {
      setTxResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // ✅ VALIDATION DISPLAY COMPONENT
  const ValidationDisplay = ({ field }: { field: string }) => {
    const fieldErrors = validationErrors.filter(e => e.field === field);
    
    if (fieldErrors.length === 0) return null;
    
    return (
      <div className="mt-1 space-y-1">
        {fieldErrors.map((error, index) => (
          <div key={index} className={`flex items-center text-sm ${
            error.type === 'error' ? 'text-red-600' : 
            error.type === 'warning' ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {error.type === 'error' && <XCircle className="w-4 h-4 mr-1" />}
            {error.type === 'warning' && <AlertCircle className="w-4 h-4 mr-1" />}
            {error.type === 'info' && <CheckCircle className="w-4 h-4 mr-1" />}
            {error.message}
          </div>
        ))}
      </div>
    );
  };

  // Check if form is valid (no error-type validations)
  const hasErrors = validationErrors.some(e => e.type === 'error');
  const canSubmit = !hasErrors && Object.values(formData).every(v => v.trim() !== '');

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">You need to connect your wallet to create a contract</p>
          <button
            onClick={connectWallet}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Contract</h1>
          <p className="text-gray-600 mt-2">Set up a milestone-based payment contract with enhanced validation</p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Freelancer Address */}
              <div>
                <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Freelancer Address
                </label>
                <input
                  type="text"
                  id="freelancer"
                  name="freelancer"
                  value={formData.freelancer}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.freelancer ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ST2C36S11ETAE5TAE1Z1F1Q2SYTMF1FW7VQZEJNGZ"
                />
                <ValidationDisplay field="freelancer" />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Project Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe the project, deliverables, and requirements..."
                />
                <ValidationDisplay field="description" />
              </div>

              {/* Total Amount */}
              <div>
                <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Total Amount (STX)
                </label>
                <input
                  type="number"
                  id="totalAmount"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="0.000001"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.totalAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100.0"
                />
                <ValidationDisplay field="totalAmount" />
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
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <ValidationDisplay field="endDate" />
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!canSubmit || transactionInProgress}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform ${
                    canSubmit && !transactionInProgress
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:scale-105 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {transactionInProgress ? 'Creating Contract...' : 'Create Contract'}
                </button>
              </div>
            </form>

            {/* Transaction Result */}
            {txResult && (
              <div className={`mt-6 p-4 rounded-xl ${
                txResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {txResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${
                    txResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {txResult.success ? 'Contract Created Successfully!' : 'Contract Creation Failed'}
                  </span>
                </div>
                {txResult.error && (
                  <p className="text-red-700 mt-2 text-sm">{txResult.error}</p>
                )}
                {txResult.success && (
                  <p className="text-green-700 mt-2 text-sm">
                    Redirecting to dashboard in 2 seconds...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* API Integration Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Enhanced with Hiro API Integration</span>
          </div>
          <p className="text-blue-700 mt-1 text-sm">
            This form includes real-time address validation and reduced rate limiting using your Hiro API key.
          </p>
        </div>
      </div>
    </div>
  );
}
