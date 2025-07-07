import { 
  STACKS_TESTNET,
  STACKS_MAINNET 
} from '@stacks/network';
import {
  uintCV,
  fetchCallReadOnlyFunction
} from '@stacks/transactions';

// Test function to verify contract deployment
export async function testContractDeployment() {
  const network = STACKS_TESTNET;
  const contractAddress = 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V';
  const contractName = 'workshield-escrow-v2';
  
  try {
    
    // Try to call a read-only function to verify the contract exists
    const result = await fetchCallReadOnlyFunction({
      network,
      contractAddress,
      contractName,
      functionName: 'get-contract',
      functionArgs: [uintCV(1)], // Test with contract ID 1
      senderAddress: contractAddress,
    });
    
    return { success: true, result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

// Test wallet connection
export function testWalletConnection() {
  
  // Check if Stacks Connect is available
  if (typeof window !== 'undefined') {
    
    // Check for wallet extension
    const hasStacksWallet = !!(window as any).StacksProvider;
    
    return {
      windowAvailable: true,
      walletDetected: hasStacksWallet
    };
  }
  
  return {
    windowAvailable: false,
    walletDetected: false
  };
}
