'use client';

import React, { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wifi,
  Wallet,
  Server,
  Code,
  Bug,
  Play,
  Loader2
} from 'lucide-react';
import { 
  openContractCall
} from '@stacks/connect';
import { 
  standardPrincipalCV,
  stringUtf8CV,
  uintCV,
  PostConditionMode
} from '@stacks/transactions';

export default function DebugStatus() {
  const { 
    userData, 
    isSignedIn, 
    loading, 
    userAddress, 
    network, 
    contracts,
    transactionInProgress 
  } = useStacks();

  const [testInProgress, setTestInProgress] = useState(false);
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({});

  // Network status
  const networkName = network?.isMainnet?.() ? 'Mainnet' : 'Testnet';
  const isTestnet = !network?.isMainnet?.();

  // Contract info
  const escrowContractAddress = contracts.ESCROW.split('.')[0];
  const escrowContractName = contracts.ESCROW.split('.')[1];

  // Test simple contract call
  const testContractCall = async () => {
    if (!isSignedIn || !userData) {
      alert('❌ Please connect wallet first');
      return;
    }

    setTestInProgress(true);
    console.log('🧪 Testing contract call...');
    
    try {
      const userAddr = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;
      
      await openContractCall({
        contractAddress: escrowContractAddress,
        contractName: escrowContractName,
        functionName: 'create-escrow',
        functionArgs: [
          standardPrincipalCV(userAddr),
          standardPrincipalCV('ST2C36S11ETAE5TAE1Z1F1Q2SYTMF1FW7VQZEJNGZ'),
          stringUtf8CV('Test contract call from debug panel'),
          uintCV(Math.floor(Date.now() / 1000) + 86400), // Tomorrow
          uintCV(1000000) // 1 STX in microSTX
        ],
        postConditions: [],
        postConditionMode: PostConditionMode.Allow,
        network,
        onFinish: (data: any) => {
          console.log('✅ Test contract call successful:', data);
          setTestResults(prev => ({ ...prev, contractCall: true }));
          alert('✅ Test contract call successful!');
          setTestInProgress(false);
        },
        onCancel: () => {
          console.log('❌ Test contract call cancelled');
          setTestResults(prev => ({ ...prev, contractCall: false }));
          setTestInProgress(false);
        }
      });
    } catch (error) {
      console.error('❌ Test contract call error:', error);
      setTestResults(prev => ({ ...prev, contractCall: false }));
      alert(`❌ Test failed: ${error}`);
      setTestInProgress(false);
    }
  };

  // Status indicator component
  const StatusIndicator = ({ 
    status, 
    label, 
    icon: Icon 
  }: { 
    status: 'success' | 'warning' | 'error' | 'loading';
    label: string;
    icon: React.ElementType;
  }) => {
    const colors = {
      success: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      error: 'text-red-600 bg-red-100',
      loading: 'text-blue-600 bg-blue-100'
    };

    const iconColors = {
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      loading: 'text-blue-600'
    };

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${colors[status]}`}>
        <Icon className={`w-4 h-4 ${iconColors[status]} ${status === 'loading' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Debug Status</h3>
      </div>

      <div className="space-y-4">
        {/* Wallet Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Wallet Connection</h4>
          <div className="grid grid-cols-1 gap-2">
            <StatusIndicator
              status={isSignedIn ? 'success' : 'error'}
              label={isSignedIn ? 'Wallet Connected' : 'Wallet Not Connected'}
              icon={Wallet}
            />
            {isSignedIn && userAddress && (
              <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                {userAddress}
              </div>
            )}
          </div>
        </div>

        {/* Network Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Network</h4>
          <StatusIndicator
            status={isTestnet ? 'success' : 'warning'}
            label={`Connected to ${networkName}`}
            icon={Wifi}
          />
        </div>

        {/* Contract Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Smart Contract</h4>
          <div className="space-y-2">
            <StatusIndicator
              status='success'
              label={`Contract Deployed: ${escrowContractName}`}
              icon={Code}
            />
            <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
              {escrowContractAddress}
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {transactionInProgress && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction</h4>
            <StatusIndicator
              status='loading'
              label='Transaction in Progress'
              icon={Clock}
            />
          </div>
        )}

        {/* Test Functions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Test Functions</h4>
          <div className="space-y-2">
            <button
              onClick={testContractCall}
              disabled={!isSignedIn || testInProgress || transactionInProgress}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {testInProgress ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {testInProgress ? 'Testing...' : 'Test Contract Call'}
            </button>

            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
              <div className="space-y-1">
                {Object.entries(testResults).map(([test, success]) => (
                  <div key={test} className="flex items-center gap-2 text-xs">
                    {success ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                    )}
                    <span className={success ? 'text-green-700' : 'text-red-700'}>
                      {test}: {success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">System Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Browser: {typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-1)[0] : 'Unknown'}</div>
            <div>Timestamp: {new Date().toISOString()}</div>
            <div>Loading: {loading ? 'true' : 'false'}</div>
          </div>
        </div>

        {/* Contract Configuration */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Contract Configuration</h4>
          <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
            <div><strong>Escrow:</strong> {contracts.ESCROW}</div>
            <div><strong>Payments:</strong> {contracts.PAYMENTS}</div>
            <div><strong>Dispute:</strong> {contracts.DISPUTE}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => console.log('User Data:', userData)}
              className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Log User Data
            </button>
            <button
              onClick={() => console.log('Network:', network)}
              className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Log Network
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
