'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { useOrganizations } from '@/hooks/useOrganizations';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Building,
  Coins,
  Users
} from 'lucide-react';

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
  contractType: 'individual' | 'organization';
  organizationId: string;
  tokenType: 'STX' | 'sBTC' | 'other';
  tokenContract: string;
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
  
  const { 
    userData, 
    isSignedIn, 
    createEscrow, 
    validateAddress, 
    transactionInProgress,
    connectWallet,
    userAddress
  } = useStacks();

  const { organizations, loading: orgLoading } = useOrganizations();

  const [formData, setFormData] = useState<FormData>({
    contractType: 'individual',
    organizationId: '',
    tokenType: 'STX',
    tokenContract: '',
    freelancer: '',
    description: '',
    totalAmount: '',
    endDate: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [txResult, setTxResult] = useState<{ success: boolean; error?: string; txId?: string } | null>(null);

  // Available token options
  const tokenOptions = [
    { value: 'STX', label: 'STX (Stacks)', description: 'Native Stacks token' },
    { value: 'sBTC', label: 'sBTC (Stacked Bitcoin)', description: '1:1 Bitcoin-backed token' },
    { value: 'other', label: 'Custom Token', description: 'Enter custom SIP-010 token contract' }
  ];

  // REAL-TIME VALIDATION
  const validateField = (name: string, value: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    switch (name) {
      case 'organizationId':
        if (formData.contractType === 'organization') {
          if (!value.trim()) {
            errors.push({ field: name, message: 'Organization selection is required', type: 'error' });
          } else {
            const org = organizations.find(o => o.id.toString() === value);
            if (org) {
              errors.push({ field: name, message: `✓ ${org.name} selected`, type: 'info' });
            }
          }
        }
        break;

      case 'tokenContract':
        if (formData.tokenType === 'other') {
          if (!value.trim()) {
            errors.push({ field: name, message: 'Token contract address is required', type: 'error' });
          } else {
            const isValid = validateAddress(value.trim());
            if (!isValid) {
              errors.push({ field: name, message: 'Invalid contract address format', type: 'error' });
            } else {
              errors.push({ field: name, message: '✓ Valid contract address', type: 'info' });
            }
          }
        }
        break;

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
            errors.push({ field: name, message: 'Minimum amount is 0.000001', type: 'error' });
          } else if (amount > 1000000) {
            errors.push({ field: name, message: 'Maximum amount is 1,000,000', type: 'warning' });
          } else {
            const tokenLabel = formData.tokenType === 'other' ? 'tokens' : formData.tokenType;
            errors.push({ field: name, message: `✓ ${amount.toLocaleString()} ${tokenLabel}`, type: 'info' });
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

  // HANDLE INPUT CHANGES WITH REAL-TIME VALIDATION
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // Handle contract type change
  const handleContractTypeChange = (type: 'individual' | 'organization') => {
    setFormData(prev => ({
      ...prev,
      contractType: type,
      organizationId: type === 'individual' ? '' : prev.organizationId
    }));

    // Clear organization validation if switching to individual
    if (type === 'individual') {
      setValidationErrors(prev => prev.filter(error => error.field !== 'organizationId'));
    }
  };

  // Handle token type change
  const handleTokenTypeChange = (type: 'STX' | 'sBTC' | 'other') => {
    setFormData(prev => ({
      ...prev,
      tokenType: type,
      tokenContract: type === 'other' ? prev.tokenContract : ''
    }));

    // Clear token contract validation if not custom
    if (type !== 'other') {
      setValidationErrors(prev => prev.filter(error => error.field !== 'tokenContract'));
    }
  };

  // COMPREHENSIVE FORM VALIDATION
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate organization selection for organization contracts
    if (formData.contractType === 'organization' && !formData.organizationId) {
      newErrors.organizationId = 'Organization selection is required';
    }

    // Validate token contract for custom tokens
    if (formData.tokenType === 'other' && !formData.tokenContract.trim()) {
      newErrors.tokenContract = 'Token contract address is required';
    } else if (formData.tokenType === 'other' && !validateAddress(formData.tokenContract.trim())) {
      newErrors.tokenContract = 'Invalid contract address format';
    }

    // Validate freelancer address
    if (!formData.freelancer.trim()) {
      newErrors.freelancer = 'Freelancer address is required';
    } else {
      const address = formData.freelancer.trim();
      const isValid = validateAddress(address);
      
      if (!isValid) {
        newErrors.freelancer = 'Invalid Stacks address format';
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
    return Object.keys(newErrors).length === 0;
  };

  // HANDLE SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!isSignedIn) {
      setTxResult({ success: false, error: 'Please connect your wallet first' });
      return;
    }

    const clientAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

    if (!clientAddress) {
      setTxResult({ success: false, error: 'Please connect your wallet properly' });
      return;
    }
    
    try {
      const totalAmountMicroStx = parseFloat(formData.totalAmount) * 1000000; // Convert to microSTX
      const endDateTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000); // Convert to Unix timestamp
      
      let result;

      if (formData.contractType === 'individual') {
        // Create individual STX contract (backward compatible)
        result = await createEscrow(
          clientAddress,                    
          formData.freelancer.trim(),     // freelancer
          formData.description.trim(),    // description
          endDateTimestamp,               // endDate
          totalAmountMicroStx            // totalAmount
        );
      } else {
        // Create organization-based contract with multi-token support
        // TODO: Implement organization contract creation
        // For now, fallback to individual contract
        result = await createEscrow(
          clientAddress,                    
          formData.freelancer.trim(),     
          formData.description.trim(),    
          endDateTimestamp,               
          totalAmountMicroStx            
        );
      }

      setTxResult(result);
      
      if (result.success) {
        // Reset form on success
        setFormData({
          contractType: 'individual',
          organizationId: '',
          tokenType: 'STX',
          tokenContract: '',
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
      }
    } catch (error) {
      setTxResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // VALIDATION DISPLAY COMPONENT
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
  const canSubmit = !hasErrors && Object.values(formData).every((v, i) => {
    // Skip optional fields based on contract type and token type
    const keys = Object.keys(formData);
    const key = keys[i];
    
    if (key === 'organizationId' && formData.contractType === 'individual') return true;
    if (key === 'tokenContract' && formData.tokenType !== 'other') return true;
    
    return v.trim() !== '';
  });

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
          <p className="text-gray-600 mt-2">Set up a milestone-based payment contract with organization and multi-token support</p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Contract Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Contract Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleContractTypeChange('individual')}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.contractType === 'individual'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <User className="w-5 h-5 mr-2 text-orange-600" />
                      <span className="font-medium">Individual</span>
                    </div>
                    <p className="text-sm text-gray-600">Personal contract between you and freelancer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContractTypeChange('organization')}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.contractType === 'organization'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Building className="w-5 h-5 mr-2 text-orange-600" />
                      <span className="font-medium">Organization</span>
                    </div>
                    <p className="text-sm text-gray-600">Contract on behalf of an organization</p>
                  </button>
                </div>
              </div>

              {/* Organization Selection */}
              {formData.contractType === 'organization' && (
                <div>
                  <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-2" />
                    Select Organization
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                      errors.organizationId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Choose an organization...</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.role})
                      </option>
                    ))}
                  </select>
                  <ValidationDisplay field="organizationId" />
                </div>
              )}

              {/* Token Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Coins className="w-4 h-4 inline mr-2" />
                  Payment Token
                </label>
                <div className="space-y-3">
                  {tokenOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTokenTypeChange(option.value as 'STX' | 'sBTC' | 'other')}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                        formData.tokenType === option.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.tokenType === option.value
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.tokenType === option.value && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Token Contract */}
              {formData.tokenType === 'other' && (
                <div>
                  <label htmlFor="tokenContract" className="block text-sm font-medium text-gray-700 mb-2">
                    Token Contract Address
                  </label>
                  <input
                    type="text"
                    id="tokenContract"
                    name="tokenContract"
                    value={formData.tokenContract}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors font-mono text-sm ${
                      errors.tokenContract ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="SP2C36S11ETAE5TAE1Z1F1Q2SYTMF1FW7VQZEJNGZ.token-contract"
                  />
                  <ValidationDisplay field="tokenContract" />
                </div>
              )}

              {/* Freelancer Address */}
              <div>
                <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
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
                  Total Amount ({formData.tokenType === 'other' ? 'Tokens' : formData.tokenType})
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

        {/* Enhanced Features Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Enhanced Contract Creation</span>
          </div>
          <p className="text-blue-700 mt-1 text-sm">
            This form supports both individual and organization contracts with multi-token payments including sBTC support.
          </p>
        </div>
      </div>
    </div>
  );
}