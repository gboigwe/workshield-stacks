'use client';

import { useStacks } from '@/hooks/useStacks';
import { useState } from 'react';
import { testContractDeployment, testWalletConnection } from '@/utils/test-contract';

export default function DebugStatus() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { 
    isSignedIn, 
    userData, 
    loading, 
    transactionInProgress, 
    userAddress, 
    contracts,
    networkInfo 
  } = useStacks();

  const runContractTest = async () => {
    console.log('🧪 Running contract deployment test...');
    setTestResults({ loading: true });
    const result = await testContractDeployment();
    setTestResults(result);
  };

  const runWalletTest = () => {
    console.log('🧪 Running wallet connection test...');
    const result = testWalletConnection();
    console.log('Wallet test result:', result);
    setTestResults(result);
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        🔧 Debug {isExpanded ? '▼' : '▲'}
      </button>
      
      {isExpanded && (
        <div className="absolute bottom-12 right-0 bg-white border rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Debug Status</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Wallet Connected:</span>
              <span className={isSignedIn ? 'text-green-600' : 'text-red-600'}>
                {isSignedIn ? '✅' : '❌'} {isSignedIn.toString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Loading:</span>
              <span className={loading ? 'text-yellow-600' : 'text-green-600'}>
                {loading ? '⏳' : '✅'} {loading.toString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Transaction:</span>
              <span className={transactionInProgress ? 'text-blue-600' : 'text-gray-600'}>
                {transactionInProgress ? '🔄' : '⏸️'} {transactionInProgress.toString()}
              </span>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="text-gray-600 mb-1">User Address:</div>
              <div className="text-xs font-mono bg-gray-100 p-1 rounded break-all">
                {userAddress || 'Not connected'}
              </div>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="text-gray-600 mb-1">Network:</div>
              <div className="text-xs">
                <div>Type: {networkInfo.network}</div>
                <div>API: {networkInfo.apiUrl}</div>
              </div>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="text-gray-600 mb-1">Contracts:</div>
              <div className="text-xs space-y-1">
                <div>
                  <span className="font-medium">Escrow:</span>
                  <div className="font-mono bg-gray-100 p-1 rounded break-all">
                    {contracts.ESCROW || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Payments:</span>
                  <div className="font-mono bg-gray-100 p-1 rounded break-all">
                    {contracts.PAYMENTS || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Dispute:</span>
                  <div className="font-mono bg-gray-100 p-1 rounded break-all">
                    {contracts.DISPUTE || 'Not set'}
                  </div>
                </div>
              </div>
            </div>
            
            {userData && (
              <div className="border-t pt-2 mt-2">
                <div className="text-gray-600 mb-1">User Data:</div>
                <div className="text-xs">
                  <div>Profile: {userData.profile ? '✅' : '❌'}</div>
                  <div>Testnet Addr: {userData.profile?.stxAddress?.testnet ? '✅' : '❌'}</div>
                  <div>Mainnet Addr: {userData.profile?.stxAddress?.mainnet ? '✅' : '❌'}</div>
                </div>
              </div>
            )}
            
            {/* Test Buttons */}
            <div className="border-t pt-2 mt-2">
              <div className="text-gray-600 mb-2">Quick Tests:</div>
              <div className="space-y-2">
                <button
                  onClick={runWalletTest}
                  className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Test Wallet
                </button>
                <button
                  onClick={runContractTest}
                  className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Test Contract
                </button>
              </div>
              
              {testResults && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="font-medium">Test Results:</div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
