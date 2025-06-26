/**
 * Utility functions for address validation and formatting
 */

/**
 * Validates a Stacks address
 * Stacks addresses are 41 characters long and start with 'ST' (mainnet) or 'SP' (testnet)
 */
export function isValidStacksAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Remove any whitespace
  const cleanAddress = address.trim();

  // Check length (should be 41 characters)
  if (cleanAddress.length !== 41) {
    return false;
  }

  // Check if it starts with ST (mainnet) or SP (testnet)
  if (!cleanAddress.startsWith('ST') && !cleanAddress.startsWith('SP')) {
    return false;
  }

  // Check if the rest contains only valid characters (alphanumeric, case-insensitive)
  const addressPattern = /^S[TP][A-Z0-9]{39}$/i;
  return addressPattern.test(cleanAddress);
}

/**
 * Formats a Stacks address for display (truncated)
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || !isValidStacksAddress(address)) {
    return '';
  }

  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Gets the network type from a Stacks address
 */
export function getAddressNetwork(address: string): 'mainnet' | 'testnet' | null {
  if (!isValidStacksAddress(address)) {
    return null;
  }

  if (address.startsWith('ST')) {
    return 'mainnet';
  } else if (address.startsWith('SP')) {
    return 'testnet';
  }

  return null;
}

/**
 * Validates if an address matches the current network
 */
export function isAddressForNetwork(address: string, network: 'mainnet' | 'testnet'): boolean {
  const addressNetwork = getAddressNetwork(address);
  return addressNetwork === network;
}

/**
 * Converts STX amount from microSTX to STX
 */
export function microStxToStx(microStx: number | string): number {
  const amount = typeof microStx === 'string' ? parseFloat(microStx) : microStx;
  return amount / 1000000;
}

/**
 * Converts STX amount to microSTX
 */
export function stxToMicroStx(stx: number | string): number {
  const amount = typeof stx === 'string' ? parseFloat(stx) : stx;
  return Math.floor(amount * 1000000);
}

/**
 * Formats STX amount for display
 */
export function formatStxAmount(microStx: number | string): string {
  const stx = microStxToStx(microStx);
  return `${stx.toLocaleString()} STX`;
}

/**
 * Validates STX amount
 */
export function isValidStxAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M STX
}

/**
 * Validates a deadline timestamp
 */
export function isValidDeadline(deadline: number): boolean {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  const oneYear = 365 * oneDay; // 1 year in milliseconds

  return deadline > now + oneDay && deadline < now + oneYear;
}

/**
 * Formats a timestamp to a readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculates days remaining until deadline
 */
export function getDaysUntilDeadline(deadline: number): number {
  const now = Date.now();
  const timeDiff = deadline - now;
  return Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
}
