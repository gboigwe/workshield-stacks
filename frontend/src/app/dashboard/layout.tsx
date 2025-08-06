'use client';

import { useStacks } from '@/hooks/useStacks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatAddress } from '@/lib/utils';
import { LogOut, Home, Building } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isSignedIn, loading, userData, disconnectWallet } = useStacks();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  const handleDisconnect = () => {
    disconnectWallet();
    router.push('/');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  const userAddress = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="text-xl font-bold">WorkShield</span>
              </button>
              
              <nav className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/dashboard/organizations')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Building className="w-4 h-4" />
                  Organizations
                </button>
              </nav>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="text-gray-500">Connected as</div>
                <div className="font-medium text-gray-900">
                  {formatAddress(userAddress || '')}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
