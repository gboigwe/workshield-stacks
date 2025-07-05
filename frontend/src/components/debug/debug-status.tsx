// BEFORE: Lines 42-43 had issues with network.isMainnet property
// network.isMainnet ? 'Mainnet' : 'Testnet'
// network.isMainnet

// AFTER: Fixed to properly check network type

'use client';

import React from 'react';
import { useStacks } from '@/hooks/useStacks';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  Wifi, 
  Database, 
  User,
  Loader2,
  Network,
  Bug
} from 'lucide-react';

interface DebugStatusProps {
  className?: string;
}

const DebugStatus: React.FC<DebugStatusProps> = ({ className = '' }) => {
  const { 
    isSignedIn, 
    userData, 
    loading, 
    network, 
    userAddress, 
    clientContracts, 
    freelancerContracts,
    transactionInProgress
  } = useStacks();

  // ✅ FIXED: Proper network type checking
  const isMainnet = () => {
    if (!network) return false;
    
    // Check if it's a testnet network
    if (typeof network === 'object' && 'chainId' in network) {
      // For Stacks testnet, chainId is typically different from mainnet
      return network.chainId === 0x80000000; // Mainnet chain ID
    }
    
    // Fallback string check for network names
    if (network && typeof (network as any).toString === 'function') {
      const networkName = (network as any).toString().toLowerCase();
      return networkName.includes('mainnet') || networkName.includes('main');
    }
    
    return false;
  };

  const networkType = isMainnet() ? 'Mainnet' : 'Testnet';
  const networkColor = isMainnet() ? 'text-green-600' : 'text-blue-600';

  const debugItems = [
    {
      label: 'Wallet Connection',
      value: isSignedIn ? 'Connected' : 'Not Connected',
      icon: isSignedIn ? CheckCircle : AlertTriangle,
      color: isSignedIn ? 'text-green-600' : 'text-red-600'
    },
    {
      label: 'Network',
      value: networkType,
      icon: Network,
      color: networkColor
    },
    {
      label: 'User Address',
      value: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Available',
      icon: User,
      color: userAddress ? 'text-green-600' : 'text-gray-600'
    },
    {
      label: 'Client Contracts',
      value: clientContracts?.length?.toString() || '0',
      icon: Database,
      color: 'text-blue-600'
    },
    {
      label: 'Freelancer Contracts', 
      value: freelancerContracts?.length?.toString() || '0',
      icon: Database,
      color: 'text-purple-600'
    },
    {
      label: 'Transaction Status',
      value: transactionInProgress ? 'Processing' : 'Ready',
      icon: transactionInProgress ? Loader2 : CheckCircle,
      color: transactionInProgress ? 'text-yellow-600' : 'text-green-600'
    }
  ];

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Bug className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Debug Status</span>
          <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        </div>
        <p className="text-xs text-gray-600">Loading debug information...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Bug className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Debug Status</span>
        <Wifi className="w-4 h-4 text-green-500" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {debugItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <item.icon className={`w-4 h-4 ${item.color} ${transactionInProgress && item.label === 'Transaction Status' ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 truncate">{item.label}</p>
              <p className={`text-sm font-medium ${item.color} truncate`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Development Mode</p>
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer">Raw Network Data</summary>
            <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify({ network, userAddress, isMainnet: isMainnet() }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </motion.div>
  );
};

export default DebugStatus;
