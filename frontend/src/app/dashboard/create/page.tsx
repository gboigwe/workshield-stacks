'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { CreateContractForm } from '@/types';

export default function CreateContractPage() {
  const router = useRouter();
  const { userData, createEscrow, isSignedIn } = useStacks();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateContractForm>>({});
  
  const [formData, setFormData] = useState<CreateContractForm>({
    freelancer: '',
    description: '',
    endDate: '',
    totalAmount: ''
  });

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateContractForm> = {};

    // Validate freelancer address
    if (!formData.freelancer.trim()) {
      newErrors.freelancer = 'Freelancer address is required';
    } else {
      const address = formData.freelancer.trim();
      if (!address.startsWith('ST')) {
        newErrors.freelancer = 'Stacks address must start with "ST"';
      } else if (address.length !== 40) {
        newErrors.freelancer = `Address must be exactly 40 characters (current: ${address.length})`;
      } else if (!address.match(/^ST[0-9A-Za-z]{38}$/)) {
        newErrors.freelancer = 'Invalid characters in address. Use only letters and numbers after "ST"';
      } else if (address === userAddress) {
        newErrors.freelancer = 'You cannot create a contract with yourself';
      }
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Validate end date
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      const endDate = new Date(formData.endDate);
      const today = new Date();
      const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const maxDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      if (endDate < minDate) {
        newErrors.endDate = 'End date must be at least 1 day from now';
      } else if (endDate > maxDate) {
        newErrors.endDate = 'End date cannot be more than 1 year from now';
      }
    }

    // Validate total amount
    if (!formData.totalAmount.trim()) {
      newErrors.totalAmount = 'Total amount is required';
    } else {
      const amount = parseFloat(formData.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.totalAmount = 'Amount must be a positive number';
      } else if (amount < 0.1) {
        newErrors.totalAmount = 'Minimum amount is 0.1 STX';
      } else if (amount > 10000) {
        newErrors.totalAmount = 'Maximum amount is 10,000 STX';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof CreateContractForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const endDateTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000);
      const totalAmountMicroSTX = Math.floor(parseFloat(formData.totalAmount) * 1000000);

      await createEscrow(
        userAddress!,
        formData.freelancer,
        formData.description,
        endDateTimestamp,
        totalAmountMicroSTX,
        (data) => {
          console.log('Contract created successfully:', data);
          router.push('/dashboard/contracts');
        }
      );
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return `≈ ${(num * 1000000).toLocaleString()} microSTX`;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Contract</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up a secure escrow contract with a freelancer. Funds will be held safely until work is completed.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 space-y-6">
              {/* Freelancer Address */}
              <div>
                <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700">
                  Freelancer Address *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="freelancer"
                    id="freelancer"
                    value={formData.freelancer}
                    onChange={handleInputChange}
                    placeholder="ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ"
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.freelancer ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.freelancer && (
                    <p className="mt-2 text-sm text-red-600">{errors.freelancer}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the Stacks address of the freelancer you want to work with
                  </p>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Project Description *
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the work to be completed, deliverables, and any specific requirements..."
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <div className="mt-1 flex justify-between text-sm text-gray-500">
                    <span>{errors.description ? errors.description : 'Provide clear details about the project scope and expectations'}</span>
                    <span className={formData.description.length > 500 ? 'text-red-600' : ''}>
                      {formData.description.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  Project End Date *
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    min={getMinDate()}
                    max={getMaxDate()}
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.endDate}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    The deadline for project completion. This cannot be changed once the contract is created.
                  </p>
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
                  Total Amount (STX) *
                </label>
                <div className="mt-1">
                  <div className="relative">
                    <input
                      type="number"
                      name="totalAmount"
                      id="totalAmount"
                      step="0.01"
                      min="0.1"
                      max="10000"
                      value={formData.totalAmount}
                      onChange={handleInputChange}
                      placeholder="10.00"
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.totalAmount ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">STX</span>
                    </div>
                  </div>
                  {errors.totalAmount && (
                    <p className="mt-2 text-sm text-red-600">{errors.totalAmount}</p>
                  )}
                  {formData.totalAmount && !errors.totalAmount && (
                    <p className="mt-2 text-sm text-gray-500">
                      {formatAmount(formData.totalAmount)}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    This amount will be locked in escrow until the work is completed and approved
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Important Notes
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Once created, the contract details cannot be modified</li>
                    <li>Your STX will be locked in escrow until work is completed</li>
                    <li>You can add milestones after creating the contract</li>
                    <li>Either party can open a dispute if issues arise</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Contract...
                </>
              ) : (
                'Create Contract'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}







// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useStacks } from '@/hooks/useStacks';
// import { CreateContractForm } from '@/types';

// export default function CreateContractPage() {
//   const router = useRouter();
//   const { userData, createEscrow, isSignedIn } = useStacks();
//   const [loading, setLoading] = useState(false);
//   const [errors, setErrors] = useState<Partial<CreateContractForm>>({});
  
//   const [formData, setFormData] = useState<CreateContractForm>({
//     freelancer: '',
//     description: '',
//     endDate: '',
//     totalAmount: ''
//   });

//   const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

//   const validateForm = (): boolean => {
//     const newErrors: Partial<CreateContractForm> = {};

//     // Validate freelancer address
//     if (!formData.freelancer.trim()) {
//       newErrors.freelancer = 'Freelancer address is required';
//     } else if (!formData.freelancer.match(/^ST[0-9A-Z]{39}$/)) {
//       newErrors.freelancer = 'Please enter a valid Stacks address (starts with ST)';
//     } else if (formData.freelancer === userAddress) {
//       newErrors.freelancer = 'You cannot create a contract with yourself';
//     }

//     // Validate description
//     if (!formData.description.trim()) {
//       newErrors.description = 'Project description is required';
//     } else if (formData.description.length < 10) {
//       newErrors.description = 'Description must be at least 10 characters long';
//     } else if (formData.description.length > 500) {
//       newErrors.description = 'Description must be less than 500 characters';
//     }

//     // Validate end date
//     if (!formData.endDate) {
//       newErrors.endDate = 'End date is required';
//     } else {
//       const endDate = new Date(formData.endDate);
//       const today = new Date();
//       const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
//       const maxDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
//       if (endDate < minDate) {
//         newErrors.endDate = 'End date must be at least 1 day from now';
//       } else if (endDate > maxDate) {
//         newErrors.endDate = 'End date cannot be more than 1 year from now';
//       }
//     }

//     // Validate total amount
//     if (!formData.totalAmount.trim()) {
//       newErrors.totalAmount = 'Total amount is required';
//     } else {
//       const amount = parseFloat(formData.totalAmount);
//       if (isNaN(amount) || amount <= 0) {
//         newErrors.totalAmount = 'Amount must be a positive number';
//       } else if (amount < 0.1) {
//         newErrors.totalAmount = 'Minimum amount is 0.1 STX';
//       } else if (amount > 10000) {
//         newErrors.totalAmount = 'Maximum amount is 10,000 STX';
//       }
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
    
//     // Clear error for this field when user starts typing
//     if (errors[name as keyof CreateContractForm]) {
//       setErrors(prev => ({
//         ...prev,
//         [name]: undefined
//       }));
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateForm()) {
//       return;
//     }

//     setLoading(true);
    
//     try {
//       const endDateTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000);
//       const totalAmountMicroSTX = Math.floor(parseFloat(formData.totalAmount) * 1000000);

//       await createEscrow(
//         userAddress!,
//         formData.freelancer,
//         formData.description,
//         endDateTimestamp,
//         totalAmountMicroSTX,
//         (data) => {
//           console.log('Contract created successfully:', data);
//           router.push('/dashboard/contracts');
//         }
//       );
//     } catch (error) {
//       console.error('Error creating contract:', error);
//       alert('Failed to create contract. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatAmount = (value: string) => {
//     const num = parseFloat(value);
//     if (isNaN(num)) return '';
//     return `≈ ${(num * 1000000).toLocaleString()} microSTX`;
//   };

//   const getMinDate = () => {
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     return tomorrow.toISOString().split('T')[0];
//   };

//   const getMaxDate = () => {
//     const nextYear = new Date();
//     nextYear.setFullYear(nextYear.getFullYear() + 1);
//     return nextYear.toISOString().split('T')[0];
//   };

//   if (!isSignedIn) {
//     return null;
//   }

//   return (
//     <div className="max-w-3xl mx-auto">
//       <div className="space-y-8">
//         {/* Header */}
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Create New Contract</h1>
//           <p className="mt-1 text-sm text-gray-500">
//             Set up a secure escrow contract with a freelancer. Funds will be held safely until work is completed.
//           </p>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="space-y-8">
//           <div className="bg-white shadow rounded-lg">
//             <div className="px-4 py-5 sm:p-6 space-y-6">
//               {/* Freelancer Address */}
//               <div>
//                 <label htmlFor="freelancer" className="block text-sm font-medium text-gray-700">
//                   Freelancer Address *
//                 </label>
//                 <div className="mt-1">
//                   <input
//                     type="text"
//                     name="freelancer"
//                     id="freelancer"
//                     value={formData.freelancer}
//                     onChange={handleInputChange}
//                     placeholder="ST2NEB84ASENDXZYNT4PTDLR2ZDSBN2TB7SNPPYQVJ"
//                     className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
//                       errors.freelancer ? 'border-red-300' : 'border-gray-300'
//                     }`}
//                   />
//                   {errors.freelancer && (
//                     <p className="mt-2 text-sm text-red-600">{errors.freelancer}</p>
//                   )}
//                   <p className="mt-2 text-sm text-gray-500">
//                     Enter the Stacks address of the freelancer you want to work with
//                   </p>
//                 </div>
//               </div>

//               {/* Project Description */}
//               <div>
//                 <label htmlFor="description" className="block text-sm font-medium text-gray-700">
//                   Project Description *
//                 </label>
//                 <div className="mt-1">
//                   <textarea
//                     name="description"
//                     id="description"
//                     rows={4}
//                     value={formData.description}
//                     onChange={handleInputChange}
//                     placeholder="Describe the work to be completed, deliverables, and any specific requirements..."
//                     className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
//                       errors.description ? 'border-red-300' : 'border-gray-300'
//                     }`}
//                   />
//                   <div className="mt-1 flex justify-between text-sm text-gray-500">
//                     <span>{errors.description ? errors.description : 'Provide clear details about the project scope and expectations'}</span>
//                     <span className={formData.description.length > 500 ? 'text-red-600' : ''}>
//                       {formData.description.length}/500
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* End Date */}
//               <div>
//                 <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
//                   Project End Date *
//                 </label>
//                 <div className="mt-1">
//                   <input
//                     type="date"
//                     name="endDate"
//                     id="endDate"
//                     min={getMinDate()}
//                     max={getMaxDate()}
//                     value={formData.endDate}
//                     onChange={handleInputChange}
//                     className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
//                       errors.endDate ? 'border-red-300' : 'border-gray-300'
//                     }`}
//                   />
//                   {errors.endDate && (
//                     <p className="mt-2 text-sm text-red-600">{errors.endDate}</p>
//                   )}
//                   <p className="mt-2 text-sm text-gray-500">
//                     The deadline for project completion. This cannot be changed once the contract is created.
//                   </p>
//                 </div>
//               </div>

//               {/* Total Amount */}
//               <div>
//                 <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
//                   Total Amount (STX) *
//                 </label>
//                 <div className="mt-1">
//                   <div className="relative">
//                     <input
//                       type="number"
//                       name="totalAmount"
//                       id="totalAmount"
//                       step="0.01"
//                       min="0.1"
//                       max="10000"
//                       value={formData.totalAmount}
//                       onChange={handleInputChange}
//                       placeholder="10.00"
//                       className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
//                         errors.totalAmount ? 'border-red-300' : 'border-gray-300'
//                       }`}
//                     />
//                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                       <span className="text-gray-500 sm:text-sm">STX</span>
//                     </div>
//                   </div>
//                   {errors.totalAmount && (
//                     <p className="mt-2 text-sm text-red-600">{errors.totalAmount}</p>
//                   )}
//                   {formData.totalAmount && !errors.totalAmount && (
//                     <p className="mt-2 text-sm text-gray-500">
//                       {formatAmount(formData.totalAmount)}
//                     </p>
//                   )}
//                   <p className="mt-2 text-sm text-gray-500">
//                     This amount will be locked in escrow until the work is completed and approved
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Important Notes */}
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
//             <div className="flex">
//               <div className="flex-shrink-0">
//                 <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                 </svg>
//               </div>
//               <div className="ml-3">
//                 <h3 className="text-sm font-medium text-yellow-800">
//                   Important Notes
//                 </h3>
//                 <div className="mt-2 text-sm text-yellow-700">
//                   <ul className="list-disc pl-5 space-y-1">
//                     <li>Once created, the contract details cannot be modified</li>
//                     <li>Your STX will be locked in escrow until work is completed</li>
//                     <li>You can add milestones after creating the contract</li>
//                     <li>Either party can open a dispute if issues arise</li>
//                   </ul>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="flex justify-end space-x-3">
//             <button
//               type="button"
//               onClick={() => router.back()}
//               className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={loading}
//               className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? (
//                 <>
//                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Creating Contract...
//                 </>
//               ) : (
//                 'Create Contract'
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
