import { NextRequest, NextResponse } from 'next/server';

// ✅ COMPREHENSIVE API PROXY for CORS and Rate Limiting Fix
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Your Hiro API key
    const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY || '49c6e72fb90e5b04c2f53721cd1f9a59';
    
    // Build the target URL
    const path = params.path.join('/');
    const baseUrl = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
      ? 'https://api.hiro.so' 
      : 'https://api.testnet.hiro.so';
    
    const targetUrl = `${baseUrl}/v2/contracts/call-read/${path}`;
    
    // Get request body
    const body = await request.json();
    
    console.log('📡 Proxying to:', targetUrl);
    console.log('🔑 Using API key:', apiKey.substring(0, 8) + '...');
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    // ✅ PROPER HEADERS with API Key (using correct header name from docs)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WorkShield-App/1.0'
    };

    // Add API key using correct header format from Hiro docs
    if (apiKey) {
      headers['x-api-key'] = apiKey; // Using lowercase as per Hiro docs
    }
    
    // Make the request with proper headers
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      
      // Handle specific error types
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            details: 'Too many requests. Please try again later.',
            retryAfter: response.headers.get('retry-after') || '60'
          }, 
          { status: 429 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Authentication failed', 
            details: 'Invalid API key or authentication required.'
          }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `API error: ${response.status}`, 
          details: errorText 
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Success - Response data keys:', Object.keys(data));
    
    // ✅ ADD CORS HEADERS for browser compatibility
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown proxy error';
    
    return NextResponse.json(
      { 
        error: 'Proxy failed', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// ✅ HANDLE GET REQUESTS
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY || '49c6e72fb90e5b04c2f53721cd1f9a59';
    
    const path = params.path.join('/');
    const baseUrl = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
      ? 'https://api.hiro.so' 
      : 'https://api.testnet.hiro.so';
    
    const targetUrl = `${baseUrl}/v2/contracts/call-read/${path}`;
    
    // Add query parameters if they exist
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    console.log('📡 GET Proxy to:', fullUrl);
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'WorkShield-App/1.0'
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GET API Error:', errorText);
      
      return NextResponse.json(
        { 
          error: `API error: ${response.status}`, 
          details: errorText 
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ GET Success');
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
    
  } catch (error) {
    console.error('❌ GET Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'GET Proxy failed', 
        details: error instanceof Error ? error.message : 'Unknown'
      }, 
      { status: 500 }
    );
  }
}

// ✅ HANDLE OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
