'use client';

import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

// Network Configuration with API Key Headers
export const getNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY || '49c6e72fb90e5b04c2f53721cd1f9a59';

  console.log(`🌐 Network: ${networkType}, API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}`);

  // Get base network using new v7 static objects
  const baseNetwork = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

  // Add custom fetch function with API key headers
  if (apiKey) {
    const customFetch = async (url: string, init?: RequestInit) => {
      const headers = {
        ...init?.headers,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...init,
        headers,
      });
    };

    return {
      ...baseNetwork,
      fetchFn: customFetch,
    };
  }

  return baseNetwork;
};

// Contract Configuration
export const CONTRACTS = {
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-escrow-v3',
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-payments',
  DISPUTE: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT || 'ST3A5HQKQM3T3BV1MCZ45S6Q729V8355BQ0W0NP2V.workshield-dispute'
};

export const parseContractId = (contractId: string) => {
  const [address, name] = contractId.split('.');
  return { address, name };
};

// Proxy-based API calls for CORS issues
export const makeProxyApiCall = async (endpoint: string, body?: any) => {
  const proxyUrl = `/api/stacks${endpoint}`;

  try {
    // Handle BigInt serialization
    const serializedBody = body ? JSON.stringify(body, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ) : undefined;

    const response = await fetch(proxyUrl, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: serializedBody })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Proxy API call failed:', error);
    throw error;
  }
};

// Smart API Call with fallback strategy
export const makeSmartApiCall = async (apiCall: () => Promise<any>, fallbackEndpoint?: string, fallbackBody?: any) => {
  try {
    // First try direct Stacks.js call with API key
    console.log('🎯 Attempting direct Stacks.js API call...');
    return await apiCall();
  } catch (error: any) {
    console.warn('⚠️ Direct call failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error
    });

    if (fallbackEndpoint) {
      try {
        console.log('🔄 Trying proxy fallback for:', fallbackEndpoint);
        return await makeProxyApiCall(fallbackEndpoint, fallbackBody);
      } catch (proxyError: any) {
        console.error('❌ Both direct and proxy calls failed:', {
          directError: error.message,
          proxyError: proxyError.message,
          fallbackEndpoint
        });
        throw proxyError;
      }
    } else {
      throw error;
    }
  }
};

// Time conversion utilities
export function convertSmartContractTimeToTimestamp(value: number): number {
  if (!value || value === 0) {
    return Date.now(); 
  }

  if (value > 1000000000) {
    console.log(`🕐 Detected Unix timestamp: ${value} (${new Date(value * 1000).toISOString()})`);
    return value * 1000;
    
  } else if (value >= 100000 && value <= 300000) {
    console.log(`🧱 Detected block height: ${value}`);
    return convertBlockHeightToTimestamp(value);
    
  } else {
    console.warn(`⚠️ Unexpected time value: ${value}, using current time`);
    return Date.now();
  }
}

function convertBlockHeightToTimestamp(blockHeight: number): number {
  // Stacks testnet approximation
  const TESTNET_GENESIS_TIMESTAMP = 1610000000; // Jan 2021 approximate
  const AVERAGE_BLOCK_TIME = 600; // 10 minutes in seconds
  
  const approximateTimestamp = TESTNET_GENESIS_TIMESTAMP + (blockHeight * AVERAGE_BLOCK_TIME);
  return approximateTimestamp * 1000; // Convert to milliseconds
}

// Caching utilities
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const contractCache = new Map<string, { data: any; timestamp: number }>();

export const isDataFresh = (timestamp: number) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

export const getCachedData = <T>(key: string): T | null => {
  const cached = contractCache.get(key);
  if (cached && isDataFresh(cached.timestamp)) {
    console.log(`📋 Using cached data for ${key}`);
    return cached.data;
  }
  return null;
};

export const setCachedData = <T>(key: string, data: T) => {
  contractCache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 Cached data for ${key}`);
};