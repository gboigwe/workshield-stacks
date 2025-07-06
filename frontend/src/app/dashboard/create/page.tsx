// src/app/dashboard/create/page.tsx - Enhanced with Address Validation
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, User, Calendar, DollarSign, FileText } from 'lucide-react';

// Helper function to convert STX to microSTX
const stxToMicroStx = (stx: number): number => {
  return Math.floor(stx * 1000000);
};

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
    userAddress  // ✅ ADDED: This was missing
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

  // ✅ REAL-TIME VALIDATION (Enhanced with your address validation)
  const validateField = (name: string, value: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    switch (name) {
      case 'freelancer':
        if (!value.trim()) {
          errors.push({ field: name, message: 'Freelancer address is required', type: 'error' });
        } else {
          const addressValidation = validateAddress(value.trim());
          if (!addressValidation) {
            // errors.push({ field: name, message: addressValidation.error!, type: 'error' });
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

    console.log('🔍 Validating form data:', formData);

    // Validate freelancer address with detailed logging
    if (!formData.freelancer.trim()) {
      newErrors.freelancer = 'Freelancer address is required';
      console.log('❌ Freelancer address is empty');
    } else {
      const address = formData.freelancer.trim();
      console.log('🔍 Validating freelancer address:', address);
      
      // ✅ FIXED: Use validateAddress correctly (returns boolean)
      const isValid = validateAddress(address);
      console.log('🔍 Address validation result:', isValid);
      
      if (!isValid) {
        newErrors.freelancer = 'Invalid Stacks address format';
        console.log('❌ Address validation failed');
      } else {
        console.log('✅ Address validation passed');
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
    
    console.log('🔍 Form validation result:', isValid);
    console.log('🔍 Form errors:', newErrors);
    
    return isValid;
  };

  // ✅ FIXED: Complete handleSubmit function with proper userAddress usage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    if (!isSignedIn) {
      console.log('❌ User not signed in');
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

    console.log('🚀 Submitting contract creation...');
    
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
        console.log('✅ Contract creation successful');
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
        console.log('❌ Contract creation failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error in contract creation:', error);
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



















// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { motion } from 'framer-motion';
// import { useStacks } from '@/hooks/useStacks';
// import DebugStatus from '@/components/debug/debug-status';
// import { 
//   isValidStacksAddress, 
//   isValidSTXAmount, 
//   isValidDeadline, 
//   isValidDescription, 
//   stxToMicroStx
// } from '@/types';
// import { 
//   User, 
//   Calendar, 
//   DollarSign, 
//   FileText, 
//   CheckCircle, 
//   AlertTriangle,
//   Loader2,
//   ArrowLeft,
//   Bug
// } from 'lucide-react';

// // ✅ FIXED: Simplified form data interface
// interface FormData {
//   freelancer: string;
//   description: string;
//   totalAmount: string;
//   endDate: string;
// }

// // ✅ FIXED: Simplified errors interface
// interface FormErrors {
//   freelancer?: string;
//   description?: string;
//   totalAmount?: string;
//   endDate?: string;
// }

// export default function CreateContractPage() {
//   const router = useRouter();

//   console.log('🔍 DEBUG: Current State Check');
//   console.log('===============================');

//   // Check environment variables
//   console.log('Environment Variables:');
//   console.log('- NEXT_PUBLIC_NETWORK:', process.env.NEXT_PUBLIC_NETWORK);
//   console.log('- NEXT_PUBLIC_HIRO_API_KEY:', process.env.NEXT_PUBLIC_HIRO_API_KEY ? 'SET ✅' : 'MISSING ❌');
//   console.log('- NEXT_PUBLIC_ESCROW_CONTRACT:', process.env.NEXT_PUBLIC_ESCROW_CONTRACT);

//   const { 
//     userData, 
//     isSignedIn, 
//     loading, 
//     connectWallet, 
//     createEscrow, 
//     transactionInProgress, 
//     network,
//     userAddress
//   } = useStacks();
  
//   const [mounted, setMounted] = useState(false);
//   const [showDebugTools, setShowDebugTools] = useState(false);
  
//   // ✅ FIXED: Simple form state - no complex validation on change
//   const [formData, setFormData] = useState<FormData>({
//     freelancer: '',
//     description: '',
//     totalAmount: '',
//     endDate: ''
//   });
  
//   const [errors, setErrors] = useState<FormErrors>({});
//   const [txResult, setTxResult] = useState<{ success: boolean; txId?: string; error?: string } | null>(null);

//   // Handle client-side mounting
//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   // Redirect if not signed in
//   useEffect(() => {
//     if (mounted && !loading && !isSignedIn) {
//       router.push('/');
//     }
//   }, [isSignedIn, loading, router, mounted]);

//   // Don't render until mounted (prevents hydration issues)
//   if (!mounted) {
//     return null;
//   }

  

//   // Show loading state
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
//           <p>Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Show connect wallet if not signed in
//   if (!isSignedIn) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
//           <button
//             onClick={connectWallet}
//             className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
//           >
//             Connect Wallet
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Add this temporarily to your create contract page or dashboard
//   // to see what's actually happening

//   // Check user data (add this in your component where useStacks is called)
//   // const { userData, userAddress, isSignedIn } = useStacks();

//   console.log('User Information:');
//   console.log('- Is Signed In:', isSignedIn);
//   console.log('- User Address:', userAddress);
//   console.log('- User Data:', userData);

//   if (userData?.profile?.stxAddress) {
//     console.log('- Testnet Address:', userData.profile.stxAddress.testnet);
//     console.log('- Mainnet Address:', userData.profile.stxAddress.mainnet);
//   }

//   // Check which address is being used for contract fetching
//   console.log('Expected Behavior:');
//   console.log('- Should only fetch contracts for:', userAddress);
//   console.log('- Should NOT see other users\' data');

//   // ✅ FIXED: Simple input change handler
//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target;
    
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
    
//     // Clear error when user starts typing
//     if (errors[name as keyof FormErrors]) {
//       setErrors(prev => ({
//         ...prev,
//         [name]: undefined
//       }));
//     }
//   };

//   // ✅ FIXED: Validation only on submit
//   const validateForm = (): boolean => {
//     const newErrors: FormErrors = {};

//     console.log('🔍 Validating form data:', formData);

//     // Validate freelancer address with detailed logging
//     if (!formData.freelancer.trim()) {
//       newErrors.freelancer = 'Freelancer address is required';
//       console.log('❌ Freelancer address is empty');
//     } else {
//       const address = formData.freelancer.trim();
//       console.log('🔍 Validating freelancer address:', address);
      
//       // Manual validation check with logging
//       const isValid = isValidStacksAddress(address);
//       console.log('Validation result:', isValid);
      
//       if (!isValid) {
//         newErrors.freelancer = 'Please enter a valid Stacks address (ST... or SP...)';
//         console.log('❌ Address validation failed for:', address);
        
//         // Additional debugging
//         console.log('Address length:', address.length);
//         console.log('Starts with ST:', address.startsWith('ST'));
//         console.log('Starts with SP:', address.startsWith('SP'));
//         console.log('Pattern test:', /^S[TP][A-Z0-9]{39}$/i.test(address));
//       } else {
//         console.log('✅ Address validation passed for:', address);
//       }
//     }

//     // Validate description
//     if (!formData.description.trim()) {
//       newErrors.description = 'Description is required';
//     } else if (!isValidDescription(formData.description.trim())) {
//       newErrors.description = 'Description must be between 10 and 500 characters';
//     }

//     // Validate total amount
//     if (!formData.totalAmount.trim()) {
//       newErrors.totalAmount = 'Total amount is required';
//     } else if (!isValidSTXAmount(formData.totalAmount)) {
//       newErrors.totalAmount = 'Please enter a valid STX amount (0.000001 - 1,000,000)';
//     }

//     // Validate end date
//     if (!formData.endDate.trim()) {
//       newErrors.endDate = 'End date is required';
//     } else {
//       const endDateTimestamp = new Date(formData.endDate).getTime();
//       if (!isValidDeadline(endDateTimestamp)) {
//         newErrors.endDate = 'End date must be between 1 day and 1 year from now';
//       }
//     }

//     console.log('Validation errors:', newErrors);
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateForm()) return;
//     if (!userData?.profile?.stxAddress?.testnet) {
//       alert('Please connect your wallet first');
//       return;
//     }

//     setTxResult(null);

//     try {
//       const clientAddress = userData.profile.stxAddress.testnet;
//       const freelancerAddress = formData.freelancer.trim();
//       const description = formData.description.trim();
//       const endDateTimestamp = new Date(formData.endDate).getTime(); // Keep in milliseconds
//       const totalAmountMicroStx = stxToMicroStx(parseFloat(formData.totalAmount));

//       console.log('🚀 Creating escrow with params:', {
//         clientAddress,
//         freelancerAddress,
//         description: description.substring(0, 50) + '...',
//         endDateTimestamp,
//         totalAmountMicroStx
//       });

//       const result = await createEscrow(
//         clientAddress,
//         freelancerAddress,
//         description,
//         endDateTimestamp,
//         totalAmountMicroStx
//       );

//       setTxResult(result);

//       if (result.success) {
//         console.log('✅ Contract created successfully:', result);
//         setTimeout(() => router.push('/dashboard'), 3000);
//       } else {
//         console.log('❌ Contract creation failed:', result.error);
//       }

//     } catch (error) {
//       console.error('❌ Error creating contract:', error);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       setTxResult({
//         success: false,
//         error: `Failed to create contract: ${errorMessage}`
//       });
//     }
//   };

//   // ✅ FIXED: Simplified form validation
//   const canSubmit = !!(formData.freelancer && formData.description && formData.totalAmount && formData.endDate);

//   // Get minimum date (tomorrow)
//   const tomorrow = new Date();
//   tomorrow.setDate(tomorrow.getDate() + 1);
//   const minDate = tomorrow.toISOString().split('T')[0];

//   // Get maximum date (1 year from now)
//   const maxDate = new Date();
//   maxDate.setFullYear(maxDate.getFullYear() + 1);
//   const maxDateString = maxDate.toISOString().split('T')[0];

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//         >
//           {/* Header */}
//           <div className="mb-8">
//             <button
//               onClick={() => router.back()}
//               className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
//             >
//               <ArrowLeft className="w-4 h-4" />
//               Back to Dashboard
//             </button>
            
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Contract</h1>
//             <p className="text-gray-600">
//               Set up a secure escrow contract with milestone-based payments
//             </p>
//           </div>

//           {/* Debug Tools Toggle */}
//           <div className="mb-6">
//             <button
//               onClick={() => setShowDebugTools(!showDebugTools)}
//               className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
//             >
//               <Bug className="w-4 h-4" />
//               {showDebugTools ? 'Hide' : 'Show'} Debug Tools
//             </button>
//           </div>

//           {/* Debug Status */}
//           {showDebugTools && (
//             <div className="mb-6">
//               <DebugStatus />
//             </div>
//           )}

//           {/* Transaction Result */}
//           {txResult && (
//             <div className={`mb-6 p-4 rounded-lg border ${
//               txResult.success 
//                 ? 'bg-green-50 border-green-200' 
//                 : 'bg-red-50 border-red-200'
//             }`}>
//               <div className="flex items-center gap-2">
//                 {txResult.success ? (
//                   <CheckCircle className="w-5 h-5 text-green-600" />
//                 ) : (
//                   <AlertTriangle className="w-5 h-5 text-red-600" />
//                 )}
//                 <h3 className={`font-medium ${
//                   txResult.success ? 'text-green-900' : 'text-red-900'
//                 }`}>
//                   {txResult.success ? 'Contract Created Successfully!' : 'Contract Creation Failed'}
//                 </h3>
//               </div>
              
//               {txResult.success ? (
//                 <div className="mt-2 text-sm text-green-700">
//                   {txResult.txId && (
//                     <p>Transaction ID: <span className="font-mono break-all">{txResult.txId}</span></p>
//                   )}
//                   <p>Redirecting to dashboard in 3 seconds...</p>
//                 </div>
//               ) : (
//                 <p className="mt-2 text-sm text-red-700">
//                   {txResult.error || 'An error occurred while creating the contract'}
//                 </p>
//               )}
//             </div>
//           )}

//           {/* Form */}
//           <div className="bg-white rounded-lg shadow-sm border border-gray-200">
//             <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
//               {/* Freelancer Address */}
//               <div>
//                 <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700 mb-2">
//                   <User className="w-4 h-4 inline mr-2" />
//                   Freelancer Stacks Address
//                 </label>
//                 <input
//                   type="text"
//                   id="freelancer"
//                   name="freelancer"
//                   value={formData.freelancer}
//                   onChange={handleInputChange}
//                   placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
//                   className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
//                     errors.freelancer ? 'border-red-500' : 'border-gray-300'
//                   }`}
//                 />
//                 {errors.freelancer && (
//                   <p className="mt-1 text-sm text-red-600">{errors.freelancer}</p>
//                 )}
//               </div>

//               {/* Description */}
//               <div>
//                 <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
//                   <FileText className="w-4 h-4 inline mr-2" />
//                   Project Description
//                 </label>
//                 <textarea
//                   id="description"
//                   name="description"
//                   rows={4}
//                   value={formData.description}
//                   onChange={handleInputChange}
//                   placeholder="Describe the project scope, deliverables, and requirements..."
//                   className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
//                     errors.description ? 'border-red-500' : 'border-gray-300'
//                   }`}
//                 />
//                 <div className="mt-1 flex justify-between text-xs text-gray-500">
//                   <span>{formData.description.length}/500 characters</span>
//                   {errors.description && (
//                     <span className="text-red-600">{errors.description}</span>
//                   )}
//                 </div>
//               </div>

//               {/* Total Amount */}
//               <div>
//                 <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-2">
//                   <DollarSign className="w-4 h-4 inline mr-2" />
//                   Total Contract Amount (STX)
//                 </label>
//                 <input
//                   type="number"
//                   id="totalAmount"
//                   name="totalAmount"
//                   step="0.000001"
//                   min="0.000001"
//                   max="1000000"
//                   value={formData.totalAmount}
//                   onChange={handleInputChange}
//                   placeholder="10.5"
//                   className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
//                     errors.totalAmount ? 'border-red-500' : 'border-gray-300'
//                   }`}
//                 />
//                 {errors.totalAmount && (
//                   <p className="mt-1 text-sm text-red-600">{errors.totalAmount}</p>
//                 )}
//                 <p className="mt-1 text-xs text-gray-500">
//                   Funds will be locked in escrow until milestones are completed
//                 </p>
//               </div>

//               {/* End Date */}
//               <div>
//                 <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
//                   <Calendar className="w-4 h-4 inline mr-2" />
//                   Contract End Date
//                 </label>
//                 <input
//                   type="date"
//                   id="endDate"
//                   name="endDate"
//                   min={minDate}
//                   max={maxDateString}
//                   value={formData.endDate}
//                   onChange={handleInputChange}
//                   className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
//                     errors.endDate ? 'border-red-500' : 'border-gray-300'
//                   }`}
//                 />
//                 {errors.endDate && (
//                   <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
//                 )}
//                 <p className="mt-1 text-xs text-gray-500">
//                   All milestones must be completed before this date
//                 </p>
//               </div>

//               {/* Submit Button */}
//               <div className="pt-4">
//                 <button
//                   type="submit"
//                   disabled={!canSubmit || transactionInProgress}
//                   className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
//                     !canSubmit || transactionInProgress
//                       ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                       : 'bg-orange-600 text-white hover:bg-orange-700'
//                   }`}
//                 >
//                   {transactionInProgress ? (
//                     <div className="flex items-center justify-center gap-2">
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Confirm in Wallet...
//                     </div>
//                   ) : (
//                     'Create Escrow Contract'
//                   )}
//                 </button>
//               </div>

//               {/* Form Status */}
//               {!canSubmit && (
//                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                   <h4 className="font-medium text-blue-900 mb-2">Complete the form to continue:</h4>
//                   <ul className="text-sm text-blue-800 space-y-1">
//                     {!formData.freelancer && <li>• Enter freelancer's Stacks address</li>}
//                     {!formData.description && <li>• Add project description</li>}
//                     {!formData.totalAmount && <li>• Set total contract amount</li>}
//                     {!formData.endDate && <li>• Choose contract end date</li>}
//                   </ul>
//                 </div>
//               )}

//             </form>
//           </div>

//           {/* Help Text */}
//           <div className="mt-6 text-center text-gray-600">
//             <p className="text-sm">
//               After creating the contract, you can add milestones to break down the project into manageable phases.
//             </p>
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }
